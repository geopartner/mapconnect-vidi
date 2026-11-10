/*
 * @author     Alexander Shumilov
 * @copyright  2013-2019 MapCentia ApS
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Returns a PNG screenshot of a Vidi state snapshot (or of a filter).
 * GET /api/static/<db>/<schema>?state=<snapshot id>&width=800&height=600
 *
 * Uses the same headless browser helpers as print, see headlessPage.js.
 */

require('dotenv').config();

const express = require('express');
const router = express.Router();
const {withBrowser, openAndWaitUntilReady, snapshotReadiness, sleep, sendError} = require('./headlessPage');

// How long one screenshot may take, from the moment a browser is free.
const TIMEOUT_MS = 60000;

const returnPNGForStateSnapshot = async (localRequest, localResponse) => {
    let errorMessages = [];
    if (!localRequest.params.db) errorMessages.push(`database is not defined`);
    if (!localRequest.query.state && !localRequest.query.filter) errorMessages.push(`state or filter paramter is not defined`);
    if (!localRequest.headers.host) errorMessages.push(`"Host" header has to be correctly passed to the app`);
    if (errorMessages.length > 0) {
        localResponse.status(400);
        localResponse.send(`Errors occured: ${errorMessages.join(`,`)}`);
        return;
    }

    let width = (localRequest.query.width && parseInt(localRequest.query.width) > 0 ? parseInt(localRequest.query.width) : 800);
    let height = (localRequest.query.height && parseInt(localRequest.query.height) > 0 ? parseInt(localRequest.query.height) : 600);
    let config = (localRequest.query.config ? `&config=${localRequest.query.config}` : ``);
    let state = (localRequest.query.state ? `&state=${localRequest.query.state}` : ``);
    let filter = (localRequest.query.filter ? `&initialFilter=${localRequest.query.filter}` : ``);
    const hasFilter = !!localRequest.query.filter;
    // With a filter the map zooms to the filtered features after loading, so wait longer.
    const delay = hasFilter ? 3000 : 200;

    const port = process.env.PORT ? process.env.PORT : 3000;
    let url = `http://127.0.0.1:${port}/app/${localRequest.params.db}/${localRequest.params.scheme}/?tmpl=blank.tmpl${state}${filter}${config}`;

    try {
        const img = await withBrowser(TIMEOUT_MS, async browser => {
            const page = await openAndWaitUntilReady(browser, url, snapshotReadiness(hasFilter), {viewport: {width, height}});
            console.log('App was loaded, generating PNG');
            await sleep(delay);
            // Hide the map controls and the loading screen
            await page.evaluate(`$('.leaflet-top').remove();$('#loadscreen').remove();`);
            return page.screenshot();
        });
        localResponse.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        localResponse.end(img);
    } catch (error) {
        sendError(localResponse, error);
    }
};

router.get('/api/static/:db/:scheme?', returnPNGForStateSnapshot);
router.get('/api/static/:db/:scheme?/', returnPNGForStateSnapshot);

module.exports = router;
