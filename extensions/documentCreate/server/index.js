/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require("express");
//var request = require('then-request');
var request = require("request");
var router = express.Router();
var fs = require("fs");
var moment = require("moment");
var config = require("../../../config/config.js");
var session = require("../../session/server");
const { VERSION } = require("underscore");

var GC2_HOST = config.gc2.host;

// GC2_HOST = (GC2_HOST.split("http://").length > 1 ? GC2_HOST.split("http://")[1] : GC2_HOST);
// Hardcoded host - config has internal name in docker-compose
GC2_HOST = "https://mapgogc2.geopartner.dk";

// Set locale for date/time string
moment.locale("da_DK");

var BACKEND = config.backend;

const DONTPOST = false;
const REQCASETYPEID = 44;
const ADRCASETYPEID = 50;
const ADGADRCASETYPEID = 34;
const SYNCSOURCE = 24;
const OISSYNCSOURCE = 10;
const APPKEY = config.extensionConfig.documentCreate.APPKEY;
const USERKEY = config.extensionConfig.documentCreate.USERKEY;
const USERNAME = config.extensionConfig.documentCreate.USERNAME;
const DN_URI = config.extensionConfig.documentCreate.DN_URI;
const NODETYPECASE = 3;
// status bør være 5, men fejler ved post til DN
const STATUSCODE = 5;

// DUMMY folder, If adress case is not found, this folder will be used
const DUMMYFOLDER = 133935;

// Days from 19000101 to 19700101
const DAYSSINCE = 25569;
// milisecs pr. day
const MILISECSDAY = 86400000;

const APIVERSION = "v2";

/**
 * Endpoint for editing location
 */
router.post(
  "/api/extension/documentCreateEditFeature",
  function (req, response) {
    var APIKey = req.session.gc2ApiKey;
    var db = req.body.db;
    var sql = req.body.sql;

    var getExistinAdrCaseGc2Promise = ReqToGC2(req.session, sql, db);

    //Check for existing cases if so use existing parentid
    getExistinAdrCaseGc2Promise.then(
      function (result) {
        if (result.affected_rows > 0)
          response.status(200).send("Placeringen er opdateret");
        else response.status(500).send("incorrect layer");
      },
      function (err) {
        response.status(500).send("Fejl ved gem placering, " + err);
      }
    );
  }
);

/**
 * Endpoint for getting
 */
router.post(
  "/api/extension/documentCreateSendFeature",
  function (req, response) {
    //inject into db then
    //send the stuff to docunote
    response.setHeader("Content-Type", "application/json");

    //console.log(req.body.features)
    //console.log(req.body.db)

    var session_error_message = "Fejl i session, prøv at logge ind igen.";

    // Guard against no session
    if (!req.session) {
      return response.status(500).send( session_error_message );
    }

    // If there is a session, log who
    console.log('documentCreateSendFeature:', 'Username',req.session.gc2UserName,'ParentDB:',req.session.parentDb,'Expires:', req.session.cookie._expires);

    console.log(req.session)

    // Guard against session with wrong parentdb (vmr)
    if (req.session.parentDb != 'vmr') {
      return response.status(500).send( session_error_message );
    }


    // check if addresscase is already created
    const qrystr =
      "SELECT adrfileid, parenttype FROM " +
      req.body.schema +
      ".adressesager WHERE adresseguid = '" +
      req.body.features[0].properties.adgangsadresseid +
      "'";

    //const qrystr = 'INSERT INTO vmr.adressesager (adrfileid, adresseguid) VALUES (108896,\'0a3f50c1-0523-32b8-e044-0003ba298018\')'
    var getExistinAdrCaseGc2Promise = ReqToGC2(
      req.session,
      qrystr,
      req.body.db
    );

    var dnTitle = oisAddressFormatter(req.body.features[0].properties.adresse);

    //Check for existing cases if so use existing parentid
    getExistinAdrCaseGc2Promise.then(
      function (resultExistingAdrCase) {
        //console.log(resultExistingAdrCase)
        //console.log(resultExistingAdrCase.features)

        // check if addresscase is already created
        if (resultExistingAdrCase.features && resultExistingAdrCase.features.length > 0) {
          console.log('Adressesag eksisterer allerede, bruger eksisterende.')
          // adressesagen er oprettet i DN så skal der bare oprettes henvendelsessager under denne
          //
          // body json for Case
          bodyreq = makeRequestCaseBody(
            req,
            resultExistingAdrCase.features[0].properties.adrfileid,
            REQCASETYPEID,
            dnTitle,
            resultExistingAdrCase.features[0].properties.parenttype
          );

          var postReqCaseToDnPromise = postCaseToDn(bodyreq);
          postReqCaseToDnPromise.then(
            function (result) {
              //console.log(result)
              if ("caseId" in result) {
                //console.log(result)
                //response.send('Sag oprettet i DN')
                req.body.features[0].properties.fileident = result.caseId;
                req.body.features[0].properties.casenumber = result.number;
                var postCaseToGc2Promise = postToGC2(req, req.body.db);
                var resultjson = {
                  message: "Sag oprettet",
                  casenumber: result.number,
                };

                // tilføj part, bruger tidligere partid, hvis det findes
                //partbody = makePartBodyHenvendelse(result.caseId,req.body.features[0].properties.adresseid)
                // brug adgangsadresse hvis parent er adgangsadressesag ellers brug enhedsadress
                //                    if (resultExistingAdrCase.features[0].properties.parentType == 3){

                addPartRequestCase(
                  result.caseId,
                  req.body.features[0].properties.adgangsadresseid
                );

                postCaseToGc2Promise.then(
                  function (result) {
                    //console.log(result)
                    response.status(200).send(resultjson);
                  },
                  function (err) {
                    response.status(500).send("ikke oprettet");
                  }
                );
              } else {
                response.status(500).send(result.message);
              }
            },
            function (err) {
              response.status(500).send("ikke oprettet");
            }
          );
        } else {
          console.log('Adressesag eksisterer ikke, opretter ny.')
          // getparentcase på adgangsadresseid

          // adressesagen findes ikke, den skal oprettes først.
          // getparentcase på adgangsadresseid
          // opret adressesag husk post caseid tilbage til gc2
          // getnodeid på henvendelsesmappen
          // opret henvendelsessagen herunder.
          
          var getParentCaseDnPromise = getParentCaseDnAdgAdr(
            req.body.features[0].properties.adgangsadresseid,
          );


          getParentCaseDnPromise.then(
            function (result) {
              //console.log(result)
              if (!("caseId" in result)) {
                console.log('Adressesag ikke fundet i DN ved syncid, opretter dummy adressesag først.')

              }


              parentid = result.parentId;
              parenttype = result.parentType;
              ejdCaseId = result.caseId;

              //parentIdType = GetParentFolder(ejdCaseId, parentid, parenttype, dnTitle, req.body.features[0].properties.esrnr, req.body.features[0].properties.adresseid);
              var getParentFolderPromise = GetParentFolder(
                ejdCaseId
              );

              getParentFolderPromise.then(function (result) {
                bodyreq = makeRequestCaseBody(
                  req,
                  result.parentid,
                  REQCASETYPEID,
                  dnTitle,
                  result.parenttype
                );
                var insertToGc2Promise = SqlInsertToGC2(
                  req.session,
                  "INSERT INTO " +
                    req.body.schema +
                    ".adressesager (adrfileid, parenttype, adresseguid) VALUES (" +
                    result.parentid +
                    ", " +
                    result.parenttype +
                    ", '" +
                    req.body.features[0].properties.adgangsadresseid +
                    "'" +
                    ")",
                  req.body.db
                );
                // opret adgangsadresseid til brug for seneere opslag.
                insertToGc2Promise.then(
                  function (resultgc2) {
                    //console.log(resultgc2)
                  },
                  function (err) {
                    console.log(err);
                  }
                );
                var postReqCaseToDnPromise = postCaseToDn(bodyreq);
                postReqCaseToDnPromise.then(
                  function (resultpostdn) {
                    if ("caseId" in resultpostdn) {
                      //console.log(resultpostdn)
                      //response.status(200).send('Sag oprettet i DN med journalnummer: ' +result.caseId )
                      req.body.features[0].properties.fileident =
                        resultpostdn.caseId;
                      req.body.features[0].properties.casenumber =
                        resultpostdn.number;
                      var resultjson = {
                        message: "Sag oprettet",
                        casenumber: resultpostdn.number,
                      };

                      // tilføj part
                      //partbody = makePartBodyHenvendelse(result.caseId,req.body.features[0].properties.adresseid)
                      //putPartToCaseDn(partbody,result.caseId)
                      // brug adgangsadresse hvis parent er adgangsadressesag ellers brug enhedsadress
                      
                      addPartRequestCase(
                        resultpostdn.caseId,
                        req.body.features[0].properties.adgangsadresseid
                      );


                      var postCaseToGc2Promise = postToGC2(req, req.body.db);
                      postCaseToGc2Promise.then(
                        function (result) {
                          //console.log(result)
                          response.status(200).send(resultjson);
                        },
                        function (err) {
                          response.status(500).send("ikke oprettet");
                        }
                      );
                    } else {
                      response.status(500).send("Fejl i Docunote, ingen caseId");
                      console.log(resultpostdn);
                    }
                  },
                  function (err) {
                    response.status(500).send("ikke oprettet " + err);
                  }
                );
              });
              // Promise to create case in Docunote
              /*

*/
            },
            function (err) {
              //console.log(err)
              // adressesagen kan ikke findes i Docunote
              console.log("Fejl, adressesagen eksistere ikke i Docunote " + err);
              // opret dummy adressesag
              var adgadrguid = req.body.features[0].properties.adgangsadresseid;
              var adrbody = makeAddressCase(dnTitle, adgadrguid);
              
              var createDummyCasePromise = postCaseToDn(adrbody);
              createDummyCasePromise.then(
                function(resultDummyCase) {
                  console.log('Dummy adressesag oprettet i DN, prøver igen at oprette henvendelsessag under denne.')
                  //Create part to add adressesag
                  // lookup address in dawa
                  var createcontactpromise = createAddressPart(
                    dnTitle,
                    adgadrguid
                  );
                  // post address to DN, in company adress book
                  // then add as part to adressesag
                  createcontactpromise.then(function (adressbody) {
                    
                    var createaddresspromise = postCompanyToDn(adressbody);
                    createaddresspromise.then(function (company) {
                      addPartIdToCase(company.companyId, resultDummyCase.caseId);
                    });
                  });

                  // get folder 'Kunehenvendelser' under this case
                  //parentIdType = GetParentFolder(ejdCaseId, parentid, parenttype, dnTitle, req.body.features[0].properties.esrnr, req.body.features[0].properties.adresseid);
                  var getParentFolderPromise = GetParentFolder(
                    resultDummyCase.caseId
                  );

                  getParentFolderPromise.then(function (result) {
                    bodyreq = makeRequestCaseBody(
                      req,
                      result.parentid,
                      REQCASETYPEID,
                      dnTitle,
                      result.parenttype
                    );

                    // prøv igen med at oprette henvendelsessag under denne
                    // bodyreq = makeRequestCaseBody(
                    //   req,
                    //   resultDummyCase.caseId,
                    //   REQCASETYPEID,
                    //   dnTitle,
                    //   resultDummyCase.nodeType
                    // );
                    var postReqCaseToDnPromise = postCaseToDn(bodyreq);
                    postReqCaseToDnPromise.then(
                      function (resultpostdn) {
                        if ("caseId" in resultpostdn) {
                          //console.log(resultpostdn)
                          //response.status(200).send('Sag oprettet i DN med journalnummer: ' +result.caseId )
                          req.body.features[0].properties.fileident =
                            resultpostdn.caseId;
                          req.body.features[0].properties.casenumber =
                            resultpostdn.number;
                          var resultjson = {
                            message: "Sag oprettet",
                            casenumber: resultpostdn.number,
                          };

                          // tilføj part
                          //partbody = makePartBodyHenvendelse(result.caseId,req.body.features[0].properties.adresseid)
                          //putPartToCaseDn(partbody,result.caseId)
                          // brug adgangsadresse hvis parent er adgangsadressesag ellers brug enhedsadress
                          
                          addPartRequestCase(
                            resultpostdn.caseId,
                            req.body.features[0].properties.adgangsadresseid
                          );

                          var postCaseToGc2Promise = postToGC2(req, req.body.db);
                          postCaseToGc2Promise.then(
                            function (result) {
                              //console.log(result)
                              response.status(200).send(resultjson);
                            },
                            function (err) {
                              response.status(500).send("ikke oprettet");
                            }
                          );
                        
                        } else {
                          response.status(500).send(resultpostdn.message);
                        }
                      },
                      function (err) {
                        response.status(500).send("ikke oprettet");
                      }
                    );

                  });
                  //


                },
                function(err) {
                  console.log("Fejl, ejendomssagen eksistere ikke i Docunote " + err);
                  response
                    .status(500)
                    .send("Fejl, ejendomssagen eksistere ikke i Docunote " + err);
                }
              );

            }
          );
        }

      },
      function (err) {
        response.status(500).send(err);
      }
    );

    //response.send(req.message)
    //return;
  }
);


// find parent folder for the new address case
// resolves to parent id og parent type (either folder or case)
// find folder 'Kundehenvendelser' in parent folder
// adressesag
//   - Kundehenvendelser
//   - Økonomi
// parentid = adgangsadressesag
// parenttype = 3
function GetParentFolder(
  ejdCaseId
) {
  console.log('GetParentFolder:',ejdCaseId);
  return new Promise(function (resolve, reject) {
    var getParentPromise = getFoldersDn(ejdCaseId, NODETYPECASE);

    Promise.all([getParentPromise]).then(function (values) {
      //console.log(values[0])
      parentFolders = values[0];
      var result = { parentid: 0, parenttype: 0 };
      for (i = 0; i < parentFolders.length; i++) {
        if (parentFolders[i].name == "Kundehenvendelser") {
          // folder with same address
          result.parentid = parentFolders[i].nodeId;
          result.parenttype = parentFolders[i].nodeType;
          break;
        }
      }
      // parentfolder found now search for folder kundehenvendelse
      if (result.parentid > 0) {
        // get parts
        resolve(result);
      } else {
        console.log('Adressesag mappe Kundehenvendelser ikke fundet, bruger adgangsadressesag som parent.');
        result.parentid = ejdCaseId;
        result.parenttype = 3;//parenttype;

        resolve(result);

      }
    });
  });
  //    parentFolders = getFoldersDn(parentId,parenttype);
}

function makeDummyAddressCase(dnTitle, adrguid) {
  var bodyaddresscase = {
    title: dnTitle,
    parentId: DUMMYFOLDER,
    parentType: 2,
    typeId: ADGADRCASETYPEID,
    description: "",
    synchronizeSource: OISSYNCSOURCE,
    synchronizeIdentifier: "ois-adr-" + adrguid,
    discardingCode: 0,
    status: 1,
  };

    var postCaseToDnPromise = postCaseToDn(bodyaddresscase);
    postCaseToDnPromise.then(
      function (values) {

          // postReqCaseToDnPromise.then(
          //   function (result) {
          //     //console.log(result)
          //     if ("caseId" in result) {

        // if rejected get case by syncid
        result.parentid = values.caseId;
        result.parenttype = NODETYPECASE;
        resolve(result);
        //Create part to add adressesag
      },
      function (error) {
        //console.log(error)
        if (
          error.Message ==
          "Duplicate SynchronizeSource SynchronizeIdentifier pair"
        ) {
          var getcasepromise = ReqToDn(
            "https://docunoteapi.vmr.dk/api/v1/Cases/synchronizeSource/10/synchronizeId/" +
              "ois-adr-" + adrguid
          );
          getcasepromise.then(function (casebody) {
            result.parentid = casebody.caseId;
            result.parenttype = NODETYPECASE;
            resolve(result);
          });
        }
      }
    );  
  //return body;
}


function createAddressPart(dnTitle, adrguid) {
  return new Promise(function (resolve, reject) {
    var getDawaPromise = GetDawaAddress(adrguid);

    getDawaPromise.then(function (values) {
      var newContact = {
        cvr: "",
        listId: 20,
        synchronizeSource: 10,
        synchronizeIdentifier: adrguid,
        displayName: dnTitle,
        // urlAddress:
        //   "https://webois.lifa.dk/ois/default.aspx?Komnr=" +
        //   parseInt(values.kommune.kode,10) + // trim leading zeros from komkode
        //   "&ejdnr=" +
        //   values.esrejendomsnr,
        customData: {
          row: null,
          oisvejkode: values.vejstykke.kode,
//          oisejendomsnr: values.esrejendomsnr,
          oiskommunenr: values.kommune.kode,
          oismatrikelnummer: values.matrikelnr,
          oisejerlav:
            values.jordstykke.ejerlav.navn +
            " (" +
            values.jordstykke.ejerlav.kode +
            ")",
        },
        account: "",
        emails: [],
        phones: [],
        addresses: [
          {
            typeId: 1,
            street: values.vejstykke.navn + " " + values.husnr,
            region: "",
            zip: values.postnummer.nr,
            city: values.postnummer.navn,
            country: "",
            primary: true,
          },
        ],
      };
      resolve(newContact);
    });
  });
}

// get parts
function getCaseParts(caseid) {
  //    {{url}}Cases/17129/parts
  url = "https://docunoteapi.vmr.dk/api/v1/Cases/" + caseid + "/parts";
  partjson = ReqToDn(url);
  return partjson;
}

function addPartIdToCase(partid, caseId) {
  // get ids for adrguid
  // create partbody
  partbody = makePartBody(caseId, partid);
  // add part to case
  putPartToCaseDn(partbody, caseId);
}


function addPartRequestCase(caseId, adrguid) {
  var getAdrIdPromise = getPartId(adrguid);

  Promise.all([getAdrIdPromise]).then(function (values) {
    //console.log(values)
    partbody = makePartBodyHenvendelse(caseId, values[0].companyId);
    putPartToCaseDn(partbody, caseId);
  }, function (err) {
    console.log(err);
  });
}


function makeAddressCase(title, adgadrguid) {
  var body = {
    title: title,
    parentId: DUMMYFOLDER,
    parentType: 2,
    typeId: ADGADRCASETYPEID,
    description: "",
    synchronizeSource: OISSYNCSOURCE,
    synchronizeIdentifier: "ois-adr-" + adgadrguid,
    discardingCode: 0,
    status: 1,
  };
  return body;
}

function makePartBody(caseId, adrid) {
  var body = [
    {
      pickerName: "Adresse",
      parts: [
        {
          recordId: caseId,
          partNodeType: 17,
          partRecordId: adrid,
        },
      ],
    },
  ];
  return body;
}

function makePartBodyHenvendelse(caseId, adrid) {
  var body = [
    {
      pickerName: "Adresse",
      parts: [
        {
          recordId: caseId,
          partNodeType: 17,
          partRecordId: adrid,
        },
      ],
    },
  ];
  return body;
}

// {{url}}TreeNodes/nodeId/8421/nodeType/2

function makeRequestCaseBody(req, parentid, typeid, title, parentType) {
  var requestdate =
    DAYSSINCE +
    Math.floor(
      Date.parse(req.body.features[0].properties.henvendelsesdato) / MILISECSDAY
    );
  if (req.body.features[0].properties.forsyningstype == "Spildevand") {
    var custdata = {
      forsyningstype: 1,
      vejret: req.body.features[0].properties.vejret,
      haendelsesdato: requestdate,
      tilbagemelding: 2,
    };
  } else {
    var custdata = {
      forsyningstype: 2,
      vejret: req.body.features[0].properties.vejret,
      haendelsesdato: requestdate,
      tilbagemelding: 2,
    };
  }
  var body = {
    title: title,
    parentId: parentid,
    parentType: parentType,
    typeId: typeid,
    description: "Oprettet fra MapCentia",
    synchronizeSource: SYNCSOURCE,
    synchronizeIdentifier: null,
    discardingCode: 0,
    status: STATUSCODE,
    customData: custdata,
  };
  return body;
}

// find ejd. sag
//{{url}}Cases/synchronizeSource/10/synchronizeId/7300008585
// get parent treenode
// {{url}}TreeNodes/nodeId/8426/nodeType/2
// hvis node count = 2 1 adresse

//
function getFoldersDn(caseid, nodetype) {
  var dnoptions = {
    url:
      DN_URI + "/TreeNodes/nodeId/" +
      caseid +
      "/nodeType/" +
      nodetype,
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    },
  };
  console.log('getFoldersDn:', dnoptions);

  return new Promise(function (resolve, reject) {
    request.get(dnoptions, function (err, res, body) {
      if (!err) {
        //console.log(body)
        //postToGC2(req)
        resolve(JSON.parse(body));
      } else {
        //console.log(err)
        reject(err);
      }
    });
  });
}
//https://dawa.aws.dk/adgangsadresser/0a3f5094-ae76-32b8-e044-0003ba298018
function GetDawaAddress(adrguid) {
  var options = {
    url: "https://dawa.aws.dk/adgangsadresser/" + adrguid,
    method: "GET",
  };
  return new Promise(function (resolve, reject) {
    request.get(options, function (err, res, body) {
      if (!err) {
        //return result as JSON;
        resolve(JSON.parse(body));
      } else {
        //console.log(err)
        reject(err);
      }
    });
  });
}

// format address as in lifaois

function oisAddressFormatter(adrString) {
  //console.log("adrString: " + adrString);
  var adrSplit = adrString.split(",");
  var nr = adrSplit[0].match(/\d+/);
  var padnr = new Array(4 - nr[0].length + 1).join("0") + nr[0];
  return adrSplit[0]
    .replace(nr[0], padnr)
    .concat(" [" + adrSplit[1].trim() + "]");
}

function getParentCaseDnESR(esrnr) {
  var dnoptions = {
    url:
      DN_URI + "/Cases/synchronizeSource/10/synchronizeId/" +
      esrnr,
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    },
  };

  console.log('getParentCaseDnESR:', dnoptions);

  return new Promise(function (resolve, reject) {
    request.get(dnoptions, function (err, res, body) {
      if (!err) {
        //console.log(body)
        //postToGC2(req)
        //return body.parentid;
        resolve(JSON.parse(body));
      } else {
        console.log(err);
        reject(err);
      }
    });
  });
}

  
function getParentCaseDnBFE(bfenr) {
  var dnoptions = {
    url:
      DN_URI + "/Cases/synchronizeSource/10/synchronizeId/" +
      bfenr + '-BFE',
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    },
  };

  console.log('getParentCaseDnBFE:', dnoptions);

  return new Promise(function (resolve, reject) {
    request.get(dnoptions, function (err, res, body) {
      if (!err) {
        //console.log(body)
        //postToGC2(req)
        //return body.parentid;
        resolve(JSON.parse(body));
      } else {
        console.log(err);
        reject(err);
      }
    });
  });
}

  
function getParentCaseDnAdgAdr(adgadrguid) {
  var dnoptions = {
    url:
      DN_URI + "/Cases/synchronizeSource/10/synchronizeId/" +
      'ois-adr-' + adgadrguid,
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    },
  };

  console.log('getParentCaseDnAdgAdr:', dnoptions);

  return new Promise(function (resolve, reject) {
    request.get(dnoptions, function (err, res, body) {
      if (!err) {
        //console.log(body)
        //postToGC2(req)
        //return body.parentid;
        var jsonBody = JSON.parse(body);
        if ("ErrorCode" in jsonBody && jsonBody.ErrorCode==404) {
          reject(err);
        } else {
          resolve(jsonBody);
        }
      } else {
        console.log(err);
        reject(err);
      }
    });
  });
}


function getPartId(partsyncid) {
  var options = {
    url:
      DN_URI + "/companies/synchronizeSource/10/synchronizeId/" +
      partsyncid,
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    },
  };
  console.log('getPartId:', options);
  
  // Return new promise
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

// post case to gc2
function postToGC2(req, db) {
  if (req.session.subUser) var userstr = req.session.gc2UserName + "@" + db;
  else {
    var userstr = req.session.gc2UserName;
  }
  var postData = JSON.stringify(req.body),
    options = {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(postData),
        "GC2-API-KEY": req.session.gc2ApiKey,
      },
      uri:
        GC2_HOST +
        "/api/v2/feature/" +
        userstr +
        "/" +
        req.body.schema +
        "." +
        req.body.tablename +
        ".the_geom" +
        "/4326",
      body: postData,
      method: "POST"
    };
  return new Promise(function (resolve, reject) {
    request(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

// Post case to Docunote API
// Returns json
function postCompanyToDn(compbody) {
  var postData = JSON.stringify(compbody),
    options = {
      url: DN_URI + "/Companies",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        applicationKey: APPKEY,
        userKey: USERKEY,
        userName: USERNAME,
      },
      body: postData,
    };
  console.log('postCompanyToDn:', options);

  return new Promise(function (resolve, reject) {
    request(options, function (err, res, body) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        var jsfile = JSON.parse(body);
        if ("errorCode" in jsfile) {
          reject(jsfile);
        } else {
          resolve(jsfile);
        }
      }
    });
  });
}

// Post case to Docunote API
// Returns json
function postCaseToDn(casebody) {
  var postData = JSON.stringify(casebody),
    options = {
      url: DN_URI + "/Cases",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        applicationKey: APPKEY,
        userKey: USERKEY,
        userName: USERNAME,
      },
      body: postData,
    };
  console.log('postCaseToDn:', options);

  if (DONTPOST) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve({ message: "Dont post to DN" });
      }, 2500);
    });
  } else {
    return new Promise(function (resolve, reject) {
      request(options, function (err, res, body) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          var jsfile = JSON.parse(body);
          if ("errorCode" in jsfile) {
            reject(jsfile);
          } else {
            resolve(jsfile);
          }
        }
      });
    });
  }
}

function putPartToCaseDn(partbody, caseId) {
  var postData = JSON.stringify(partbody),
    options = {
      url: DN_URI + "/Cases/" + caseId + "/pickers",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        applicationKey: APPKEY,
        userKey: USERKEY,
        userName: USERNAME,
      },
      body: postData,
    };
  console.log('putPartToCaseDn:', options);

  if (DONTPOST) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve({ message: "Dont post to DN" });
      }, 2500);
    });
  } else {
    return new Promise(function (resolve, reject) {
      request(options, function (err, res, body) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          var jsfile = JSON.parse(body);
          if ("errorCode" in jsfile) {
            reject(jsfile);
          } else {
            resolve(jsfile);
          }
        }
      });
    });
  }
}

function ReqToDn(requrl) {
  var options = {
    url: requrl,
    method: "GET",
    headers: {
      applicationKey: APPKEY,
      userKey: USERKEY,
      userName: USERNAME,
    }
  };
  console.log('ReqToDn:', options);
  // Return new promise
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        // handle when body is empty 
        if (typeof body === "string" && body.trim().length === 0){
          body = "{}";
        }
        resolve(JSON.parse(body)); 
      }
    });
  });
}

function ReqToGC2(session, requrl, db) {
  if (session.subUser) var userstr = session.screenName + "@" + db;
  else {
    var userstr = session.gc2UserName;
  }

  var options = {
    url:
      GC2_HOST +
      "/api/" +
      APIVERSION +
      "/sql/" +
      userstr +
      "?q=" +
      requrl +
      "&key=" +
      session.gc2ApiKey,
    headers: {
      "GC2-API-KEY": session.gc2ApiKey,
    },
  };
  console.log(requrl);
  // Return new promise
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        var result = JSON.parse(body);
        // console.log(result);
        resolve(result);
      }
    });
  });
}

function SqlInsertToGC2(session, requrl, db) {
  if (session.subUser) var userstr = session.screenName + "@" + db;
  else {
    var userstr = session.gc2UserName;
  }
  var options = {
    url:
      GC2_HOST +
      "/api/" +
      APIVERSION +
      "/sql/" +
      userstr +
      "?q=" +
      requrl +
      "&key=" +
      session.gc2ApiKey,
    headers: {
      "GC2-API-KEY": session.gc2ApiKey,
    },
  };
  console.log(requrl);
  // Return new promise
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        //console.log(resp)
        resolve(JSON.parse(body));
      }
    });
  });
}

/**
 * 
 * Body JSON til post create case
 * parentType 4 = Kundehenvendelser
 * ParentID = ejendomssag
 * typeId = 44 Henvendelsessag
 * 
 * {
    "title": "test PDK geopartner",
    "parentId": 181512,
    "parentType": 4,
    "typeId": 44,
    "description": "test PDK",
    "synchronizeSource": 1,
    "synchronizeIdentifier": null,
    "discardingCode": 0,
    "status": 1
}

response body
{
    "caseId": 108108,
    "title": "test PDK geopartner",
    "number": "S19-7484",
    "parentId": 181512,
    "parentType": 4,
    "typeId": 44,
    "created": "2019-08-28T12:05:25.063",
    "createdBy": 160,
    "createdByDisplayName": "RESTapi Kortintegration",
    "lastEdited": "2019-08-28T12:05:25.063",
    "lastEditedBy": 160,
    "lastEditedByDisplayName": "RESTapi Kortintegration",
    "description": "test PDK",
    "synchronizeSource": 1,
    "synchronizeIdentifier": "",
    "customData": {},
    "status": 1,
    "discardingCode": 0,
    "locked": false
}
 
    */

module.exports = router;
