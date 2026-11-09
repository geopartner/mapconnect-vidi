/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2026 MapCentia ApS
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Merges PDFs that were printed earlier into one PDF.
 * POST /api/mergePrint with a JSON array of print keys: ["<key>", "<key>", ...]
 * Answers {success: true, key} for the merged file in public/tmp/print/pdf/<key>.pdf.
 */

require('dotenv').config();

const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const PDFMerge = require('pdf-merge');

const PDF_DIR = path.join(__dirname, '..', 'public', 'tmp', 'print', 'pdf');

// Print keys are UUIDs (see controllers/print.js). Only keys of this shape are
// accepted, so a key can never point outside PDF_DIR.
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

router.post('/api/mergePrint', async function (req, response) {
    req.setTimeout(0); // Merging large PDFs can take a while
    const keys = req.body;
    if (!Array.isArray(keys) || keys.length === 0 || !keys.every(key => typeof key === 'string' && KEY_PATTERN.test(key))) {
        response.status(400).send({success: false, code: 'INVALID_PRINT_KEY', message: 'Send a JSON array of print keys.'});
        return;
    }

    const key = crypto.randomUUID();
    try {
        await PDFMerge(keys.map(k => path.join(PDF_DIR, `${k}.pdf`)), {output: path.join(PDF_DIR, `${key}.pdf`)});
        response.send({success: true, key});
    } catch (error) {
        console.error('Merging prints failed:', error.message);
        response.status(500).send({success: false, code: 'PRINT_FAILED', message: 'The prints could not be merged.'});
    }
});

module.exports = router;
