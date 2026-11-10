/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2021 MapCentia ApS
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Print: renders the Vidi map to PDF (or PNG) in a headless browser.
 *
 * Flow for POST /api/print:
 * 1. The client (browser/modules/print.js) posts the print job: frames (bounds),
 *    scale, template, title, and the whole application state.
 * 2. For each frame we save the job as public/tmp/print/json/<key> and open
 *    /app/<db>/<schema>/?tmpl=print.tmpl&k=<key>... in a headless browser.
 * 3. That page loads the job from GET /api/postdata?k=<key> (browser/modules/state.js),
 *    draws the map and logs to the console when it is ready (see headlessPage.js).
 * 4. We save the page as public/tmp/print/pdf/<key>.pdf. Several frames are
 *    merged into one PDF (PNGs are zipped).
 * 5. The client gets {success: true, key, format} and links to /tmp/print/pdf/<key>.pdf.
 *
 * Every request gets exactly one answer. Failures answer {success: false, code, message}:
 *   503 PRINT_BUSY     no headless browser became free
 *   504 PRINT_TIMEOUT  the page did not become ready in time (config.print.timeout)
 *   500 PRINT_FAILED   anything else
 *
 * Mapconnect: print requests are counted and timed in Prometheus (see the
 * metrics helpers at the bottom of this file).
 */

require('dotenv').config();

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFMerge = require('pdf-merge');
const AdmZip = require('adm-zip');
const config = require("../config/config.js");
const shared = require('./gc2/shared');
const metrics = require('../modules/metrics');
const {withBrowser, openAndWaitUntilReady, printReadiness, sleep, sendError, maxBrowsers} = require('./headlessPage');

// How long one frame may take, from the moment a browser is free until the file is saved.
const timeout = config?.print?.timeout || 60000;

// After the page says it is ready, give Leaflet a moment to paint the last tiles.
const SETTLE_DELAY_MS = 1000;

const port = process.env.PORT ? process.env.PORT : 3000;
const PRINT_DIR = path.join(__dirname, '..', 'public', 'tmp', 'print');

// Print keys are UUIDs (crypto.randomUUID). Only keys of this shape are accepted
// by /api/postdata, so a key can never point outside PRINT_DIR.
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Prints every frame in body.bounds.
 *
 * Response for one frame: {success, key, uri, format: "pdf"|"png"}.
 * For several frames: {success, key, format: "pdf"|"zip"} for the merged file.
 * With {png: true} and without {image: false}, the first frame is returned as PNG bytes.
 */
router.post('/api/print', async function (req, response) {
    // The render has its own deadlines (headlessPage.js), so switch off the socket timeout.
    req.setTimeout(0);
    const q = req.body;
    if (!Array.isArray(q?.bounds) || q.bounds.length === 0) {
        response.status(400).send({success: false, code: 'INVALID_PRINT_REQUEST', message: 'The print job has no frames (bounds).'});
        return;
    }
    const outputPng = q.png === true;
    const returnImage = q.image === undefined ? true : q.image !== false;
    countPrint('requested', outputPng ? 'png' : 'pdf', printLabels(q));

    try {
        if (outputPng && returnImage) {
            // The PNG bytes are the response, so only one frame can be returned.
            const {image} = await printFrame(q, 0, 1, req, {outputPng, returnImage});
            countPrint('success', 'png', printLabels(q));
            sendPng(response, image);
            return;
        }

        const frames = await mapWithConcurrency(q.bounds, maxBrowsers,
            (bounds, frame) => printFrame(q, frame, q.bounds.length, req, {outputPng}));

        if (frames.length === 1) {
            countPrint('success', outputPng ? 'png' : 'pdf', printLabels(q));
            response.send({success: true, key: frames[0].key, uri: frames[0].uri, format: outputPng ? 'png' : 'pdf'});
            return;
        }

        console.log(`All ${frames.length} frames done. Merging...`);
        const key = crypto.randomUUID();
        const files = frames.map(frame => frame.file);
        if (outputPng) {
            const zip = new AdmZip();
            files.forEach(file => zip.addLocalFile(file));
            zip.writeZip(path.join(PRINT_DIR, 'png', `${key}.zip`));
            countPrint('success', 'zip', printLabels(q));
            response.send({success: true, key, format: 'zip'});
        } else {
            await PDFMerge(files, {output: path.join(PRINT_DIR, 'pdf', `${key}.pdf`)});
            countPrint('success', 'pdf', MERGED_LABELS);
            response.send({success: true, key, format: 'pdf'});
        }
    } catch (error) {
        countPrint('error', outputPng ? 'png' : 'pdf', printLabels(q));
        sendError(response, error);
    }
});

/**
 * Prints the first frame of the print settings saved in a state snapshot, as PNG.
 * GET /api/print/<database>?state=<snapshot id>
 */
router.get('/api/print/:database', async function (req, res) {
    countPrint('requested', 'png', {
        scale: req.query.scale || 'unknown',
        template: req.query.tmpl || 'default',
        db: req.params.database || 'unknown',
    });
    const uri = `http://127.0.0.1:${port}/api/state-snapshots/${encodeURIComponent(req.params.database)}/${encodeURIComponent(req.query.state || '')}`;

    let snapshot;
    try {
        const r = await fetch(uri);
        snapshot = (await r.json()).snapshot;
    } catch (error) {
        shared.throwError(res, 'INVALID_OR_EMPTY_EXTERNAL_API_REPLY', {error: error.message});
        return;
    }

    const q = snapshot?.modules?.print;
    if (!q || !Array.isArray(q.bounds) || q.bounds.length === 0) {
        shared.throwError(res, 'NO_PRINT_IN_SNAPSHOT');
        return;
    }
    // The print page reads the layer tree from the job to know which layers to show.
    q.state = {modules: {layerTree: snapshot.modules.layerTree}};

    try {
        const {image} = await printFrame(q, 0, 1, req, {outputPng: true, returnImage: true});
        countPrint('success', 'png', printLabels(q));
        sendPng(res, image);
    } catch (error) {
        countPrint('error', 'png', printLabels(q));
        sendError(res, error);
    }
});

/**
 * Returns a saved print job. The headless print page calls this with its key (?k=<key>).
 */
router.get('/api/postdata', function (req, response) {
    const key = req.query.k;
    if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
        response.status(400).send({success: false, code: 'INVALID_PRINT_KEY', message: 'Not a valid print key.'});
        return;
    }
    fs.readFile(path.join(PRINT_DIR, 'json', key), 'utf8', (err, data) => {
        if (err) {
            response.status(404).send({success: false, code: 'PRINT_JOB_NOT_FOUND', message: 'The print job does not exist.'});
            return;
        }
        // This runs in a callback, outside Express: an exception here would kill the process.
        try {
            response.send({success: true, data: JSON.parse(data)});
        } catch (error) {
            response.status(500).send({success: false, code: 'PRINT_JOB_INVALID', message: 'The print job could not be read.'});
        }
    });
});

/**
 * Renders one frame of a print job and records how long it took (Mapconnect metrics).
 * A frame that never got a browser (PRINT_BUSY) took no time, so it is left out of
 * the duration histogram; it is counted as an error by the caller.
 *
 * @param {object} q The print job
 * @param {number} frame Index of the frame in q.bounds
 * @param {number} numberOfFrames Shown on the page as "#2" when more than one
 * @param req The client's request (for its session cookie)
 * @param {object} options outputPng: PNG instead of PDF. returnImage: return the PNG bytes instead of saving a file.
 * @returns {Promise<{key, uri, file}|{image}>}
 */
async function printFrame(q, frame, numberOfFrames, req, options) {
    const format = options.outputPng ? 'png' : 'pdf';
    const startTime = Date.now();
    try {
        const result = await renderFrame(q, frame, numberOfFrames, req, options);
        observeFrameDuration(format, printLabels(q), startTime);
        return result;
    } catch (error) {
        if (error.code !== 'PRINT_BUSY') {
            observeFrameDuration(format, printLabels(q), startTime);
        }
        throw error;
    }
}

/**
 * Renders one frame of a print job. See printFrame() for the parameters.
 */
async function renderFrame(q, frame, numberOfFrames, req, {outputPng = false, returnImage = false}) {
    const key = crypto.randomUUID();
    await fs.promises.writeFile(path.join(PRINT_DIR, 'json', key), JSON.stringify(q));
    const uri = printPageUri(q, key, frame, numberOfFrames, req);
    const url = `http://127.0.0.1:${port}${uri}`;
    console.log(`Printing ${url}`);

    return withBrowser(timeout, async browser => {
        if (!outputPng) {
            const page = await openAndWaitUntilReady(browser, url, printReadiness(), {screenMedia: true});
            console.log('App was loaded, generating PDF');
            await sleep(SETTLE_DELAY_MS);
            const file = path.join(PRINT_DIR, 'pdf', `${key}.pdf`);
            await page.pdf({
                path: file,
                landscape: q.orientation === 'l',
                format: q.pageSize,
                printBackground: true,
                // The conflict report is an HTML document and needs page margins. Maps go edge to edge.
                margin: q.tmpl === "_conflictPrint" ? {left: '0.4cm', top: '1cm', right: '0.4cm', bottom: '1cm'} : 0,
            });
            return {key, uri, file};
        }

        // Mapconnect: PNG prints also wait for the layers and the legend, like PDFs,
        // and log failed requests to help find layers that come out empty.
        const page = await openAndWaitUntilReady(browser, url, printReadiness(), {
            viewport: pngViewport(q.pageSize, q.orientation),
            logNetworkErrors: true,
        });
        console.log('App was loaded, generating PNG');
        await sleep(SETTLE_DELAY_MS);
        // Hide the map controls and the loading screen
        await page.evaluate(`$('.leaflet-top').remove();$('#loadscreen').remove();`);
        const image = await page.screenshot();
        if (returnImage) {
            return {image};
        }
        const file = path.join(PRINT_DIR, 'png', `${key}.png`);
        await fs.promises.writeFile(file, image);
        return {key, uri, file};
    });
}

/**
 * The URL of the print page for one frame. The page reads these parameters in
 * browser/modules/init.js (template, size, dates) and state.js (job, title, comment).
 * Title and comment arrive URI-encoded from the client.
 */
function printPageUri(q, key, frame, numberOfFrames, req) {
    const session = req.cookies["connect.gc2"] !== undefined ? encodeURIComponent(req.cookies["connect.gc2"]) : "";
    return '/app/' + q.db + '/' + q.schema + '/' + (q.queryString !== "" ? q.queryString : "?") +
        '&frame=' + frame +
        '&frameN=' + numberOfFrames +
        '&session=' + session +
        '&tmpl=' + q.tmpl + '.tmpl' +
        '&l=' + q.legend +
        '&h=' + q.header +
        '&px=' + q.px +
        '&py=' + q.py +
        '&td=' + encodeURIComponent(q.dateTime || '') +
        '&d=' + encodeURIComponent(q.date || '') +
        '&k=' + key +
        '&t=' + q.title +
        '&c=' + q.comment +
        q.anchor;
}

/**
 * Viewport in pixels for PNG output. A4 portrait is 795 x 1125 px; bigger sheets scale from that.
 */
function pngViewport(pageSize, orientation) {
    const scaleFromA4 = {A4: 1, A3: 1.5, A2: 2, A1: 2.5, A0: 3}[pageSize];
    if (!scaleFromA4) {
        return {width: 1500, height: 1500};
    }
    const width = Math.floor(795 * scaleFromA4);
    const height = Math.floor(1125 * scaleFromA4);
    return orientation === 'l' ? {width: height, height: width} : {width, height};
}

function sendPng(response, image) {
    response.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': image.length
    });
    response.end(image);
}

/**
 * Like Promise.all(items.map(fn)), but runs at most `limit` calls at a time and starts
 * no new call after one has failed. With limit = the pool size, the frames of one job
 * never wait for each other in the browser pool's queue.
 */
async function mapWithConcurrency(items, limit, fn) {
    const results = [];
    let next = 0;
    let failed = false;
    const worker = async () => {
        while (next < items.length && !failed) {
            const i = next++;
            try {
                results[i] = await fn(items[i], i);
            } catch (error) {
                failed = true;
                throw error;
            }
        }
    };
    const workers = [];
    for (let n = 0; n < Math.min(Math.max(1, limit || 1), items.length); n++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return results;
}

// ---------------------------------------------------------------------------
// Mapconnect: Prometheus metrics (modules/metrics). Nothing is recorded when
// metrics are disabled.
//
// vidi_controllers_print_print_requests_total{scale, format, status, template, db}
//   status "requested" when a print arrives, then "success" or "error" once per print.
// vidi_controllers_print_duration_milliseconds{format, template, db, scale}
//   one observation per frame that got a browser, successful or not.
// ---------------------------------------------------------------------------

// Labels for a merged multi-frame PDF, kept as before so existing dashboards still match.
const MERGED_LABELS = {scale: 0, template: 'MERGE', db: 'MERGE'};

function printLabels(q) {
    return {scale: q.scale || 'unknown', template: q.tmpl || 'default', db: q.db || 'unknown'};
}

function countPrint(status, format, labels) {
    if (metrics.isEnabled()) {
        metrics.getPrintMetrics().counter.inc({...labels, format, status});
    }
}

function observeFrameDuration(format, labels, startTime) {
    if (metrics.isEnabled()) {
        metrics.getPrintMetrics().duration.observe({...labels, format}, Date.now() - startTime);
    }
}

module.exports = router;
