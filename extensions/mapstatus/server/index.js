/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require("express");
var router = express.Router();
var config = require("../../../config/config.js");
var moment = require("moment");
var fetch = require("node-fetch");

GC2_HOST = config.gc2.host;
moment.locale("da_DK");


const SCHEMA = "projekt";
const TABLEDATA = "projektdata";


const userString = (req) => {
    var userstr = "";
    if (req.session.subUser) {
        var userstr = req.session.gc2UserName + "@" + req.session.parentDb;
    } else {
        var userstr = req.session.gc2UserName;
    }
    return userstr;
};

function guard(req, response) {
    // Guard against missing skema
    //   if (!hasUserSetup(req.params.userid)) {
    //     response.status(401).send("User not found");
    //     return;
    //   }

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

function SQLAPI(q, req, options = null, timeout = 5000) {

    var userstr = userString(req);
    var postData = {
        key: req.session.gc2ApiKey,
        q: q,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
        controller.abort();
    }, timeout); // Set timeout for the request 



    // because we are running stuff though a parser, we need to be sure this is set for a primary host
    // we need SET SERVER ROLE TO 'primary'; first, and SET SERVER ROLE TO 'default'; after
    // q = "SET SERVER ROLE TO 'primary'; " + q + "; SET SERVER ROLE TO 'default';";

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
        fetch(url, options, { signal: controller.signal })
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
    }).finally(() => {
        clearTimeout(timer); // Clear the timeout when the request completes    
    });
}




/**********************************************************************
* GET /api/extension/mapstatus/GetProjects/:skema
*  Hent alle projekter med et bestem skama navn fra projet.projektdata
*  Bruges til at vise projekter i projektlisten, og til at vælge projekt i. 
*  Det er ikke derfor korrekt at det ikke er alle egenskaber der læses
*  
**********************************************************************/
router.get(
    "/api/extension/mapstatus/GetProjects/:skema", (req, response) => {
        guard(req, response);

        const skema = req.params.skema;
        const sql = `SELECT id, navn,  COALESCE(beskrivelse,'') as beskrivelse FROM ${SCHEMA}.${TABLEDATA} where skema = '${skema}' order by navn`;

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    }
);

/**********************************************************************
 * 
 * GET /api/extension/mapstatus/GetCloudConnectLink/:skema
 ***********************************************************************/
router.get(
    "/api/extension/mapstatus/GetCloudConnectLink/:skema", (req, response) => {
        guard(req, response);

        const skema = req.params.skema;
        const sql = `SELECT tv_url_prefix, tv_url_postfix  FROM ${skema}.tv_url_stamdata LIMIT 1`;

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    }
);

/**********************************************************************
 * 
 * GET /api/extension/mapstatus/GetBrrapUrl/:skema
 ***********************************************************************/
router.get(
    "/api/extension/mapstatus/GetBrrapUrl/:skema/:knudenavn", (req, response) => {
        guard(req, response);
        const { skema, knudenavn } = req.params;
        //const sql1 = `SELECT filmfil FROM ${skema}.ledninger_og_stik_med_tv WHERE ledningid=${knudenavn}`;
        const sql = `select 'https://cloudconnectapi.geopartner.dk/prod/service/file/'|| a.rapportnavn ||'.pdf' || b.tv_url_postfix  as brrap from  ${skema}.ddg_brrap a, ${skema}.tv_url_stamdata b where a.knudenavn ='${knudenavn}' and b._key_='MapTV pdf link'`;
        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag for brøndrapport");
            });
    }
);


router.get(
    "/api/extension/mapstatus/GetTvfilmfil/:skema/:ledningid", (req, response) => {
        guard(req, response);
        const { skema, ledningid } = req.params;
        const sql = `SELECT filmfil FROM ${skema}.ledninger_og_stik_med_tv WHERE ledningid=${ledningid}`;
        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    }
);


router.get(
    "/api/extension/mapstatus/GetRapportnr/:skema/:ledningid", (req, response) => {
        guard(req, response);
        const { skema, ledningid } = req.params;
        const sql = `SELECT rapport FROM ${skema}.ledninger_og_stik_med_tv WHERE ledningid=${ledningid}`;

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    }
);


router.get(
    "/api/extension/mapstatus/GetKunder/", (req, response) => {
        guard(req, response);

        const sql = `SELECT id, kundenavn, adresse FROM projekt.kunde`;


        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    }
);

function getGeojsonNodes(projekt) {
    let geoJson = '';
    if (projekt.geojsonnodes && typeof projekt.geojsonnodes === 'object') {
        geoJson = JSON.stringify(projekt.geojsonnodes);
    }
    if (projekt.geojsonnodes && typeof projekt.geojsonnodes === 'string') {
        geoJson = projekt.geojsonnodes;
    }
    return geoJson.length > 0 ? `'${geoJson}'` : `'{ "type": "FeatureCollection", "features": [] }'`;
}

function getGeojsonPipes(projekt) {
    let geoJson = '';
    if (projekt.geojson && typeof projekt.geojson === 'object') {
        geoJson = JSON.stringify(projekt.geojson);
    }
    if (projekt.geojson && typeof projekt.geojson === 'string') {
        geoJson = projekt.geojson;
    }
    return geoJson.length > 0 ? `'${geoJson}'` : `'{ "type": "FeatureCollection", "features": [] }'`;
}

function createSqlValues(skema, projekt) {
    const beskrivelse = projekt.beskrivelse ? `'${projekt.beskrivelse}'` : 'null';
    const editeret = projekt.editdate ? `'${projekt.editdate}'::date` : 'null';
    const oprettet = projekt.oprettet ? `'${projekt.oprettet}'::date` : 'null'; 
    const revision = projekt.revision ? `'${projekt.revision}'` : 'null';
    const projektadresse = projekt.projektadresse ? `'${projekt.projektadresse}'` : 'null';
    const afdeling = projekt.afdeling ? `'${projekt.afdeling}'` : 'null';
    const status = projekt.status ? `'${projekt.status}'` : '1';
    const bygherrenavn = projekt.bygherrenavn ? `'${projekt.bygherrenavn}'` : 'null';
    const bygherreafdeling = projekt.bygherreafdeling ? `'${projekt.bygherreafdeling}'` : 'null';
    const bygherreadresse = projekt.bygherreadresse ? `'${projekt.bygherreadresse}'` : 'null';
    const bygherrepostnr = projekt.bygherrepostnr ? `'${projekt.bygherrepostnr}'` : 'null';
    const projektnavn = projekt.projektnavn ? `'${projekt.projektnavn}'` : 'null';
    const projektpostnr = projekt.projektpostnr ? `'${projekt.projektpostnr}'` : 'null';
    const underprojektediteret = projekt.underprojektediteret ? `'${projekt.underprojektediteret}'::date` : 'null';
    const underprojektoprettet= projekt.underprojektoprettet ? `'${projekt.underprojektoprettet}'::date` : 'null';
    const underprojektrevision = projekt.underprojektrevision ? `'${projekt.underprojektrevision}'` : 'null';
    const underprojektstatus = projekt.underprojektstatus ? `'${projekt.underprojektstatus}'` : '1';;
    const geojson = getGeojsonPipes(projekt);
    const geojsonNodes = getGeojsonNodes(projekt);
    
    return {
        skema: `'${skema}'`,
        navn: `'${projekt.navn}'`,
        beskrivelse: beskrivelse,
        kundeid: `${projekt.kundeid}`,
        projektadresse: projektadresse,
        oprettet: oprettet,
        editeret: editeret,
        revision: revision,
        status: status,
        afdeling: afdeling,
        bygherrenavn: bygherrenavn,
        bygherreafdeling: bygherreafdeling,
        bygherreadresse: bygherreadresse,
        bygherrepostnr: bygherrepostnr,
        projektnavn: projektnavn,
        projektpostnr: projektpostnr,
        underprojektediteret: underprojektediteret,
        underprojektoprettet: underprojektoprettet,
        underprojektrevision: underprojektrevision,
        underprojektstatus: underprojektstatus,
        geojson: geojson,
        geojsonnodes: geojsonNodes
    };
}


/**********************************************************************
 * POST /api/extension/mapstatus/createroject/
 * 
 *  Opret nyt projekt i  DB. 
 *   Input er skema, navn og beskrivelse.
 *   Id tildeles automatisk af DB
 *   geojson er tom som  udgangspunkt 
  **********************************************************************/
router.post(
    "/api/extension/mapstatus/createproject/", (req, response) => {
        guard(req, response);
        const projekt = req.body;
        const skemaNavn = req.body.skema;
        const {
            skema,
            navn,
            beskrivelse,
            kundeid,
            projektadresse,
            oprettet,
            editeret,
            revision,
            status,
            afdeling,
            bygherrenavn,
            bygherreafdeling,
            bygherreadresse,
            bygherrepostnr,
            projektnavn,
            projektpostnr,
            underprojektediteret,
            underprojektoprettet,
            underprojektrevision,
            underprojektstatus,
            geojson,
            geojsonnodes } = createSqlValues(skemaNavn, projekt);
        // tilføj oprettet dato hvis ikke angivet
        if (!oprettet || oprettet === 'null') {
            const idag = moment().format("YYYY-MM-DD");
            projekt.oprettet = idag;
        }
        const sql = `INSERT INTO ${SCHEMA}.${TABLEDATA} 
          (skema, 
          navn, 
          beskrivelse,
          kundeid, 
          projektadresse,
          oprettet,
          editeret,
          revision,
          status,
          afdeling, 
          bygherrenavn, 
	      bygherreafdeling, 
	      bygherreadresse, 
	      bygherrepostnr,
	      projektnavn, 
	      projektpostnr,
          underprojektediteret,
          underprojektoprettet,
          underprojektrevision,
          underprojektstatus, 
          geojson,
          geojsonnodes  )
          VALUES (
          ${skema}, 
          ${navn}, 
          ${beskrivelse}, 
          ${kundeid},
          ${projektadresse},
          ${oprettet},
          ${editeret},
          ${revision},
          ${status},
          ${afdeling},
          ${bygherrenavn}, 
	      ${bygherreafdeling}, 
	      ${bygherreadresse}, 
	      ${bygherrepostnr},
	      ${projektnavn}, 
	      ${projektpostnr}, 
          ${underprojektediteret},  
          ${underprojektoprettet},
          ${underprojektrevision}, 
          ${underprojektstatus}, 
          ${geojson},
          ${geojsonnodes} )
          RETURNING id`;
        console.log("*** update SQL: " + sql);

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved oprettelse af projekt i database");
            });
    }
);


/**********************************************************************
 * POST /api/extension/mapstatus/getprojecttemplate/:skema
 *
 *  Returnerer en skabelon for et projekt baseret på dets skema.
 *
 **********************************************************************/
router.get(
    "/api/extension/mapstatus/getprojecttemplate/:skema", (req, response) => {
        guard(req, response);
        const skemaNavn = req.params.skema;
        const sql = `SELECT kundeid, beskrivelse, projektadresse,  status, afdeling, bygherrenavn, bygherreafdeling, bygherreadresse, bygherrepostnr, projektpostnr, projektnavn FROM ${SCHEMA}.${TABLEDATA} WHERE skema='${skemaNavn}' ORDER BY id LIMIT 1`;

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    });

/**********************************************************************
 * POST /api/extension/mapstatus/saveproject/:skema
 * 
 *  Opdaterer eksisterende projekt til DB
 *  
 **********************************************************************/

router.post(
    "/api/extension/mapstatus/saveproject/", (req, response) => {
        guard(req, response);
        const projekt = req.body;
        const {
            navn,
            beskrivelse,
            projektadresse,
            editeret,
            oprettet,
            revision,
            status,
            afdeling,
            bygherrenavn,
            bygherreafdeling,
            bygherreadresse,
            bygherrepostnr,
            projektnavn,
            projektpostnr,
            underprojektediteret,
            underprojektoprettet,
            underprojektrevision,
            underprojektstatus} = createSqlValues(projekt.skema, projekt);
        const sql = `UPDATE  ${SCHEMA}.${TABLEDATA} set
           navn=${navn}, 
           beskrivelse=${beskrivelse}, 
           projektadresse=${projektadresse},
           editeret=${editeret},
           oprettet=${oprettet},
           revision=${revision},
           status=${status},
           afdeling=${afdeling},
           bygherrenavn=${bygherrenavn}, 
	       bygherreafdeling=${bygherreafdeling}, 
	       bygherreadresse=${bygherreadresse}, 
	       bygherrepostnr=${bygherrepostnr},
	       projektnavn=${projektnavn}, 
           projektpostnr=${projektpostnr},   
           underprojektediteret=${underprojektediteret},
           underprojektoprettet=${underprojektoprettet},
           underprojektrevision=${underprojektrevision},  
           underprojektstatus=${underprojektstatus} WHERE id = ${projekt.id}`;
        console.log("SQL: " + sql);
        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved projekt opdatering i database");
            });
    }
);
/**********************************************************************
 * POST /api/extension/mapstatus/saveprojectdata/:skema
 * 
 *  Opdaterer eksisterende projekts geojson (ledniger)  og geojsonnodes (brønde) til DB
 *  
 **********************************************************************/

router.post(
    "/api/extension/mapstatus/saveprojectdata/", (req, response) => {
        guard(req, response);
        const projekt = req.body;
        
        const jsonName = projekt.colName;
        
        if (!jsonName) {
            response.status(400).send("Invalid feature name");
            return;
        }   
        const sqlValues = createSqlValues(projekt.skema, projekt);
        const geojsonValue =sqlValues ['geojson'];
        
        if (!geojsonValue) {
            response.status(400).send("Invalid geojson data");
            return;
        }
        const sql = `UPDATE ${SCHEMA}.${TABLEDATA} set ${jsonName}=${geojsonValue} WHERE id = ${projekt.id}`;
        console.log("SQL: " + sql);
        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved projekt opdatering i database");
            });
    }
);


/**********************************************************************
 * POST /api/extension/mapstatus/SetProject/:projektid
 * 
 *  Hent projekt fra DB
 *  
 **********************************************************************/
router.get(
    "/api/extension/mapstatus/GetProject/:projektid", (req, response) => {
        guard(req, response);
        const projektid = req.params.projektid;

        const sql = `SELECT id,kundeid,beskrivelse,navn,projektadresse,oprettet,editeret,revision,status,afdeling,bygherrenavn,bygherreafdeling,bygherreadresse,bygherrepostnr,projektnavn,projektpostnr,underprojektstatus,underprojektediteret,underprojektoprettet, underprojektrevision, geojson, geojsonnodes FROM  ${SCHEMA}.${TABLEDATA} where id=${projektid}`;

        SQLAPI(sql, req)
            .then((result) => {
                response.json(result);
            })
            .catch((err) => {
                console.error("Fejl i SQLAPI:", err);
                response.status(500).send("Fejl ved databaseopslag");
            });
    });

/**********************************************************************
 * POST "/api/extension/mapstatus/buildexcel
 * 
 *  Genererer en Excel-fil for et projekt baseret på dets skema og id.
 *  
 *  
 **********************************************************************/



router.post(
    "/api/extension/mapstatus/buildexcel/", (req, response) => {
        try {
            guard(req, response);
            const projektInfo = req.body;

            if (!projektInfo) {
                console.error("Invalid project information provided");
                return response.status(400).send("Invalid project information provided");
            }

            getExcelFromLambda(projektInfo)
                .then((base64Data) => {
                    const buffer = Buffer.from(base64Data, "base64");

                    response.setHeader('Content-Disposition', `attachment; filename="${projektInfo.filename || 'projekt'}.xlsx"`);
                    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    response.send(buffer);
                })
                .catch((error) => {
                    console.error("Error generating Excel file:", error);
                    response.status(500).send("Error generating Excel file");
                }
                );
        } catch (error) {
            console.error("Fejl ved oprettelse af Excel-fil:", error);
            response.status(500).send("Fejl ved oprettelse af Excel-fil");
        }
    });

async function getExcelFromLambda(projektInfo) {
    const url = config.extensionConfig.mapstatus.excelLambdaUrl;
    const argBody = (typeof projektInfo === 'string') ? projektInfo : JSON.stringify(projektInfo);
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    Accept: "application/json",
                },
                body: argBody,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Lambda request failed: ${response.status} ${errorText}`);
                return reject(`Lambda request failed: ${response.status} ${errorText}`);
            }
            const data = await response.text();
            resolve(data);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = router;