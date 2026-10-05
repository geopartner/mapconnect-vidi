/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require("express");
var router = express.Router();
var http = require("http");
var https = require("https");
var moment = require("moment");
var config = require("../../../config/config.js");

var fetch = require("node-fetch");

const SCHEMA = "drift";
const TABLEDATA = "henvendelse_aktiv";

// SET GC2 HOST
GC2_HOST = config.gc2.host;

// Set locale for date/time string
moment.locale("da_DK");

// Days from 19000101 to 19700101
const DAYSSINCE = 25569;
// milisecs pr. day
const MILISECSDAY = 86400000;

const TIMEOUT = 30000;

/**
 * This function handles basic checks for each request
 * @param req
 * @param response
 */
function guard(req, response) {
  // guard against missing session (not logged in to GC2)
  if (!req.session.hasOwnProperty("gc2SessionId")) {
    response
      .status(401)
      .send("No active session - please login in the vidi application");
    return false;
  }

  // else do nothing
  return true;
}

var userString = function (req) {
  var userstr = "";
  if (req.session.subUser) {
    var userstr = req.session.gc2UserName + "@" + req.session.parentDb;
  } else {
    var userstr = req.session.gc2UserName;
  }
  return userstr;
};



router.post("/api/extension/drift", function (req, response) {
  if (!guard(req, response)) {
    return;
  }
  const alarm_skab = req.body;

  let query = `SELECT ${alarm_skab.key} as value, ${alarm_skab.name} as text, ${alarm_skab.geom} from ${alarm_skab.layer}`;
  SQLAPI(query, req, { format: "geojson", srs: 4326 })
    .then(data => response.status(200).json(data))
    .catch(err => response.status(500).send(err));
});

router.get("/api/extension/drift/GetActiveHenvendelser/:pagenumber/:pagesize", function (req, response) {
  if (!guard(req, response)) {
    return;
  }
  const pageNumber = parseInt(req.params.pagenumber, 10);
  const pageSize = parseInt(req.params.pagesize, 10);
  // const userId = req.params.userId;
  //const sql = `SELECT overskrift, placering, navn, problemtypeid, ansvarligid, kommentar, indberetningdato, haendelsedato, udkaldid, prioritetid, statusid, oprettetdato, oprettetid, gid,forsyningtypeid,  COUNT(*) OVER () AS totalt_antal FROM ${SCHEMA}.${TABLEDATA} `;
  const sql = `SELECT
    ha.gid,
    ha.overskrift,
    ha.placering,
    ha.navn,
    lp.name as problemtype,
    ha.ansvarligid,
    ha.kommentar,
    ha.indberetningdato,
    ha.haendelsedato,
    ha.udkaldid,
    ha.prioritetid,
    ha.statusid,
    ha.oprettetdato,
    ha.oprettetid,
    ha.forsyningtypeid,
	  ST_AsText(the_geom) as WKT,
    COUNT(*) OVER () AS totalt_antal
    FROM drift.henvendelse_aktiv ha
    LEFT JOIN drift.listepost lp ON ha.problemtypeid = lp.id
    LEFT JOIN drift.driftbruger db ON  ha.ansvarligid = db.id
    OFFSET ${pageNumber * pageSize}
    LIMIT ${pageSize}`

  SQLAPI(sql, req)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error("Fejl i SQLAPI:", err);
      response.status(500).send("Fejl ved databaseopslag");
    });
});


// Query alarmkabel-plugin in database
router.post("/api/extension/drift/query", function (req, response) {
  if (!guard(req, response)) {
    return;
  }

  // guard against missing lat and lng in body
  if (!req.body.hasOwnProperty("lat") || !req.body.hasOwnProperty("lng")) {
    response.status(401).send("Missing lat or lng");
    return;
  }

  // Guard against no distance
  if (!req.body.hasOwnProperty("distance")) {
    response.status(401).send("Missing distance");
    return;
  }

  // Guard against no forsyningsart
  if (!req.body.hasOwnProperty("forsyningsart")) {
    response.status(401).send("Missing forsyningsart");
    return;
  }

  // set timeout to 30s
  req.setTimeout(TIMEOUT);

  // Create the query to insert into the database
  const q = `
      INSERT INTO lukkeliste.beregnalarmlog(
      the_geom, 
      forsyningsart, 
      distance, 
      beregntypeid,
      username,
      direction
      ) 
      VALUES (
      ST_Transform(
        ST_GeomFromEWKT('SRID=4326;Point(${req.body.lng} ${req.body.lat})'),
        25832
      )::geometry, 
      ${req.body.forsyningsart}, 
      ${req.body.distance},
      2,
      '${req.session.screenName}', 
      '${req.body.direction}'
      )
      RETURNING beregnuuid
    `;

  SQLAPI(q, req)
    .then((uuid) => {
      let beregnuuid = uuid.returning[0].beregnuuid;
      let promises = [];

      console.log('Alarmkabel:', 'user:', req.session.screenName, 'exec time:', uuid._execution_time, 'peak mem:', uuid._peak_memory_usage, '->', beregnuuid);

      // get points
      promises.push(
        SQLAPI(
          `SELECT * from lukkeliste.vw_alarmpkt where beregnuuid = '${beregnuuid}'`,
          req,
          { format: "geojson", srs: 4326 }
        )
      );

      // get log
      promises.push(
        SQLAPI(
          `SELECT * from lukkeliste.beregnalarmlog where beregnuuid = '${beregnuuid}'`,
          req,
          { format: "geojson", srs: 4326 }
        )
      );

      // when promises are complete, return the result
      Promise.all(promises)
        .then((res) => {
          response.status(200).json({
            alarm: res[0],
            log: res[1],
          });
        })
        .catch((err) => {
          console.error(err);
          response.status(500).json(err);
        });
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json(err);
    });
}
);


router.post("/api/extension/drift/query", function (req, response) {
  if (!guard(req, response)) {
    return;
  }

  // guard against missing lat and lng in body
  if (!req.body.hasOwnProperty("lat") || !req.body.hasOwnProperty("lng")) {
    response.status(401).send("Missing lat or lng");
    return;
  }

  // guard against missing alarmskab
  if (!req.body.hasOwnProperty("alarmskab")) {
    response.status(401).send("Missing alarmskab id");
    return;
  }

  // set timeout to 30s
  req.setTimeout(TIMEOUT);

  // create the string we need to query the database
  // q = `SELECT lukkeliste.fnc_beregn_afstand_alarmnet('${req.body.alarmskab}'::int, 
  // ST_Transform(ST_GeomFromEWKT('SRID=4326;Point(${req.body.lng} ${req.body.lat})'),25832)::geometry, 
  // '${req.body.direction}', 
  // '${req.session.screenName}')`;
  // Create the query to insert into the database
  const q = `
      INSERT INTO lukkeliste.beregnalarmlog(
      the_geom, 
      forsyningsart, 
      distance, 
      beregntypeid,
      username,
      direction,
      funktion,
      komponentid
      ) 
      VALUES (
      ST_Transform(
        ST_GeomFromEWKT('SRID=4326;Point(${req.body.lng} ${req.body.lat})'),
        25832
      )::geometry, 
      ${req.body.forsyningsart}, 
      ${req.body.distance},
      2,
      '${req.session.screenName}', 
      '${req.body.direction}',
      'fnc_beregn_afstand_alarmnet',
      '${req.body.alarmskab}'
      )
      RETURNING beregnuuid
    `;



  console.log(q);
  SQLAPI(q, req)
    .then((uuid) => {
      let beregnuuid = uuid.returning[0].beregnuuid;
      let promises = [];

      console.log(q, " -> ", beregnuuid);

      // get points
      promises.push(
        SQLAPI(
          `SELECT * from lukkeliste.vw_alarm_afstand where beregnuuid = '${beregnuuid}'`,
          req,
          { format: "geojson", srs: 4326 }
        )
      );

      // get log
      promises.push(
        SQLAPI(
          `SELECT * from lukkeliste.beregnalarmlog where beregnuuid = '${beregnuuid}'`,
          req,
          { format: "geojson", srs: 4326 }
        )
      );

      // when promises are complete, return the result
      Promise.all(promises)
        .then((res) => {
          response.status(200).json({
            alarm: res[0],
            log: res[1],
          });
        })
        .catch((err) => {
          console.error(err);
          response.status(500).json(err);
        });
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json(err);
    });
}
);


// Use SQLAPI
function SQLAPI(q, req, options = null) {
  var userstr = userString(req);
  var postData = {
    key: req.session.gc2ApiKey,
    q: q,
  };

  // because we are running stuff though a parser, we need to be sure this is set for a primary host
  // we need SET SERVER ROLE TO 'primary'; first, and SET SERVER ROLE TO 'default'; after
  q = "SET SERVER ROLE TO 'primary'; " + q + "; SET SERVER ROLE TO 'default';";

  // if options is set, merge with postData
  if (options) {
    postData = Object.assign({}, postData, options);
  }

  var url = GC2_HOST + "/api/v2/sql/" + userstr;
  postData = JSON.stringify(postData);
  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(postData),
      "GC2-API-KEY": req.session.gc2ApiKey,
    },
    body: postData,
  };

  // Return new promise
  return new Promise(function (resolve, reject) {
    //console.log(q.substring(0,175))
    fetch(url, options)
      .then((r) => r.json())
      .then((data) => {
        // if message is present, is error
        if (data.hasOwnProperty("message")) {
          //console.log(data);
          reject(data);
        } else {
          //console.log('Success: '+ data.success+' - Q: '+q.substring(0,60))
          resolve(data);
        }
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
}
module.exports = router;
