/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2018 MapCentia ApS
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require('express');
var router = express.Router();
var config = require('../../config/config.js').gc2;
var request = require('request');

router.get('/api/legend/:db', function (req, response) {

    var l = req.query.l, db = req.params.db, url;

    url = config.host + "/api/v1/legend/json/" + db + "?l=" + encodeURIComponent(l);

    var options = {
        uri: url,
        encoding: 'utf8',
        headers: {
            Cookie: "PHPSESSID=" + req?.session?.gc2SessionId
        }
    };

    request.get(options,
        function (err, res, body) {
            if (err) {
                console.error("Request error:", err);
                response.header('content-type', 'application/json');
                response.status(400).send({
                    success: false,
                    message: "Could not get the legend data."
                });
                return;
            }
            let data;
            try {
                if (!body || body.trim() === '') {
                    throw new Error('Empty response body');
                }
                data = JSON.parse(body);
            } catch (e) {
                console.error("[Legend] JSON parse error:", e.message, "Response body:", body);
                response.header('content-type', 'application/json');
                response.status(400).send({
                    success: false,
                    message: "Could not get the legend data."
                });
                return;
            }
            if (res.statusCode !== 200) {
                response.header('content-type', 'application/json');
                response.status(400).send({
                    success: false,
                    message: "Could not get the legend data."
                });
                return;
            }
            response.send(data);
        }
    )
});
module.exports = router;
