/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2020- Geoparntner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

import proj4 from "proj4";
import ProjectModel from "./ProjectModel.js";
import ProjectComponent from "./ProjectComponent.js";
import ProjectListComponent from "./ProjectListComponent.js";
import VentilListComponent  from "./VentilListComponent.js";
import {VentilModel, VentilProperties } from "./VentilModel.js";

import {
  buffer as turfBuffer,
  point as turfPoint,
  flatten as turfFlatten,
  union as turfUnion,
  booleanPointInPolygon,
  featureCollection as turfFeatureCollection,
  applyFilter,
} from "@turf/turf";
import _ from "underscore";

var React = require("react");

const blueIdeaRef = React.createRef();

/**
 *
 * @type {*|exports|module.exports}
 */
var cloud;

/**
 *
 * @type {*|exports|module.exports}
 */
var utils;

/**
 *
 * @type {*|exports|module.exports}
 */
var backboneEvents;

/**
 *
 * @type {*|exports|module.exports}
 */
var layerTree = require("./../../../browser/modules/layerTree");

/**
 *
 * @type {*|exports|module.exports}
 */
var layers = require("./../../../browser/modules/layers");

/**
 *
 * @type {*|exports|module.exports}
 */
var switchLayer = require("./../../../browser/modules/switchLayer");

/**
 *
 * @type {string}
 */
var exId = "blueidea";
var exBufferDistance = 0.1;

/**
 *
 */
var mapObj;
var config = require("../../../config/config.js");

/**
 * Draw module
 */
var draw;
var cloud;

var bufferItems = new L.FeatureGroup();
var queryMatrs = new L.FeatureGroup();
var queryVentils = new L.FeatureGroup();
var selectedPoint = new L.FeatureGroup();
var seletedLedninger = new L.FeatureGroup();
var selectedIndirekteLedninger = new L.FeatureGroup();
var selectedForbrugspunkter = new L.FeatureGroup();
var alarmPositions = new L.FeatureGroup();

var _clearBuffer = function () {
  bufferItems.clearLayers();
};
var _clearMatrs = function () {
  queryMatrs.clearLayers();
};
var _clearVentil = function () {
  queryVentils.clearLayers();
};
var _clearSelectedPoint = function () {
  selectedPoint.clearLayers();
};
var _clearSeletedLedninger = function () {
  seletedLedninger.clearLayers();
};
var _clearSelectedIndirekteLedninger = function () {
  selectedIndirekteLedninger.clearLayers();
};
var _clearAlarmPositions = function () {
  alarmPositions.clearLayers();
};
var _clearSelectedForbrugspunkter = function () {
  selectedForbrugspunkter.clearLayers();
};

var _clearAll = function () {
  _clearBuffer();
  _clearMatrs();
  _clearVentil();
  _clearSelectedPoint();
  _clearSeletedLedninger();
  _clearAlarmPositions();
  _clearSelectedIndirekteLedninger();
  _clearSelectedForbrugspunkter();
};

const MAXPARCELS = 250;


const resetObj = {
  authed: false,
  user_id: null,
  user_lukkeliste: false,
  user_blueidea: false,
  user_db: false,
  user_ventil_layer: null,
  user_udpeg_layer: null,
  user_ventil_layer_key: null,
  user_ventil_export: null,
  selected_profileid: null,
  user_alarmkabel: false,
  user_alarmkabel_distance: 0,
  user_alarmkabel_art: null,
};

// This element contains the styling for the module
var styleObject = require("./style.js");

/**
 * async function to query matrikel inside a single buffer
 * @param {*} feature
 */
const findMatriklerInPolygon = function (feature, is_wkb = false) {
  return new Promise((resolve, reject) => {
    // Create a query
    let query = {
      srid: 4326,
      format: "geojson",
      struktur: "flad",
    };

    try {
      if (!is_wkb) {
        query.polygon = JSON.stringify(feature.geometry.coordinates)

      // Send the query to the server
      $.ajax({
        url: "/api/datahub/jordstykker",
        type: "GET",
        data: query,
        success: function (data) {
          resolve(data);
        },
        error: function (data) {
          reject(data);
        },
      });

      } else {
        query.wkb = feature;

        // Send the query to the server, but using post - as the wkb is too large for a get request
        $.ajax({
          url: "/api/datahub/jordstykker",
          type: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify(query),
          success: function (data) {
            resolve(data);
          },
          error: function (data) {
            reject(data);
          },
        });
      }
    } catch (error) {
      throw error;
    }
  });
};

/**
 * async function to query addresses inside a single parcel
 * @param {*} feature
 */
const findAddressesInMatrikel = async function (feature) {
  try {
    // Create a query
    let query = {
      ejerlavkode: feature.properties.ejerlavkode,
      matrikelnr: feature.properties.matrikelnr,
      struktur: "flad",
    };

    // Send the query to the server
    let response = await $.ajax({
      url: "https://api.dataforsyningen.dk/adresser",
      type: "GET",
      data: query,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 *
 * @type {{set: module.exports.set, init: module.exports.init}}
 */

module.exports = {
  /**
   *
   * @param o
   * @returns {exports}
   */
  set: function (o) {
    cloud = o.cloud;
    utils = o.utils;
    meta = o.meta;
    draw = o.draw;
    layerTree = o.layerTree;
    switchLayer = o.switchLayer;
    layers = o.layers;
    socketId = o.socketId;
    transformPoint = o.transformPoint;
    backboneEvents = o.backboneEvents;
    return this;
  },

  /**
   *
   */
  init: function () {
    var parentThis = this;

    // Set up draw module for blueIdea

    // We inject the buttons and callbacks here
    let draw_selector = "#draw-content > div.d-flex.justify-content-around.mb-3"

    // add the buttons
    $(draw_selector).append(`
      <div id="_draw_blueidea_group" class="" role="group">
        <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        BlueIdea
        </button>
        <ul class="dropdown-menu" aria-labelledby="_draw_blueidea_group">
        <li><a class="dropdown-item" href="javascript:void(0)" id="_draw_make_blueidea_with_selected">Send selected to Blueidea</a></li>
        <li><a class="dropdown-item" href="javascript:void(0)" id="_draw_make_blueidea_with_all">Send alle til Blueidea</a></li>
        </ul>
      </div>
    `);

    // Define events

    /*
     * This function queries the blueidea API with the selected drawings
     * @param {*} _vidi_id of the selected drawing
     */

    const makeBlueIdeaWithSelected = function (drawing) {
      // get geojson from selected drawings
      var geojson = {
        type: "FeatureCollection",
        features: [],
      };

      // for each layer in drawnItems, get geojson
      let drawnItems = draw.getDrawItems();

      for (const layer of drawnItems.getLayers()) {
        if (layer._vidi_id === drawing) {
          geojson.features.push(layer.toGeoJSON(GEOJSON_PRECISION));
        }
      };

      // if no features, return
      if (geojson.features.length == 0) {
        return;
      } else {
        showBlueIdea();
        setTimeout(() =>
          blueIdeaRef.current.queryAddresses(geojson), 200
        );
      }
    };

    const makeBlueIdeaWithAll = function() {
      // get geojson from all drawings
      var geojson = {
        type: "FeatureCollection",
        features: [],
      };
      // for each layer in drawnItems, get geojson
      let drawnItems = draw.getDrawItems();
      drawnItems.eachLayer(function (layer) {
          geojson.features.push(layer.toGeoJSON(GEOJSON_PRECISION));
      });

      // if no features, return
      if (geojson.features.length == 0) {
        return;
      } else {
        showBlueIdea();
        setTimeout(() =>
          blueIdeaRef.current.queryAddresses(geojson), 200
        );
      }
    };

    const showBlueIdea = function() {
      const e = document.querySelector('#main-tabs a[href="#blueidea-content"]');
      if (e) {
          bootstrap.Tab.getInstance(e).show();
          e.click();
      } else {
          console.warn(`Unable to locate #blueidea-content`)
      }
    }

    // add the event listeners
    $("#_draw_make_blueidea_with_selected").on("click", function() {
      let drawing = draw.getSelectedDrawing();
      if (!drawing) {
        alert("Vælg en tegning");
        return;
      }
      makeBlueIdeaWithSelected(drawing);
    });

    $("#_draw_make_blueidea_with_all").on("click", function() {
      makeBlueIdeaWithAll();
    });


    /**
     *
     * Native Leaflet object
     */
    mapObj = cloud.get().map;
    mapObj.addLayer(bufferItems);
    mapObj.addLayer(queryMatrs);
    mapObj.addLayer(queryVentils);
    mapObj.addLayer(selectedPoint);
    mapObj.addLayer(seletedLedninger);
    mapObj.addLayer(alarmPositions);
    mapObj.addLayer(selectedIndirekteLedninger);
    mapObj.addLayer(selectedForbrugspunkter);

    /**
     *
     */
    var React = require("react");

    /**
     *
     */
    var ReactDOM = require("react-dom");

    /**
     *
     * @type {*|exports|module.exports}
     */
    var dict = require("./i18n.js");

    /**
     *
     * @param txt
     * @returns {*}
     * @private
     */
    var __ = function (txt) {
      // Hack for locale not found?!
      //console.debug(window._vidiLocale);
      //console.debug(txt);

      if (dict[txt][window._vidiLocale]) {
        return dict[txt][window._vidiLocale];
      } else {
        return txt;
      }
    };


    var blocked = true;

    /**
     *
     */
    class BlueIdea extends React.Component {
      static get Aktive_brud_layeName() {  return 'lukkeliste.aktive_brud'}
      
      constructor(props) {
        super(props)
        
        this.state = {
          active: false,
          authed: false,
          project: new ProjectModel(),
          editProject: false,
          projects: [],
          done: false,
          loading: false,
          results_adresser: {},
          results_ledninger: [],
          results_matrikler: [],
          results_ventiler: [],
          results_log: {},
          user_lukkeliste: null,
          user_blueidea: null,
          user_id: null,
          user_profileid: null,
          user_db: false,
          user_ventil_layer: null,
          user_ventil_layer_key: null,
          user_udpeg_layer: null,
          user_ventil_export: null,
          edit_matr: false,
          user_alarmkabel: null,
          user_alarmkabel_distance: config.extensionConfig.blueidea.alarmkabel_distance || 100,
          user_alarmkabel_art: config.extensionConfig.blueidea.alarmkabel_art || null,
          selected_profileid: '',
          lukkeliste_ready: false,
          TooManyFeatures: false,
          alarm_direction_selected: 'Both',
          alarm_skab_selected: '',
          alarm_skabe: null,
          results_alarmskabe: [],
          // forsyningsarter: [],
          //forsyningsart_selected: 0, // todo
          layersOnStart: [],
          retryIsDisabled: true,
          selectedVentiler: [],
          clickedTableVentil: ''
        };

        // Store bound event handlers as class properties to maintain consistent function references
        this.boundSelectPointLukkeliste = this.selectPointLukkeliste.bind(this);
        this.boundHandleEditClick = this.handleEditClick.bind(this);
        this.boundHandleAlarmkabelClick = this.handleAlarmkabelClick.bind(this);
        this.boundHandleAlarmskabClick = this.handleAlarmskabClick.bind(this);
      }

      /**
       * Handle activation on mount
       */
      componentDidMount() {
        let me = this;
        me.turnOnLayer(BlueIdea.Aktive_brud_layeName);
        // Stop listening to any events, deactivate controls, but
        // keep effects of the module until they are deleted manually or reset:all is emitted
        backboneEvents.get().on("deactivate:all", () => {});

        // Activates module
        backboneEvents.get().on(`on:${exId}`, () => {
          //console.debug("Starting blueidea");
          me.setState({
            active: true,
            edit_matr: false,
          });

          // if logged in, get user
          if (me.state.authed) {

            // turn on layersOnStart
            if (me.state.layersOnStart.length > 0) {
              me.state.layersOnStart.forEach((layer) => {
                api.turnOn(layer);
              });
            }
            this.listProjects(false);
            return this.getUser();
          } else {
            me.setState(resetObj);
          }
        });
        
        backboneEvents.get().on(`${exId}:disableRecalculate`, () => {
            me.setState({retryIsDisabled: true})
            me.setState({project: me.state.project.withChanges({isReadOnly: false })});
        });

        backboneEvents.get().on(`${exId}:enableRecalculate`, () => {
            me.setState({retryIsDisabled: false})
            me.setState({project: me.state.project.withChanges({isReadOnly: true})});
        });

        backboneEvents.get().on(`${exId}:listProject`, () => {
            me.listProjects(true);
        });


        // Deactivates module
        backboneEvents.get().on(`off:${exId} reset:all`, () => {
          console.debug("Stopping blueidea");

          // remove layersOnStart
          if (me.state.layersOnStart.length > 0) {
            me.state.layersOnStart.forEach((layer) => {
              api.turnOff(layer);
            });
          }

          // Make sure to remove bound click event listeners from map
          cloud.get().map.off("click", me.boundSelectPointLukkeliste);
          cloud.get().map.off("click", me.boundHandleEditClick);
          cloud.get().map.off("click", me.boundHandleAlarmkabelClick);
          cloud.get().map.off("click", me.boundHandleAlarmskabClick);

          // Reset cursor style
          utils.cursorStyle().reset();

          // remove udpeg_layer
          if (me.state.user_udpeg_layer) {
            api.turnOff(me.state.user_udpeg_layer);
          }

          _clearAll();
          blocked = true;
          me.setState({
            active: false,
            user_lukkeliste: false,
            edit_matr: false,
          });
          me.state.project.clearData();
        });

        // On auth change, handle Auth state
        backboneEvents.get().on(`session:authChange`, () => {
          //console.debug("Auth changed!");
          fetch("/api/session/status")
            .then((r) => r.json())
            .then((obj) => {
              return me.setState({
                authed: obj.status.authenticated,
              });
            })
            .then(() => {
              // if logged in, get user
              if (me.state.authed) {
                return this.getUser();
              } else {
                me.setState(resetObj);
              }
            })
            .catch((e) => {
              //console.debug("Error in session:authChange", e);
              me.setState(resetObj);
            })
            .finally(() => {
              // If logged in, and user_id is not null, show buttons
              if (me.state.authed && me.state.user_id) {
                // If user has blueidea, show buttons
                if (me.state.user_blueidea == true) {
                  $("#_draw_blueidea_group").show();
                } else {
                  $("#_draw_blueidea_group").hide();
                }
                // TODO: Disabled for now, but lists templates
                //this.getTemplates();
              } else {
                // If not logged in, hide buttons
                $("#_draw_blueidea_group").hide();
              }
            });
        });
      }

      /**
       * Get templates from backend
       * @returns {Promise<void>}
       * @private
       */
      getTemplates() {
        let me = this;

        // guard against no projectid in state
        if (!me.state.user_profileid) {
          return;
        }

        fetch(
          "/api/extension/blueidea/" +
            config.extensionConfig.blueidea.userid +
            "/GetSmSTemplates"
        )
          .then((r) => r.json())
          .then((obj) => {
            //console.debug("Got templates", obj);
          })
          .catch((e) => {
            //console.debug("Error in getTemplates", e);
          });
      }

      /**
       * Get select options from alarmskabe
       */
      createAlarmskabeOptions(list) {
        // This function parses the geojson list of alarmskabe from state, into a select option lis
        let me = this;
        let options = [];
        if (list) {
          for (let i = 0; i < list.length; i++) {
            let feature = list[i];
            let option = {
              value: feature.properties.value,
              label: feature.properties.text,
            };

            options.push(option);
          }
        }
        return options;
      }

      /**
       * Get user from backend
       * @returns {Promise<void>}
       * @private
       */
      getUser() {
        let me = this;
        // If user is set in extensionconfig, set it in state and get information from backend
        if (config.extensionConfig.blueidea.userid) {
          return new Promise(function (resolve, reject) {
            $.ajax({
              url:
                "/api/extension/blueidea/" +
                config.extensionConfig.blueidea.userid,
              type: "GET",
              success: function (data) {
                console.log("[Lukkeliste] Got user", data);

                // If data.profileid has values, set the first key as the selected
                let userProfiles = [];
                if (data.profileid) {
                  userProfiles = Object.keys(data.profileid);
                }

                let alarmskabe = [];
                let alarm_skab_selected = '';
                if (data.alarmskabe) {
                  alarmskabe = me.createAlarmskabeOptions(data.alarmskabe);
                  alarm_skab_selected = alarmskabe[0].value || '';
                }

                let lukkestatus = false;
                if (data.lukkestatus && data.lukkestatus.views_exists) {
                  lukkestatus = data.lukkestatus.views_exists;
                }
                me.setState(prev => ({ 
                    project: prev.project.withChanges({forsyningsarter: data.forsyningsarter})
                }));

                me.setState(  {
                  user_lukkeliste: data.lukkeliste,
                  user_blueidea: data.blueidea,
                  user_id: config.extensionConfig.blueidea.userid,
                  user_profileid: data.profileid || null,
                  user_db: data.db || false,
                  selected_profileid: userProfiles[0] || '',
                  user_alarmkabel: data.alarmkabel,
                  alarm_skabe: alarmskabe,
                  alarm_skab_selected: alarm_skab_selected,
                  lukkeliste_ready: lukkestatus,
                  forsyningsart_selected: 0,
                  user_udpeg_layer: data.forsyningsarter[0]?.udpeg_layer || null,
                  user_ventil_layer: data.forsyningsarter[0]?.ventil_layer || null,
                  user_ventil_layer_key: data.forsyningsarter[0]?.ventil_layer_key || null,
                  user_ventil_layer_name_key: data.forsyningsarter[0]?.ventil_layer_name_key || null,
                  user_ventil_export: data.forsyningsarter[0]?.ventil_export || null,
                  layersOnStart: data.layersOnStart || []
                });

                
                resolve(data);
              },
              error: function (e) {
                //console.debug("Error in getUser", e);
                reject(e);
              },
            });
          });
        } else {
          return;
        }
      }

      /**
       * This function queries database for related matrikler and ventiler
       * @returns uuid string representing the query
       */
      queryPointLukkeliste = async (point, ignoreList = []) => {
        let me = this;

        // Clear results
        _clearAll();

        me.setState({
          results_adresser: {},
          results_log: {},
          results_matrikler: [],
          edit_matr: false,
          TooManyFeatures: false,
          selectedVentiler: [],
          beregnuuid: null,
          clickedTableVentil: ''
        });

        let body = point;
        body.forsynings_id = me.state.project.forsyningsart_selected; // We use the order fra config to define the numbering
        body.ignore_ventiler = ignoreList;
        body.gyldig_fra = me.state.project.projectStartDate;
        body.beregnaarsag = me.state.project.brudtype;
        body.gyldig_til = me.state.project.projectEndDate;
        body.sagstekst = me.state.project?.projectName.trim() ?? '';
        try {
          let response = await $.ajax({
            url: "/api/extension/lukkeliste/" + me.state.user_id + "/query",
            type: "POST",
            data: JSON.stringify(body),
            contentType: "application/json",
          });
          return response;
        } catch (error) {
          throw error.responseJSON;
        }
      };

      /**
       * This function queries database for information related to alarmkabel
       * @returns uuid string representing the query
       */
      queryPointAlarmkabel = (point, forsyningsart, distance, direction) => {
        let me = this;
        let body = point;
        body.distance = distance;  //append distance to body
        body.direction = direction; //append direction to body
        body.forsyningsart = forsyningsart; //append forsyningsart to body

        return new Promise(function (resolve, reject) {
          $.ajax({
            url: "/api/extension/alarmkabel/" + me.state.user_id + "/query",
            type: "POST",
            data: JSON.stringify(body),
            contentType: "application/json",
            success: function (data) {
              resolve(data);
            },
            error: function (e) {
              reject(e);
            },
          });
        });
      }

            /**
       * This function queries database for information related to alarmkabel
       * @returns uuid string representing the query
       */
      queryPointAlarmskab = (point, direction, alarmskab_gid) => {
        let me = this;
        let body = point;
        body.direction = direction;  //append distance to body
        body.alarmskab = alarmskab_gid; //append alarmskab to body

        return new Promise(function (resolve, reject) {
          $.ajax({
            url: "/api/extension/alarmskab/" + me.state.user_id + "/query",
            type: "POST",
            data: JSON.stringify(body),
            contentType: "application/json",
            success: function (data) {
              resolve(data);
            },
            error: function (e) {
              reject(e);
            },
          });
        });
      }

      refreshProjectLayer() {
        api.turnOff (BlueIdea.Aktive_brud_layeName);
        console.log("Refreshing project layer off");
        setTimeout(function () {
          api.turnOn(BlueIdea.Aktive_brud_layeName);
          console.log("Refreshing project layer on" );
        }, 500);
      }

      listProjects = (refresh = false) => {
        let me = this;
        me.getActiveAndFutureBreakage()
         .then((data) => {
              me.setState({
                  projects: data.features
                });
            return
          })
          .then(() => { {
            if (refresh)
              this.refreshProjectLayer();
            }
          })
          .catch((error) => {
            me.createSnack(__("Error in list") + ": " + error);
            console.warn(error);
            return
          });
      }
      /**
       * This function gets active and future breakage
       * @returns geojson with breakages
       */

      getActiveAndFutureBreakage = () => {
        let me = this;
        return new Promise(function (resolve, reject) {
          $.ajax({
            url: "/api/extension/blueidea/" + me.state.user_id + "/activebreakages",
            type: "GET",
            success: function (data) {
              resolve(data);
            },
            error: function (e) {
              reject(e);
            },
          });
        });
      }

      /**
       * This function is what starts the process of finding relevant addresses, returns array with kvhx
       * @param {*} geojson
       * @returns array with kvhx
       */
      queryAddresses(geojson, is_wkb = false) {
        let me = this;
        //console.debug("queryAddresses: ", geojson);

        // if no features in featurecollection, return
        if (!geojson.features.length) {
          console.log("No features in geojson");
          return;
        }

        try {
          let promises = [];
          // if the geometry is not wkb, act as if it is geojson
          if (!is_wkb) {
            // Disolve geometry
            let geom = this.geometryDisolver(geojson);

            // show buffers on map
            this.addBufferToMap(geom);

            // Let user know we are starting
            me.createSnack(__("Waiting to start"), true);

            // For each flattened element, start a query for matrikels intersected
            for (let i = 0; i < geom.features.length; i++) {
              let feature = geom.features[i];
              promises.push(findMatriklerInPolygon(feature));
            }

          } else {
            // if the geometry is wkb, we pass the geometry directly to the query
            //console.debug("WKB", geojson);
            let aggr = geojson.features[0].properties.aggregated_geom;
            promises.push(findMatriklerInPolygon(aggr, true));
          }

          // When all queries are done, we can find the relevant addresses
          Promise.all(promises)
            .then((results) => {
              //console.debug("Got matrikler", results);
              // Merge all results into one array
              let merged = this.mergeMatrikler(results);

              // if the number of matrs is larger than maxparcels, dont add to map
              if (merged.features.length < MAXPARCELS) {
                this.addMatrsToMap(merged);
              } else {
                me.createSnack(__("Large number of parcels found"));
              }

              return merged;
            })
            .then((matrikler) => {
              // if the number is too high, dont get addresses aswell.
              if (matrikler.features.length > MAXPARCELS) {
                me.setState({
                  edit_matr: false,
                  TooManyFeatures: true,
                });
                me.setState({
                  results_matrikler: matrikler,
                });
                return;

              } else {
                // Set results
                me.setState({
                  results_adresser: me.getAdresser(matrikler),
                  results_matrikler: matrikler,
                  edit_matr: false,
                });
                return;
              }
            })
            .catch((error) => {
              console.warn('findMatriklerInPolygon:', error);
              me.createSnack(__("Error in search"));
              throw error;
            });
        } catch (error) {
          console.warn('queryAddresses:', error);
          me.createSnack(error);
          return;
        }
      }

      /**
       * This function disolves the geometry, and prepares it for querying
       */
      geometryDisolver(geojson) {
        // we need to wrap the geometry in a featurecollection, so we can use turf
        let collection = {
          type: "FeatureCollection",
          features: [],
        };

        // loop through all features, buffer them, and add them to the collection
        for (let i = 0; i < geojson.features.length; i++) {
          let feature = geojson.features[i];

          // If the type is not set, force it to be a Feature
          if (!feature.type) {
            feature.type = "Feature";
          }

          try {
            // If the feature as a radius property, use that as the buffer distance (points and markers)
            let buffered;
            if (
              feature.properties.distance &&
              feature.geometry.type == "Point" &&
              feature.properties.type == "circle"
            ) {
              try {
                let parsedRadii = feature.properties.distance.split(" ")[0];
                buffered = turfBuffer(feature, parsedRadii, {
                  units: "meters",
                });
              } catch (error) {
                console.warn(error, feature);
              }
            } else {
              buffered = turfBuffer(feature, exBufferDistance, {
                units: "meters",
              });
            }

            collection.features.push(buffered);
          } catch (error) {
            console.warn(error, feature);
          }
        }

        // return geometry for querying
        return collection;
      }

      /**
       * Merges all matrikler into one featurecollection
       * @param {*} results
       */
      mergeMatrikler(results) {
        let me = this;
        let merged = {};

        try {
          for (let i = 0; i < results.length; i++) {
            // Guard against empty results, and results that are not featureCollections
            if (
              results[i] &&
              results[i].type == "FeatureCollection" &&
              results[i].features.length > 0
            ) {
              for (let j = 0; j < results[i].features.length; j++) {
                // If the matrikel is a litra - starts with 7000, ignore it in the list
                if (
                  results[i].features[j].properties.matrikelnr.startsWith(
                    "7000"
                  )
                ) {
                  continue;
                }

                // If the matikel has a registreretarel that is equal to vejareal, ignore it in the list
                if (
                  results[i].features[j].properties.registreretareal ==
                  results[i].features[j].properties.vejareal
                ) {
                  continue;
                }

                let feature = results[i].features[j];
                merged[feature.properties.featureid] = feature;
              }
            }
          }
          let newCollection = turfFeatureCollection(Object.values(merged));
          return newCollection;
        } catch (error) {
          console.warn(error);
        }
      }

      /**
       * Merges all adresser into one array
       * @param {*} results
       */
      mergeAdresser(results) {
        let me = this;
        try {
          // Merge all results into one array, keeping only kvhx
          let merged = {};
          for (let i = 0; i < results.length; i++) {
            // for each adresse in list, check if it is a kvhx, and add it to the merged list
            for (let j = 0; j < results[i].length; j++) {
              let feature = results[i][j];
              if (feature.kvhx) {
                merged[feature.kvhx] = feature;
              }
            }
          }
          return merged;
        } catch (error) {
          console.warn(error);
          return [];
        }
      }
      /**
       * Styles and adds the buffer to the map (from the geometryDisolver)
       */
      addBufferToMap(geojson) {
        try {
          var l = L.geoJSON(geojson, {...styleObject.buffer,interactive: false}).addTo(bufferItems);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Styles and adds the matrikler to the map
       */
      addMatrsToMap(geojson) {
        try {
          // Make a layer per feature.
          geojson.features.forEach((feature) => {
            let l = L.geoJSON(feature, {...styleObject.matrikel, interactive: false}).addTo(queryMatrs);
          });
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Styles and adds ventiler to the map
       */
      addVentilerToMap(geojson) {
        try {
          var l = L.geoJSON(geojson, {
            pointToLayer: function (feature, latlng) {
              // //console.debug(feature.properties, latlng);
              // if the feature has a forbundet property, use a different icon
              if (feature.properties.forbundet) {
                // //console.debug(feature.properties, latlng);
                return L.circleMarker(latlng, {...styleObject.ventil_forbundet, interactive: false});
              }
              // else, use the default icon
              return L.circleMarker(latlng, {...styleObject.ventil, interactive: false});
            },
          }).addTo(queryVentils);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Styles and adds ledninger to the map
       */
      addSelectedLedningerToMap(geojson) {
        try {
          var l = L.geoJSON(geojson, {...styleObject.selectedLedning, interactive: false}).addTo(seletedLedninger);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      addSelectedIndirekteLedningerToMap(geojson) {
        try {
          var l = L.geoJSON(geojson, {...styleObject.selectedIndirekteLedning, interactive: false}).addTo(selectedIndirekteLedninger);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Styles and adds the selected point to the map
       */
      addSelectedPointToMap(geojson) {
        try {
          var myIcon = new L.DivIcon(styleObject.selectedPoint);
          var l = L.geoJSON(geojson, {
            pointToLayer: function (feature, latlng) {
              return new L.Marker(latlng, { icon: myIcon, interactive: false });
            },
          }).addTo(selectedPoint);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      addSelectedForbrugspunkterToMap(geojson) {
        try {
          var myIcon = new L.DivIcon(styleObject.selectedForbrugspunkt);
          var l = L.geoJSON(geojson, {
            pointToLayer: function (feature, latlng) {
              return new L.Marker(latlng, { icon: myIcon, interactive: false });

            },
          }).addTo(selectedForbrugspunkter);

        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Styles and adds the alarm positions to the map
       */
      addAlarmPositionToMap(geojson) {
        try {
          var myIcon = new L.DivIcon(styleObject.alarmPosition);
          var l = L.geoJSON(geojson, {
            pointToLayer: function (feature, latlng) {
              return new L.Marker(latlng, { icon: myIcon, interactive: false });
            },
          }).addTo(alarmPositions);
        } catch (error) {
          console.warn(error, geojson);
        }
      }

      /**
       * Creates a new snackbar
       * @param {*} text
       */
      createSnack(text, loading = false) {
        let html = "";
        // if loading is true, show a loading spinner in the snackbar
        if (loading) {
          html = "<span class='spinner-border spinner-border-sm'></span><span id='blueidea-progress'> " + text + "</span>";
        } else {
          html = "<span id='blueidea-progress'>" + text + "</span>"
        }

        utils.showInfoToast(html, { timeout: 5000, autohide: false})
      }


      /**
       * Simulates a click on the login button
       */
      clickLogin() {
        document.querySelector('[data-bs-target="#login-modal"]').click();
      }

      /**
       * Sends user to draw tab
       */
      clickDraw() {
        _clearAll();
        const e = document.querySelector('#main-tabs a[href="#draw-content"]');
        if (e) {
            bootstrap.Tab.getInstance(e).show();
            e.click();
        } else {
            console.warn(`Unable to locate #draw-content`)
        }
      }

      /**
       * This function builds relevant data for the blueidea API
       * @returns SmsGroupId for redirecting to the correct page
       */
      sendToBlueIdea = () => {
       // hvis blueidea er false, return
        if (!this.state.user_blueidea) {
          this.createSnack(__("NotAllowedBlueIdea"));
          return;
        }

        const body = {
          profileId: parseInt(this.state.selected_profileid) || null,
          beregnuuid: this.state.beregnuuid,
          addresses: Object.keys(this.state.results_adresser).map((kvhx) => ({
           kvhx: kvhx,
         })),
        };

        $.ajax({
          url:"/api/extension/blueidea/" + config.extensionConfig.blueidea.userid + "/CreateMessage",
          type: "POST",
          data: JSON.stringify(body),
          contentType: "application/json",
          dataType: "json",
        })
          .then((data) => {
            if (data.smsGroupId) {
              window.open(
              "https://dk.sms-service.dk/message-wizard/write-message?smsGroupId=" +
              data.smsGroupId,
              "_blank");
            }
            // success snackbar
            this.createSnack( __("Project created successfully"));
            // list projects again to show the new one
            this.listProjects(true);
          })
          .fail((error) => {
            console.error(error);
            this.createSnack("Der opstod en fejl ved afsendelse til BlueIdea.");
        });
      };

      /**
       * This function turns on a layer, if it is not already on the map, and refreshes the map if there is a filter set.
       */
      turnOnLayer = (layer, filter = null) => {
        // guard against empty layer
        if (!layer) {
          return;
        }

        // if the layer is not on the map, anf the filter is empty, turn it on
        api.turnOn(layer);

        // if the filter is not empty, apply it, and refresh the layer
        if (filter) {
          api.filter(layer, filter);
        }
      };

      clearLukkeliste = () => {
        let me = this;
        me.setState({
          results_adresser: {},
          results_log: {},
          results_matrikler: [],
          results_ventiler: [],
          results_ledninger: [],
          results_adresser: [],
          edit_matr: false,
          editProject: false,
          TooManyFeatures: false,
          selectedVentiler: [],
          beregnuuid: null,
          clickedTableVentil: '',
          retryIsDisabled: true,
          editProject: false
        });
        _clearAll();
        this.refreshProjectLayer();
      };

     
      readyPointLukkeliste = () => {
        let me = this;
        blocked = false;

        // if udpeg_layer is set, make sure it is turned on
        if (me.state.user_udpeg_layer) {
          me.turnOnLayer(me.state.user_udpeg_layer);
          me.turnOnLayer(BlueIdea.Aktive_brud_layeName);
        }
        
        // change the cursor to crosshair and wait for a click
        utils.cursorStyle().crosshair();
        cloud.get().map.on("click", me.boundSelectPointLukkeliste);
      };


      /**
       * This function selects a point in the map
       */
      selectPointLukkeliste = async function (e) {
        let me = this;
        let point = null;

        // Remove the click event listener for the map
        cloud.get().map.off("click", me.boundSelectPointLukkeliste);

        // if the click is blocked, return
        if (blocked) {
          return;
        }

        me.createSnack(__("Starting analysis"), true)

        // get the clicked point
        point = e.latlng;
        utils.cursorStyle().reset();
        blocked = true;

        // send the point to the server
        let data = {}
        try {
          data = await me.queryPointLukkeliste(point);
        }
        catch (error) {
          me.createSnack(__("Error in search") + ": " + error.message);
          console.warn(error);
          return
        }

        // pass data onto handler
        me.handleQueryResults(data);
        return
      };

      /**
       * This function reruns a query, using an already defined point
       */
      runWithoutSelected = async function () {
        let me = this;
      
        me.setState({retryIsDisabled: true})
        me.createSnack(__("Starting analysis"), true)

        // Because we already know stuff, send it again.
        // send the point to the server

        let point = {
          lat: me.state.results_log[0].geometry.coordinates[1],
          lng: me.state.results_log[0].geometry.coordinates[0]
        }
        let ignoreVentiler = (me.state.selectedVentiler || [])
          .map(v => parseInt(v, 10))
          .filter(n => !Number.isNaN(n));

        console.log(point, ignoreVentiler)

        let data = {}
        try {
          data = await me.queryPointLukkeliste(point, ignoreVentiler).
          then((data) => data)
          {
            me.setState({retryIsDisabled: true})
          }

        }
        catch (error) {
          me.createSnack(__("Error in search") + ": " + error.message);
          console.warn(error);
          return
        }

        // pass data onto handler
        me.handleQueryResults(data);
        return
      };

      /**
       * Handle the results from the query
       * @param {*} data
       */
      handleQueryResults = async function (data) {
        let me = this;

        if (data.log.features[0].properties.status == 1) {
          me.createSnack(__("No utility lines found"));
        } else {
        // Here we handle data from the query-endpoint
        this.setState({
          selectedVentiler: [],
          retryIsDisabled: true
        });
        
        if (data.ledninger) {
          //console.debug("Got ledninger:", data.ledninger);
          me.addSelectedLedningerToMap(data.ledninger);
          me.setState({results_ledninger: data.ledninger.features});
        }
        // Add indirekteledninger to map
        if (data.indirekteledninger) {
          console.debug("Got indirekteledninger:", data.indirekteledninger);
          me.addSelectedIndirekteLedningerToMap(data.indirekteledninger);
          me.setState({
            results_indirekteledninger: data.indirekteledninger.features,
          });
        }
        // Add the clicked point to the map
        if (data.log) {
          //console.debug("Got log:", data.log);
          me.addSelectedPointToMap(data.log);
          me.setState({
            results_log: data.log.features,
            beregnuuid: data.log.features[0].properties.beregnuuid,
          });
        }
        
        // add forbrugere
        if (data.forbrugere) {
          //console.debug("Got forbrugere:", data.forbrugere);
          try {
            api.turnOn("lukkeliste.vw_forbrugere");
            // add filter
            api.filter("lukkeliste.vw_forbrugere", {
              "match": "any",
              "columns": [{
                "fieldname": "beregnuuid",
                "expression": "=",
                "value": data.log.features[0].properties.beregnuuid,
                "restriction": false
              }]
            });
          } catch (error) {
            console.warn("Could not turn on forbrugere layer or apply filter", error);
          }

          // me.addSelectedForbrugspunkterToMap(data.forbrugere);
          // me.setState({
          //   results_forbrugere: data.forbrugere.features,
          // });
        }

        if (data.ventiler) {
          //console.debug("Got ventiler:", data.ventiler);
          me.addVentilerToMap(data.ventiler);
          me.setState({
            results_ventiler: data.ventiler.features,
          });
          const key = this.state.user_ventil_layer_key;
          const selected = this.state.results_ventiler.filter(item => item.properties?.checked).map(item => item.properties[key]).filter(Boolean)
          this.setState({ selectedVentiler : selected })
        }

        // Getting matrikler is another task, so we seperate it here in a try-catch to get errors to the frontend
        try {
          if (data.matrikler) {
            let parcelcount = data.matrikler.features[0].properties.matr_count;
            if (parcelcount > MAXPARCELS) {
              me.createSnack(__("Large number of parcels found") + " (" + parcelcount + "/" + MAXPARCELS + ")");
            }
            me.queryAddresses(data.matrikler, true);
          }
        } catch (error) {
          console.warn(error);
          return
        }
      }
      };

      /**
       * Handler for alarmkabel click events
       */
      handleAlarmkabelClick = (e) => {
        let me = this;
        let point = null;

        // remove event listener
        cloud.get().map.off("click", me.boundHandleAlarmkabelClick);

        // if the click is blocked, return
        if (blocked || !me.state.active) {
          return;
        }

        me.createSnack(__("Starting analysis"), true)

        // get the clicked point
        point = e.latlng;
        utils.cursorStyle().reset();
        blocked = true;

        // send the point to the server + the distance
        me.queryPointAlarmkabel(point, me.state.user_alarmkabel_art, me.state.user_alarmkabel_distance, me.state.alarm_direction_selected)
          .then((data) => {

            me.createSnack(__("Alarm found"))
            // if the server returns a result, show it
            if (data) {
              // console.debug(data);
              me.addAlarmPositionToMap(data.alarm);
            }

            // Add the clicked point to the map
            if (data.log) {
              //console.debug("Got log:", data.log);
              me.addSelectedPointToMap(data.log);
            }
            return
          })
          .catch((error) => {
            me.createSnack(__("Error in search") + ": " + error);
            console.warn(error);
            return
          });
      }

      /**
       * This function selects a point in the map for alarmkabel
       * @returns Point
       */
      selectPointAlarmkabel = () => {
        let me = this;
        let point = null;
        blocked = false;
        _clearAll();

        // if udpeg_layer is set, make sure it is turned on
        if (me.state.user_udpeg_layer) {
          me.turnOnLayer(me.state.user_udpeg_layer);
        }

        // If distance is not set, or is 0, return
        if (!me.state.user_alarmkabel_distance || me.state.user_alarmkabel_distance == 0) {
          me.createSnack(__("Distance not set"));
          return;
        }

        // if the alarmkabel_art is not set, return
        if (!me.state.user_alarmkabel_art || me.state.user_alarmkabel_art == "") {
          me.createSnack(__("Alarmkabel type not set"));
          return;
        }

        // change the cursor to crosshair and wait for a click
        utils.cursorStyle().crosshair();
        cloud.get().map.on("click", me.boundHandleAlarmkabelClick);

        return
      };

      /**
       * This function parses the alarmskabe results into a list of objects
       * @returns List of objects
       *
       */
      parseAlarmskabeResults = (features) => {
        let results = [];
        features.forEach((feature) => {
          let obj = {
            direction: feature.properties.dir,
            distance: feature.properties.afstand,
          };

          // Translate the direction to human readable
          if (feature.properties.dir == "FT") {
            obj.direction = __("From-To");
          } else if (feature.properties.dir == "TF") {
            obj.direction = __("To-From");
          }

          // Round the distance to 2 decimals
          obj.distance = Math.round(obj.distance * 100) / 100;
          results.push(obj);
        });
        return results;
      };

      /**
       * Handler for alarmskab click events
       */
      handleAlarmskabClick = (e) => {
        let me = this;
        let point = null;

        // remove event listener
        cloud.get().map.off("click", me.boundHandleAlarmskabClick);

        // if the click is blocked, return
        if (blocked) {
          return;
        }

        me.createSnack(__("Starting analysis"), true)

        // get the clicked point
        point = e.latlng;
        utils.cursorStyle().reset();
        blocked = true;

        // send the point to the server + the direction and alarm_skab
        me.queryPointAlarmskab(point, me.state.alarm_direction_selected, me.state.alarm_skab_selected)
          .then((data) => {

            me.createSnack(__("Alarm found"))
            // if the server returns a result, show it
            if (data) {
              // console.debug(data);
              me.addAlarmPositionToMap(data.alarm);

              // Add the results to the list in state
              me.setState({
                results_alarmskabe: me.parseAlarmskabeResults(data.alarm.features),
              });
            }

            // Add the clicked point to the map
            if (data.log) {
              //console.debug("Got log:", data.log);
              me.addSelectedPointToMap(data.log);
            }
            return
          })
          .catch((error) => {
            me.createSnack(__("Error in seach") + ": " + error);
            console.warn(error);
            return
          });
      }

      /**
       * This function selects a point in the map for alarmkabel, based on a specific alarmskab
       * @returns Point
       */
      selectPointAlarmskab = () => {
        let me = this;
        let point = null;
        blocked = false;
        _clearAll();

        // Reset the results
        me.setState({
          results_alarmskabe: [],
        });

        // if udpeg_layer is set, make sure it is turned on
        if (me.state.user_udpeg_layer) {
          me.turnOnLayer(me.state.user_udpeg_layer);
        }

        // change the cursor to crosshair and wait for a click
        utils.cursorStyle().crosshair();
        cloud.get().map.on("click", me.boundHandleAlarmskabClick);

        return
      };

      /**
       * Handler for edit click events
       */
      handleEditClick = (e) => {
        let me = this;
        // if the edit state is true, and the event is a click, add the matrikel to the list

        // 2 things can happen here, either we hit an already selected matrikel, or we hit somewhere without a matrikel.
        // if we hit a matrikel, we remove it from the list, if we hit somewhere without a matrikel, we add it and the adresse it represents to the lists

        // get the clicked point
        let point = e.latlng;
        point = turfPoint([point.lng, point.lat]);

        // Did we hit a feature on queryMatrs?
        let hit = false;
        let feature

        // Check if the point is inside a feature on queryMatrs. The point needs to be inside a feature, and the feature needs to be a matrikel
        queryMatrs.eachLayer(function (layer) {
          // We need to go further down the rabbit hole, and check if the point is inside the feature
          layer.eachLayer(function (sublayer) {
            if (booleanPointInPolygon(point, sublayer.feature)) {
              hit = true;
              feature = layer;
            }
          });
        });

        // If we dit not hit a feature, we add it to the list, and query the addresses
        if (!hit) {
          // Add matrikel and adress to the list
          me.addSingleMatrikel(point)
        } else {
          // Remove matrikel from list and map.
          me.removeSingleMatrikel(feature)
        }
      }

      toggleEdit = () => {
        let me = this;

        // If the edit state is false, we enable it
        if (!me.state.edit_matr) {
          utils.cursorStyle().crosshair();
          cloud.get().map.on("click", me.boundHandleEditClick);
        } else {
          utils.cursorStyle().reset();
          cloud.get().map.off("click", me.boundHandleEditClick);
        }

        // switch the current state
        me.setState({
          edit_matr: !me.state.edit_matr,
        })
      };
      addSingleMatrikel = async function(point) {
        let me = this;

        // Based on clicked point, query for matrikel and adresse information. add these to map and lists.
        // create a simple point feature, using a very small buffer
        let buffered = turfBuffer(point, 0.0001, {
          units: "meters",
        });

        // Query for matrikel & Adresse
        let matrikel = await findMatriklerInPolygon(buffered);
        let adresse = await findAddressesInMatrikel(matrikel.features[0]);

        // Add matrikel to map
        me.addMatrsToMap(matrikel);

        // Merge the new adresse and matrilkel into the existing lists
        let newAdresser = Object.assign({}, me.state.results_adresser);
        adresse.forEach((a) => {
          newAdresser[a.kvhx] = a;
        });

        // Set the new state
        me.setState({
          results_adresser: newAdresser
        });
      };

      removeSingleMatrikel = function(layer) {
        // Remove matrikel from list and map

        // Using the matrikelnr and ejerlavkode, we can remove the matrikel from the list of matrikler
        let matrikel, ejerlav
        layer.eachLayer(function (sublayer) {
          matrikel = sublayer.feature.properties.matrikelnr;
          ejerlav = sublayer.feature.properties.ejerlavkode;
        });

        //console.log(matrikel, ejerlav)

        // Remove adresse from list
        let newAdresser = Object.assign({}, this.state.results_adresser);

        // filter out the addresses that contain the matrikel and ejerlav
        let filtered = []
        for (let key in newAdresser) {
          let a = newAdresser[key];
          if (a.matrikelnr != matrikel || a.ejerlavkode != ejerlav) {
            filtered.push(a);
          }
        }
        // Remove matrikel from map
        queryMatrs.removeLayer(layer);

        // Set the new state
        this.setState({
          results_adresser: filtered
        });
      }

      clearVentilFilter = () => {
        me.turnOnLayer(me.state.ventil_layer, me.buildVentilFilter());
      };

      buildVentilFilter = (keys = undefined) => {
        let me = this;
        var filter = {};

        if (!keys) {
          // If no key is set, create the "clear" filter
          filter[me.state.ventil_layer] = {
            match: "any",
            columns: [],
          };
        } else {
          let columns = [];

          //for each key in keys, create a filter and add to columns
          keys.forEach((key) => {
            columns.push({
              fieldname: me.state.ventil_layer_key,
              expression: "=",
              value: String(key),
              restriction: false,
            });
          });

          // create the filter
          filter[me.state.ventil_layer] = {
            match: "any",
            columns: columns,
          };
        }

        //console.debug(filter);

        return filter;
      };

      /**
       * Determines if the plugin is ready after getting results
       * @returns boolean
       */
      readyToSend = () => {
        // if adresse array is not empty, return true
        if (Object.keys(this.state.results_adresser).length > 0) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * Determines if the result is ready to be sent to blueidea
       * @returns boolean
       */
      readyToBlueIdea = () => {
        // if readyToSend is true, and blueidea is true, return true
        if (this.readyToSend() && this.allowBlueIdea()) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * Determines if lukkeliste is allowed
       * @returns boolean
       */
      allowLukkeliste = () => {
        if (this.state.user_lukkeliste == true && this.state.user_db == true) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * Determines if alarmkabel is allowed
       */
      allowAlarmkabel = () => {
        if (this.state.user_alarmkabel == true && this.state.user_db == true) {
          return true;
        } else {
          return false;
        }
      }

      /**
       * Determines if blueidea is allowed
       * @returns boolean
       */
      allowBlueIdea = () => {
        if (this.state.user_blueidea == true) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * Determines if ventiler can be downloaded
       * @returns boolean
       */
      allowVentilDownload = () => {
        let me = this;

        if (
          this.state.results_ventiler.length > 0 &&
          this.allowLukkeliste() &&
          this.state.user_ventil_export
        ) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * This function converts an array to a csv string
       * @param {*} data
       * @returns
       */
      arrayToCsv(data) {
        return data
          .map(
            (row) =>
              row
                .map(String) // convert every value to String
                .map((v) => v.replaceAll('"', '""')) // escape double colons
                .map((v) => `"${v}"`) // quote it
                .join(",") // comma-separated
          )
          .join("\r\n"); // rows starting on new lines
      };

      /**
       * Downloads blob to file, using ANSI encoding
       */
      downloadBlob = (content, filename, contentType) => {
        // Create a blob, append the BOM and charset
        var blob = new Blob(
          [
            new Uint8Array([0xef, 0xbb, 0xbf]), // UTF-8 BOM
            content,
          ],
          { type: contentType + ";charset=UTF-8" }
        );
        var url = URL.createObjectURL(blob);

        // Create a link to download it
        var pom = document.createElement("a");
        pom.href = url;
        pom.setAttribute("download", filename);
        pom.click();
      };

      /**
       * Gets adresser when there is too many features
       */
      getAdresser = async (matrikler) => {
        let me = this;

        let results = [];

        for (let i = 0; i < matrikler.features.length; i++) {
          let feature = matrikler.features[i];
          results.push(await findAddressesInMatrikel(feature));
          // Show progress per 25 features
          if (i % 25 == 0) {
            me.createSnack(__("Found addresses") + " " + i + "/" + matrikler.features.length);
          }
        }

        let adresser = this.mergeAdresser(results);
        me.createSnack(__("Found addresses"));

        // Set results
        me.setState({
          results_adresser: adresser,
          edit_matr: false,
          TooManyFeatures: false,
        });

        return;
      };

      /**
       * downloads a csv file with the results from adresser
       * @param {*} object kvhx af key/value pairs
       */
      downloadAdresser = () => {
        let me = this;
        let csvRows = [
          ["kvhx", "Vejnavn", "Husnummer", "Etage", "Dør", "Postnummer", "By"],
        ];

        // from the results, append to cvsRows
        for (let key in Object.keys(me.state.results_adresser)) {
          let feat =
            me.state.results_adresser[
              Object.keys(me.state.results_adresser)[key]
            ];
          // console.log(feat);
          let row = [
            feat.kvhx,
            feat.vejnavn,
            feat.husnr,
            feat.etage,
            feat.dør,
            feat.postnr,
            feat.postnrnavn,
          ];
          csvRows.push(row);
        }

        let rows = me.arrayToCsv(csvRows);
        this.downloadBlob(rows, "adresser.csv", "text/csv;");
      };

      /**
       * downloads a csv file with the results from ventiler
       */
      downloadVentiler = () => {
        let me = this;

        // Use keys as headers
        let csvRows = [];
        csvRows.push(Object.keys(me.state.user_ventil_export));

        // for each feature in results_ventiler, append to csvRows with the values from the user_ventil_export
        for (let index in me.state.results_ventiler) {
          let feature = me.state.results_ventiler[index].properties;

          // create a row, using the values from the user_ventil_export
          let columns = Object.values(me.state.user_ventil_export);
          let row = [];

          // Add values to row
          for (let c in columns) {
            row.push(feature[columns[c]]);
          }
          // Add row to file
          csvRows.push(row);
        }

        let rows = me.arrayToCsv(csvRows);
        this.downloadBlob(rows, "ventiler.csv", "text/csv;");
      };


      profileidOptions = () => {
        let options = [];

        // if user_profileid is set, create options.
        if (this.state.user_profileid) {
          for (let key in this.state.user_profileid) {
            options.push({
              value: key,
              label: this.state.user_profileid[key],
            });
          }
        }
        return options;
      }

      setSelectedProfileid = (e) => {
        this.setState({ selected_profileid: e.target.value });
      }

      setSelectedForsyningsart = (e) => {
        // turn off the udpeg layer of the last forsyningsart
        api.turnOff(this.state.project.forsyningsarter[this.state.project.forsyningsart_selected].udpeg_layer);

        // turn off previous selection action if active
        if (!blocked) {
          cloud.get().map.off("click", this.selectPointLukkeliste.bind(this));
          utils.cursorStyle().reset();
          blocked = true;
        }

        // set the new values based on the index in the list
        this.setState({
          forsyningsart_selected: e.target.value,
          user_udpeg_layer: this.state.project.forsyningsarter[e.target.value].udpeg_layer,
          user_ventil_layer: this.state.project.forsyningsarter[e.target.value].ventil_layer,
          user_ventil_layer_key: this.state.project.forsyningsarter[e.target.value].ventil_layer_key,
          user_ventil_export: this.state.project.forsyningsarter[e.target.value].ventil_export,
        });
      }

      haveIdenticalContents = (a, b) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
       return sortedA.every((value, index) => value === sortedB[index]);
      }


      handleVentilCheckbox = (e, ventil) => {
        const { checked } = e.target;
///        backboneEvents.get().trigger(`${exId}:enableRecalculate`);
        this.setState({ retryIsDisabled: false   });
        this.setState(prev => {
          const selected = new Set((prev.selectedVentiler || []).map(String));
          if (checked) {
            selected.add(String(ventil.value));

          } else {
            selected.delete(String(ventil.value));
          }
          return { selectedVentiler: Array.from(selected) };
        });
      };
   
      zoomToXY = (x, y) => {
        const utm32 = "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs";
        const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
        const xf =parseFloat(x)
        const yf =parseFloat(y)
        const [lng, lat] = proj4(utm32, wgs84, [xf, yf]);
        const padding = 0.0001;
        const bounds = L.latLngBounds(
          [lat - padding, lng - padding],
          [lat + padding, lng + padding]
        );
        cloud.get().map.fitBounds(bounds, { maxZoom: 21, animate: true  });
      };

      handleEditProject = (beregnuuid) => {
        const me = this;
        me.clearLukkeliste();
        $.ajax({
          url: `/api/extension/blueidea/${me.state.user_id}/getproject/${beregnuuid}`,
          type: "GET",
          contentType: "application/json",
          dataType: "json",
        })
          .then((data) => {
            if (!data || data.features.length == 0) {
              me.createSnack(__("Project not found"));
              return;
            }
            const feature = data.features[0]; 
            const editProject = ProjectModel.fromFeature(feature);
            me.setState(prev => ({
              project: editProject.withChanges({
                forsyningsarter: prev.project.forsyningsarter,
              }),
              editProject: true
            }))
      
            
            me.createSnack(__("Project loaded for editing"));       
          })
          .catch((error) => {
            console.error(error);
            me.createSnack(__("Error loading project") + ": " + error.message);
          });
      };
      
      handleSaveProject = (project) => {
        const me = this;
        
        $.ajax({
          url: `/api/extension/blueidea/${me.state.user_id}/saveproject`,
          type: "POST",
          data: JSON.stringify(project),
          contentType: "application/json",
          dataType: "json",
        })
          .then(() => {
            backboneEvents.get().trigger(`${exId}:listProject`);
            me.setState({ editProject: false });
            me.createSnack(__("Project saved successfully"));
          })
          .catch((error) => {
            console.error(error);
            me.createSnack(__("Error saving project") + ": " + error.message);
          });
      };

      handleZoom (ventil) {
        this.zoomToXY(ventil.xkoordinat, ventil.ykoordinat);
        this.setState({ clickedTableVentil : ventil.label})
      };
      
      handleZoomProject  = (xmin, ymin,xmax, ymax,) => {
        const me = this;
        me.setState({ editProject: false });
        let bounds = [[ymin, xmin],[ymax, xmax]];
        cloud.get().map.fitBounds(bounds);
      };
      
  
      handleStopProject = (beregnuuid) => {
        if (!window.confirm(__("Confirm stop project")))  {
         return 
        }
        try{
        const me = this;
        const body = {
          beregnuuid
        }
        
        $.ajax({
          url: `/api/extension/blueidea/${config.extensionConfig.blueidea.userid}/StopProject`,
          type: "POST",
          data: JSON.stringify(body),
          contentType: "application/json",
          dataType: "json",
        })
          .then(() => {
            backboneEvents.get().trigger(`${exId}:listProject`);
            me.createSnack(__("Project stopped successfully"));
            // Clear current project ? 
            // me.setState({ project: Project.empty() });
          })
          .catch((error) => {
            console.error(error);
            me.createSnack(__("Error stopping project") + ": " + error.message);
          });
        } catch (error) {
          console.error(error);
          this.createSnack(__("Error stopping project") + ": " + error.message);
        } 
      
      };

      updateProject = (changes) => {
        this.setState(prev => ({
            project: prev.project.withChanges(changes),
        }));
      };
      
      getVentilProperties (forsyningsart)  {
        // her kan man komme med tilpassede ventil egenskaber - så varme nemmere kan implementeres
        try {
          const ventilProperties =new VentilProperties({ 
            key: this.state?.user_ventil_layer_key ?? '',
            name_key: this.state?.user_ventil_layer_name_key ?? '',
            xkoordinat_key: 'xkoord',
            ykoordinat_key: 'ykoord',
            type_key: 'type',
            funktion_key: 'funktion',
            forbundet_key: 'forbundet'
          })
          return ventilProperties;
        }
        catch (error) {
          console.error("Error getting ventil properties:", error);

          return new VentilProperties();
        }
      }
       
      /**
       * Renders component
       */
      render() {
        const _self = this;
        const s = _self.state;
        const { clickedTableVentil, selectedVentiler, results_ledninger, retryIsDisabled } = this.state
        const isDisabled = !this.allowLukkeliste() | s.edit_matr ;
        const pipeSelected = results_ledninger.length > 0;
        const ventilProperties = this.getVentilProperties('vand');
        const breakHeader = s.editProject ? __("Edit project") : __("Select area");  
        const openBlueidea = this.allowBlueIdea() && Object.keys(s.results_adresser).length > 0;  
        const ventilList =   Array.isArray(this.state.results_ventiler)
         ? VentilModel.fromFeaturesFactory(
          this.state.results_ventiler, 
          ventilProperties,  
          Array.isArray(this.state.selectedVentiler) ? this.state.selectedVentiler : []) 
         : []; 
        const ventilCount = ventilList.length;

      
        if (s.authed && s.user_id) {
          // Logged in
          return (
            <div role="tabpanel">
              <div className="row mx-auto gap-0 my-3">
                <details className="col">
                  <summary>Aktive brud ({this.state.projects.length})</summary>
                  <ProjectListComponent
                    className="col"
                    projects={this.state.projects}
                    onHandleEditProject={this.handleEditProject}
                    onHandleZoomProject={this.handleZoomProject}
                    onHandleStopProject={this.handleStopProject}>
                  </ProjectListComponent>
                </details>
              </div>
              <hr></hr>
              <div className="row mx-auto gap-0 my-3">
                <details open className="col">
                  <summary>  
                    {breakHeader}
                    {
                    !s.lukkeliste_ready && this.allowLukkeliste() &&
                      <span className="mx-2 badge bg-danger">{__("Lukkeliste not ready")}</span>
                    }
                  </summary>
                
                  <div style={{ alignSelf: "center" }}>
                 
                  {false && (
                   <div className="d-grid mx-auto gap-2">
                    <button
                      onClick={() => this.clickDraw()}
                      className="btn btn-outline-secondary"
                      disabled={!this.allowBlueIdea()}
                    >
                      {__("Draw area")}
                    </button>
                  </div>)}
                  
                  <ProjectComponent
                    project={this.state.project}
                    editProject={this.state.editProject}
                    onChange={this.updateProject}
                    pipeSelected= {pipeSelected}
                    onHandleSaveProject={this.handleSaveProject}
                    onReadyPointLukkeliste={this.readyPointLukkeliste}
                    onClearLukkeliste={this.clearLukkeliste}
                  ></ProjectComponent>

                  <hr style={{marginRight: "1.5em"}}></hr>
  
                
                </div>
                </details>             
              </div>
              { ventilCount > 0 && (
                <>
                  <VentilListComponent 
                    ventilList={ventilList}
                    onDownloadVentiler={this.downloadVentiler.bind(this)}
                    onVentilZoom={this.handleZoom.bind(this)}
                    onHandleVentilCheckbox={this.handleVentilCheckbox.bind(this)}
                    onRunWithoutSelected={this.runWithoutSelected.bind(this)}
                    retryIsDisabled={retryIsDisabled}
                    clickedTableVentil  = {clickedTableVentil}
                    >
                    </VentilListComponent>
                  <hr style={{marginRight: "1.5em"}}></hr>
                </>
              )}
              

              <div className="row mx-auto gap-0 my-3">
                <details open={openBlueidea} className="col">
                  <summary>BlueIdea</summary>
                  { s.user_profileid && this.profileidOptions().length > 1 &&
                    <div className="row">
                      <label className="col-4">SMS Profil</label>
                      <select
                       className="col-7"
                       style={{ marginRight: '18px', marginLeft: '14px' }}
                       onChange={this.setSelectedProfileid}
                       value={s.selected_profileid}
                       placeholder={__("Select profile")}
                       disabled={!this.readyToBlueIdea()}
                      >
                      {this.profileidOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                          </select>
                    </div>
                  }
                  <div className="row mx-auto gap-3 my-1">
                    <button
                      onClick={() => this.sendToBlueIdea()}
                      className="col btn btn-primary"
                      disabled={!this.readyToBlueIdea()}
                      style={{ marginRight: '8px' }}
                    >
                      {__("Go to blueidea")}
                    </button>
                  </div>

                  <div className="row mx-auto gap-3 my-1">
                    <div className="col">
                      <div className="d-flex align-items-center justify-content-between">
                        {s.TooManyFeatures ? <span>Hent først adresser</span> : <span>Der blev fundet {Object.keys(s.results_adresser).length} adresser i området.</span>}
                      <div className="col-2" style={{ cursor: 'pointer' }}>
                        <i className="bi bi-download" 
                          onClick={() => this.downloadAdresser()}
                          title= {__("Download addresses")}
                          hidden={s.TooManyFeatures || Object.keys(s.results_adresser).length  === 0}>
                        </i>
                      </div>
                       <button
                        disabled={Object.keys(s.results_adresser).length == 0}
                        title={__("modify parcels")}
                        className="btn btn-primary"
                        onClick={() => this.toggleEdit()}>
                        {s.edit_matr ? <i className="bi bi-x"></i> : <i className="bi bi-pencil"></i>}
                      </button>
                    </div>
                    </div>
                  </div>

                  <div className="row mx-auto gap-3 my-3">
                    <button
                      onClick={() => this.getAdresser(s.results_matrikler)}
                      className="col btn btn-primary"
                      hidden={!s.TooManyFeatures}
                      style={{ marginRight: '8px' }}
                    >
                      {__("Get addresses")}
                    </button>
                  </div>
          
                </details>
              </div>

              
              <div
                style={{ alignSelf: "center" }}
                hidden={!s.user_alarmkabel}
              >
                <h6>{__("Alarm cable")}</h6>
                <select
                  className="form-select"
                  value={s.alarm_direction_selected}
                  onChange={(e) => this.setState({ alarm_direction_selected: e.target.value })}
                >
                  <option value="FT">{__('From-To')}</option>
                  <option value="TF">{__('To-From')}</option>
                  <option value="Both">{__('Both')}</option>
                </select>
                <div className="form-text mb-3">Angiv søgeretning</div>
                <div className="vertical-center col-auto">
                  {__("Distance from point")}
                </div>

                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={s.user_alarmkabel_distance}
                    onChange={(e) => this.setState({ user_alarmkabel_distance: e.target.value })}
                    min={0}
                    max={2000}
                    style={{ width: "35%" }}
                  />
                  <button
                    onClick={() => this.selectPointAlarmkabel()}
                    className="btn btn-primary col-auto"
                    disabled={!this.allowAlarmkabel() && s.user_alarmkabel_art}
                  >
                    {__("Select point for alarmkabel")}
                  </button>
                </div>
                <div className="form-text mb-3">Angiv antal meter, og udpeg punkt.</div>
              </div>

              <div
                style={{ alignSelf: "center" }}
                //hidden={!s.user_alarmkabel}
                hidden
              >
                <div className="vertical-center col-auto">
                  {__("Distance from cabinet")}
                </div>

                <div className="input-group">
                  <select
                    className="form-select"
                    value={s.alarm_skab_selected}
                    onChange={(e) => this.setState({ alarm_skab_selected: e.target.value })}
                  >
                    // for each option in s.alarm_skabe, create an option
                   {s.alarm_skabe.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                   ))}
                  </select>
                  <button
                    onClick={() => this.selectPointAlarmskab()}
                    className="btn btn-primary col-auto"
                    disabled={!this.allowAlarmkabel()}
                  >
                    {__("Select point for cabinet")}
                  </button>
                </div>
                <div className="form-text mb-3">Vælg alarmskab, og udpeg punkt</div>
                </div>

                <div
                  style={{ alignSelf: "center" }}
                  hidden={s.results_alarmskabe.length == 0}
                >
                <div className='list-group'>
                    {s.results_alarmskabe.map((item, index) => (
                      <div className='list-group-item' key={index}>
                        <div className='d-flex w-100 justify-content-between'>
                          <small>{item.direction}</small>
                          <small>{item.distance}m</small>
                        </div>
                      </div>
                    ))}
                </div>

              </div>
            </div>

          );
        }

        // Not Logged in - or not configured
        return (
          <div role = "tabpanel" >
            <div className = "form-group" >
                <div id = "blueidea-feature-login" className = "alert alert-info" role = "alert" >
                    {__("MissingLogin")}
                </div>
                <div className="d-grid mx-auto">
                    <button onClick = {() => this.clickLogin()} type="button" className="btn btn-primary">{__("Login")}</button>
                </div>
            </div>
        </div>
        );
      }
    };

    utils.createMainTab(
      exId,
      __("Plugin Tooltip"),
      __("Info"),
      require("./../../../browser/modules/height")().max,
      "bi-node-minus",
      false,
      exId
    );

    // Append to DOM
    //==============
    try {
      ReactDOM.render(<BlueIdea ref={blueIdeaRef} />, document.getElementById(exId));
    } catch (e) {
      throw "Failed to load DOM";
    }
  },

  callBack: function (url) {
    utils.popupCenter(
      url,
      utils.screen().width - 100,
      utils.screen().height - 100,
      exId
    );
  },

  setCallBack: function (fn) {
    this.callBack = fn;
  },
};
