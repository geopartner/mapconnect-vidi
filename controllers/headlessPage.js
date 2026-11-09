/*
 * Moved out of controllers/print.js and controllers/static.js, then reworked.
 * Written with Claude Code (AI).
 *
 * @author     Henrik Brændskov Larsen <hbl@geopartner.dk>
 * @copyright  2013-2021 MapCentia ApS
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Shared helpers for rendering a Vidi page in a headless browser.
 * Used by print (controllers/print.js) and the snapshot image API (controllers/static.js).
 *
 * How a headless render works
 * ---------------------------
 * 1. Borrow a browser from the pool (headlessBrowserPool.js). If none is free
 *    within the pool's acquire timeout, fail with PRINT_BUSY (HTTP 503).
 * 2. Open the Vidi URL. Vidi boots and logs its progress to the browser console.
 * 3. Wait for the console message that says the map is ready. Which message
 *    that is depends on the page; see printReadiness() and snapshotReadiness().
 * 4. Take the PDF or the screenshot.
 *
 * The whole render has one deadline. When it passes we fail with PRINT_TIMEOUT
 * (HTTP 504) and destroy the browser. This is what guarantees that a page that
 * never becomes ready can never leave the HTTP request hanging.
 *
 * The browser is always destroyed afterwards, never handed back to the pool,
 * so every render starts with a clean browser.
 */

const headless = require('./headlessBrowserPool').pool;

// A page logs this (console.error) when it knows it cannot finish,
// for example when it cannot load the print job. We then fail at once
// instead of waiting for the deadline.
const FAILED_SIGNAL = 'Print failed:';

/**
 * An error that should reach the client with a specific HTTP status and code.
 */
class HeadlessError extends Error {
    constructor(code, message, httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }
}

/**
 * Borrows a browser, runs render(browser) and always gives the browser back,
 * even when render fails or the deadline passes.
 *
 * @param {number} timeoutMs Deadline for render(), in milliseconds
 * @param {function(browser): Promise<*>} render Does the actual work
 * @returns {Promise<*>} What render() returns
 */
async function withBrowser(timeoutMs, render) {
    let browser;
    try {
        browser = await headless.acquire();
    } catch (error) {
        // generic-pool fails here when all browsers are busy and the queue is full,
        // or when none became free within acquireTimeoutMillis.
        console.error('Could not get a headless browser:', error.message);
        throw new HeadlessError('PRINT_BUSY', 'All print browsers are busy. Try again in a moment.', 503);
    }

    let timer;
    const deadline = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            reject(new HeadlessError('PRINT_TIMEOUT', `The map did not finish loading within ${Math.round(timeoutMs / 1000)} seconds.`, 504));
        }, timeoutMs);
    });

    try {
        return await Promise.race([render(browser), deadline]);
    } finally {
        clearTimeout(timer);
        headless.destroy(browser).catch(error => {
            console.error('Could not close a headless browser:', error.message);
        });
    }
}

/**
 * Opens url in a new page and waits until the page says it is ready.
 *
 * @param browser A browser from withBrowser()
 * @param {string} url The Vidi URL to open
 * @param {function(string): boolean} isReady Called with every console message; returns true when the page is ready
 * @param {object} [options]
 * @param {object} [options.viewport] {width, height} in pixels, for screenshots
 * @param {boolean} [options.screenMedia] Render with screen CSS instead of print CSS (for PDFs)
 * @param {boolean} [options.logNetworkErrors] Log failed requests and HTTP errors from the page (Mapconnect, for PNG prints)
 * @returns {Promise<Page>} The ready page
 */
async function openAndWaitUntilReady(browser, url, isReady, {viewport, screenMedia = false, logNetworkErrors = false} = {}) {
    const page = await browser.newPage();
    if (viewport) {
        await page.emulate({viewport, userAgent: 'Puppeteer'});
    }
    if (screenMedia) {
        await page.emulateMediaType('screen');
    }

    // Uncaught errors in the page are logged, not treated as fatal: Vidi can throw
    // harmless errors (an extension, a slow tile) and still print fine. If the
    // page really is stuck, the deadline in withBrowser() ends the render.
    page.on('pageerror', error => {
        console.error('Headless page error:', error.message);
    });

    // Mapconnect: shows which tile or WMS request failed when a print comes out incomplete
    if (logNetworkErrors) {
        page.on('requestfailed', request => {
            console.error('Headless page request failed:', request.method(), request.resourceType(), request.url(), request.failure()?.errorText);
        });
        page.on('response', response => {
            if (!response.ok()) {
                console.error('Headless page HTTP error:', response.status(), response.url());
            }
        });
    }

    const ready = new Promise((resolve, reject) => {
        page.on('console', msg => {
            // Check readiness synchronously, so messages are seen in the order they were logged.
            const text = msg.text();
            if (text.startsWith(FAILED_SIGNAL)) {
                reject(new HeadlessError('PRINT_FAILED', text.substring(FAILED_SIGNAL.length).trim(), 500));
            } else if (isReady(text)) {
                resolve();
            }
            logConsoleMessage(msg);
        });
    });

    // Promise.all so that a rejection from either one is handled right away.
    // We only wait for the HTML ("domcontentloaded"); the console messages tell
    // us when the map is done. timeout: 0 because withBrowser() owns the deadline.
    await Promise.all([
        ready,
        page.goto(url, {waitUntil: 'domcontentloaded', timeout: 0})
    ]);
    return page;
}

/**
 * Readiness for the print page (print.tmpl), which is given a print job (?k=...).
 * The page first logs whether the job has active layers:
 * - "No active layers in print": ready at "Vidi is now loaded".
 * - "Active layers in print": ready when the layers and the legend are drawn,
 *   "Legend loaded" (browser/modules/state.js).
 */
function printReadiness() {
    let hasLayers = true;
    return text => {
        if (text.includes('No active layers in print')) {
            hasLayers = false;
        } else if (text.includes('Active layers in print')) {
            hasLayers = true;
        }
        return hasLayers ? text.includes('Legend loaded') : text.includes('Vidi is now loaded');
    };
}

/**
 * Readiness for a state snapshot image (/api/static).
 * - "No active layers in snapshot", or a filter in the URL: ready at "Vidi is now loaded".
 * - "Active layers in snapshot": ready at "Layers all loaded L".
 */
function snapshotReadiness(hasFilter) {
    let hasLayers = !hasFilter;
    return text => {
        if (!hasFilter && text.includes('No active layers in snapshot')) {
            hasLayers = false;
        } else if (!hasFilter && text.includes('Active layers in snapshot')) {
            hasLayers = true;
        }
        return hasLayers ? text.includes('Layers all loaded L') : text.includes('Vidi is now loaded');
    };
}

/**
 * Copies a page's console message to the server log. Error objects logged in the
 * page show up as "JSHandle@error" in msg.text(), so we also print their description.
 * Never throws: a logging failure must not break a print.
 */
async function logConsoleMessage(msg) {
    console.log(msg.text());
    try {
        for (const arg of msg.args()) {
            const value = await arg.jsonValue();
            if (JSON.stringify(value) === JSON.stringify({})) {
                const {type, subtype, description} = arg._remoteObject;
                console.log(`type: ${type}, subtype: ${subtype}, description:\n ${description}`);
            }
        }
    } catch (error) {
        // The page may be closed already, or the value may not be serializable.
    }
}

/**
 * Waits ms milliseconds. Used to let Leaflet paint the last tiles after "ready".
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends a failed render to the client as {success: false, code, message}.
 */
function sendError(response, error) {
    const status = error.httpStatus || 500;
    const code = error.code || 'PRINT_FAILED';
    console.error(`Headless render failed (${code}):`, error.message);
    if (!response.headersSent) {
        response.status(status).send({success: false, code, message: error.message});
    }
}

module.exports = {
    HeadlessError,
    withBrowser,
    openAndWaitUntilReady,
    printReadiness,
    snapshotReadiness,
    sleep,
    sendError,
    maxBrowsers: headless.max,
};
