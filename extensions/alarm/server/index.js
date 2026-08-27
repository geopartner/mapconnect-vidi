/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require("express");
var router = express.Router();
var http = require("http");
var https = require("https");
var moment = require("moment");
var config = require("../../../config/config.js");

var fetch = require("node-fetch");
const bi = require("../../../config/gp/config.alarm");



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

const validateConfig = function (user) {
  const result = {status: true, message: ''};
  if (!user) {
    result.status = false;
    result.message = 'No user provided';
    return result;
  }
  if (!user.hasOwnProperty("alarm_skab") &&
      !user.hasOwnProperty("alarmkabel")) {
    result.status = false;
    result.message = 'No alarm_skab or alarmkabel configuration found';
    return result;
  }
  if (!user.hasOwnProperty("alarm_skab") && 
       user.hasOwnProperty("alarmkabel") &&
      !user.alarmkabel !== true ) {
    result.status = false;
    result.message = 'No alarm_skab or alarmkabel configuration found';
    return result;
  }


  if (user.hasOwnProperty("alarm_skab")) {
    const props = ["layer", "geom", "key", "name"];
    for (const prop of props) {
      if (!user.alarm_skab.hasOwnProperty(prop)) {
        result.status = false;
        result.message += `Missing property ${prop} in alarm_skab configuration\n`;
        return result;
      }
    }
  }

  if (user.hasOwnProperty("alarmkabel")) {
    const props = ["alarmkabel_distance", "alarmkabel_art", "udpeg_layer"];
    for (const prop of props) {
      if (!user.hasOwnProperty(prop)) {
        result.status = false;
        result.message += `Missing property ${prop} in alarmkabel configuration\n`;
        return result;
      }
    }
  }

  return result;

  
};

// Get current user and setup
router.get("/api/extension/alarm/:userid", function (req, response) {
  if (!guard(req, response)) {
    return;
  }
  const user = bi.users[req.params.userid];
  const status = validateConfig(user); 
  if (status.status === false) {
    response.status(401).send(status);
    return;
  }
   
  // Get user from config
  
  const returnobj = {
    db: true,
    status: true,
    profileid: user.profileid ? user.profileid : null,
    lukkeliste: user.lukkeliste ? user.lukkeliste : false,
    alarmkabel: user.alarmkabel ? user.alarmkabel : false,
    forsyningsarter: user.forsyningsarter ? user.forsyningsarter : [],
    layersOnStart: user.layersOnStart ? user.layersOnStart : [],
    alarm_skabe: user.alarm_skab ? user.alarm_skab : null,
    alarm_skab_layer: null,
    alarm_skab_key: null,
    message: '',
  };

  // Check if the database is correctly setup, and the session is allowed to access it
  let validate = [];

  // if alarm_skab is set, test and build a list
  if (user.hasOwnProperty("alarm_skab")) {
    let alarm_skab = user.alarm_skab;
    let query = `SELECT ${alarm_skab.key} as value, ${alarm_skab.name} as text, ${alarm_skab.geom} from ${alarm_skab.layer}`;
    validate.push(SQLAPI(query, req, { format: "geojson", srs: 4326 }));
  }


  Promise.all(validate)
    .then((res) => {
      returnobj.db = true;
      // returnobj.lukkestatus = res[4].features[0].properties;
      // //console.log(res[4].features[0].properties);

      // // if alarm_skab is set, add to return object
      if (user.hasOwnProperty("alarm_skab")) {
        returnobj.alarm_skabe = res[0].features;
        returnobj.alarm_skab_layer = user.alarm_skab ? user.alarm_skab.layer : null;
        returnobj.alarm_skab_key = user.alarm_skab ? user.alarm_skab.key : null;
      }

    })
    .catch((err) => {
      returnobj.db = false;
      returnobj.status = false;
      returnobj.message = 'Alarm config error: ' + err.message;
      
    })
    .finally(() => {
      if (returnobj.status === true) {
        response.status(200).json(returnobj);
      }
      else {
        response.status(401).json(returnobj);
      }
    });
});

// Query alarmkabel-plugin in database
router.post("/api/extension/alarmkabel/:userid/query", function (req, response) {
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
      INSERT INTO lukkeliste.beregnlog(
      the_geom, 
      forsyningsart, 
      opslagmatrikler, 
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
      false, 
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
          `SELECT * from lukkeliste.beregnlog where beregnuuid = '${beregnuuid}'`,
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

// Query alarmskab-plugin in database
router.post("/api/extension/alarmskab/:userid/query", function (req, response) {
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
  q = `SELECT lukkeliste.fnc_beregn_afstand_alarmnet('${req.body.alarmskab}'::int, ST_Transform(ST_GeomFromEWKT('SRID=4326;Point(${req.body.lng} ${req.body.lat})'),25832)::geometry, '${req.body.direction}', '${req.session.screenName}')`;
  console.log(q);
  SQLAPI(q, req)
    .then((uuid) => {
      let beregnuuid = uuid.features[0].properties.fnc_beregn_afstand_alarmnet;
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
          `SELECT * from lukkeliste.beregnlog where beregnuuid = '${beregnuuid}'`,
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
