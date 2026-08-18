/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require("express");
var request = require("request");
var router = express.Router();
var http = require("http");
var https = require("https");
var moment = require("moment");
var config = require("../../../config/config.js");
var he = require("he");
var fetch = require("node-fetch");
var bi = require("../../../config/gp/config.blueidea");
const { post } = require("request");
const { reject } = require("underscore");

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
  // Guard against missing user
  if (!hasUserSetup(req.params.userid)) {
    response.status(401).send("User not found");
    return;
  }

  // guard against missing session (not logged in to GC2)
  if (!req.session.hasOwnProperty("gc2SessionId")) {
    response
      .status(401)
      .send("No active session - please login in the vidi application");
    return;
  }

  // else do nothing
  return;
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
// Get current user and setup
router.get("/api/extension/blueidea/:userid", function (req, response) {
  guard(req, response);

  // Get user from config
  var user = bi.users[req.params.userid];

  //console.log(user);

  // guard against missing mandatory properties

  // if blueidea is set, and is true, check for username and password
  try {
    if (user.hasOwnProperty("blueidea") && user.blueidea) {
      if (!user.hasOwnProperty("username") || !user.hasOwnProperty("password")) {
        response.status(500).send("Missing username or password");
        return;
      }
    }
  } catch {
    console.log("Error checking blueidea properties");
    return;
  }

  // if check if blueidea and lukke liste is set
  if (!user.hasOwnProperty("blueidea") || !user.hasOwnProperty("lukkeliste")) {
    response.status(500).send("Missing feature flags");
    return;
  }

  returnobj = {
    profileid: user.profileid ? user.profileid : null,
    lukkeliste: user.lukkeliste ? user.lukkeliste : false,
    alarmkabel: user.alarmkabel ? user.alarmkabel : false,
    blueidea: user.blueidea ? user.blueidea : false,
    forsyningsarter: user.forsyningsarter ? user.forsyningsarter : [],
    debug: user.debug ? user.debug : null,
    layersOnStart: user.layersOnStart ? user.layersOnStart : [],
    alarm_skabe: null,
  };

  // Check if the database is correctly setup, and the session is allowed to access it
  let validate = [
    SQLAPI("select * from lukkeliste.beregn_ventiler limit 1", req),
    SQLAPI("select * from lukkeliste.beregn_afskaaretmatrikler limit 1", req),
    SQLAPI("select * from lukkeliste.beregn_afskaaretnet limit 1", req),
    SQLAPI("select * from lukkeliste.beregnlog limit 1", req),
    SQLAPI("select * from lukkeliste.lukkestatus limit 1", req),
  ];

  // if alarm_skab is set, test and build a list
  if (user.hasOwnProperty("alarm_skab")) {
    let alarm_skab = user.alarm_skab;
    let query = `SELECT ${alarm_skab.key} as value, ${alarm_skab.name} as text, ${alarm_skab.geom} from ${alarm_skab.layer}`;
    validate.push(SQLAPI(query, req, { format: "geojson", srs: 4326 }));
  }

  
  Promise.all(validate)
    .then((res) => {
      returnobj.db = true;
      returnobj.lukkestatus = res[4].features[0].properties;
      //console.log(res[4].features[0].properties);

      // if alarm_skab is set, add to return object
      if (user.hasOwnProperty("alarm_skab")) {
        returnobj.alarm_skabe = res[5].features;
      }
    })
    .catch((err) => {
      returnobj.db = false;
      returnobj.lukkestatus = false;
      returnobj.message = err.message;
    })
    .finally(() => {
      response.status(200).json(returnobj);
    });
});

// Query alarmkabel-plugin in database
router.post("/api/extension/alarmkabel/:userid/query", function (req, response) {
    guard(req, response);

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
    guard(req, response);

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

 
router.get("/api/extension/blueidea/:userid/getproject/:beregnuuid", function (req, response) {
    guard(req, response);
    const beregnuuid = req.params.beregnuuid;
    const query = ` SELECT 
    beregnuuid,
    forsyningsart,
    to_char(gyldig_fra AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS gyldig_fra,
    to_char(gyldig_til AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS gyldig_til,
    beregnaarsag,
    brud_status,
    sagstekst 
    FROM lukkeliste.beregnlog 
    WHERE beregnuuid = '${beregnuuid}' `;   

    SQLAPI(query, req )
      .then((data) => {
        response.status(200).json(data);
      })
      .catch((err) => {
        console.error(err);
        response.status(500).json(err);
      });
  }
);


router.post("/api/extension/blueidea/:userid/saveproject", function (req, response) {
    guard(req, response);
    const body = req.body;
    const beregnuuid = body.beregnuuid;
    
    const query = `UPDATE lukkeliste.beregnlog SET brud_status = 2 WHERE beregnuuid='${beregnuuid}' `;   

    SQLAPI(query, req )
      .then((data) => {
        response.status(200).json({ message: "Project saved successfully" });
      })
      .catch((err) => {
        console.error(err);
        response.status(500).json({ message: "Error saving project", error: err });
      });
  }
);

router.post("/api/extension/blueidea/:userid/saveprojectdates", function (req, response) {
    guard(req, response);
    const body = req.body;
    const beregnuuid = body.beregnuuid;
    const gyldig_fra = body.projectStartDate ? `'${body.projectStartDate}'::timestamp` : null;
    const gyldig_til = body.projectEndDate ? `'${body.projectEndDate}'::timestamp` : null;

    const query = ` UPDATE lukkeliste.beregnlog SET 
    gyldig_fra = ${gyldig_fra},
    gyldig_til = ${gyldig_til}
    WHERE beregnuuid = '${beregnuuid}' `;   

    SQLAPI(query, req )
      .then((data) => {
        response.status(200).json({ message: "Project saved successfully" });
      })
      .catch((err) => {
        console.error(err);
        response.status(500).json({ message: "Error saving project", error: err });
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

// Check if user has setup username and password
function hasUserSetup(uuid) {
  // check if uuid in in config, and if user object has username and password
  if (bi.users.hasOwnProperty(uuid)) {
    // if blueidea is set, and is true, check for username and password
    if (bi.users[uuid].hasOwnProperty("blueidea") && bi.users[uuid].blueidea) {
      if (
        !bi.users[uuid].hasOwnProperty("username") ||
        !bi.users[uuid].hasOwnProperty("password")
      ) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
}

// Login to Blueidea to get token
function loginToBlueIdea(uuid) {
  // guard against missing user
  if (!hasUserSetup(uuid)) {
    reject("User not found");
  }
  var user = bi.users[uuid];
  var options = {
    uri: bi.hostname + "User/Login",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: user.username, password: user.password }),
  };

  return new Promise(function (resolve, reject) {
    request.post(options, function (error, res, body) {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(body).accessToken);
      }
    });
  });
}

module.exports = router;
