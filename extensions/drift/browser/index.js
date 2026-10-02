/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2020- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";


import {
  buffer as turfBuffer,
  bbox as turfBbox,
  point as turfPoint,
  nearestPointOnLine,
  featureCollection as turfFeatureCollection,
  distance as turfDistance,

} from "@turf/turf";
import { convert as geojsonToWKT } from "terraformer-wkt-parser";
import { createRoot } from "react-dom/client";

var React = require("react");
const driftRef = React.createRef();

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
var transformPoint;

/**
 *
 * @type {*|exports|module.exports}
 */
var meta;

/**
 *
 * @type {*|exports|module.exports}
 */
var socketId;

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
var exId = "drift";

/**
 *
 */
var mapObj;
var config = require("../../../config/config.js");
let sqlQuery;

/**
 * Draw module
 */
var draw;
var cloud;

var bufferItems = new L.FeatureGroup();
var selectedPoint = new L.FeatureGroup();
var alarmPositions = new L.FeatureGroup();

var _clearBuffer = function () {
  bufferItems.clearLayers();
};


var _clearSelectedPoint = function () {
  selectedPoint.clearLayers();
};


var _clearAlarmPositions = function () {
  alarmPositions.clearLayers();
};


var _clearAll = function () {
  _clearBuffer();
  _clearSelectedPoint();
  _clearAlarmPositions();
};


const resetObj = {
  authed: false,
  user_db: false,
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
    sqlQuery = o.sqlQuery;
    transformPoint = o.transformPoint;
    backboneEvents = o.backboneEvents;
    return this;
  },

  /**
   *
   */
  init: function () {
    var parentThis = this;

    /**
     *
     * Native Leaflet object
     */
    mapObj = cloud.get().map;
    mapObj.addLayer(bufferItems);
    mapObj.addLayer(selectedPoint);
    mapObj.addLayer(alarmPositions);


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

    const makeSearch = async (lng, lat, fullLayerName) => {
      try {
        let foundFeatures = [];
        let qstore = [];
        const point = turfPoint([lng, lat])
        const bufferedPolygon = turfBuffer(point, 20, { units: 'meters' })
        const wkt = geojsonToWKT(bufferedPolygon.geometry)
        if (!wkt || !fullLayerName) {
          return foundFeatures;
        }
        return await new Promise((resolve, reject) => {
          sqlQuery.init(
            qstore,
            wkt,
            "4326",
            () => {
              if (qstore.length >= 1 && qstore[0].geoJSON) {
                try {
                  qstore[0].geoJSON.features.forEach(feature => {
                    foundFeatures.push(JSON.parse(JSON.stringify(feature)));
                  });
                  sqlQuery.reset(qstore);
                  resolve(foundFeatures);
                } catch (err) {
                  reject(err);
                }
              } else {
                resolve(foundFeatures);
              }
            },
            null,
            null,
            null,
            [fullLayerName],
            false,
            null,
            null
          );
        });
      } catch (e) {
        console.error("Error in makeSearch:", e);
      }
    }


    /**
     *
     */
    class Drift extends React.Component {

      constructor(props) {
        super(props)
        this.sqlQuery = props.sqlQuery;
        this.state = {
          active: false,
          authed: false,
         layersOnStart: [],
        };
 
      }

   

      /**
       * Handle activation on mount
       */
      componentDidMount() {
        let me = this;
        // Stop listening to any events, deactivate controls, but
        // keep effects of the module until they are deleted manually or reset:all is
        backboneEvents.get().on("deactivate:all", () => { });
        this.getConfig();
        // Activates module
        backboneEvents.get().on(`on:${exId}`, () => {
          //console.debug("Starting alarm");
          me.setState({
            active: true,
          });

          // if logged in, get user
          if (me.state.authed) {

            // turn on layersOnStart
            if (me.state.layersOnStart.length > 0) {
              me.state.layersOnStart.forEach((layer) => {
                api.turnOn(layer);
              });
            }
            return this.getConfig();
          } else {
            me.setState(resetObj);
          }
        });

        // Deactivates module
        backboneEvents.get().on(`off:${exId} reset:all`, () => {
          console.debug("Stopping alarm");

          // remove layersOnStart
          if (me.state.layersOnStart.length > 0) {
            me.state.layersOnStart.forEach((layer) => {
              api.turnOff(layer);
            });
          }

          // Make sure to remove bound click event listeners from map
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
          });
        });

        // On auth change, handle Auth state
        backboneEvents.get().on(`session:authChange`, () => {
          console.log('Auth changed!')
          fetch("/api/session/status")
            .then(r => r.json())
            .then(obj => me.setState({
              authed: obj.status.authenticated
            }, () => {
              // Callback: Setup happens AFTER state update
              if (me.state.authed) {

                if (me.state.layersOnStart.length > 0) {
                  me.state.layersOnStart.forEach((layer) => {
                    api.turnOn(layer);
                  });
                }
                return me.getConfig()
              } else {
                me.setState(resetObj);
              }
            }))
            .catch(e => {
              me.setState(resetObj);
            })
        });
      }



 

      /**
       * 
       * @param {*} config  The alarm configuration object to validate
       * @returns {Object}  The result of the validation, with status and message properties  
       */
      validateConfig(config) {
        const result = { status: true, message: '', hasKabelskab: false };
        if (!config) {
          result.status = false;
          result.message = 'No user provided';
          return result;
        }
        if (!config.hasOwnProperty("alarm_skab") &&
          !config.hasOwnProperty("alarmkabel")) {
          result.status = false;
          result.message = 'No alarm_skab or alarmkabel configuration found';
          return result;
        }
        if (!config.hasOwnProperty("alarm_skab") &&
          config.hasOwnProperty("alarmkabel") &&
          !config.alarmkabel !== true) {
          result.status = false;
          result.message = 'No alarm_skab or alarmkabel configuration found';
          return result;
        }


        if (config.hasOwnProperty("alarm_skab")) {
          const props = ["layer", "geom", "key", "name"];
          for (const prop of props) {
            if (!config.alarm_skab.hasOwnProperty(prop)) {
              result.status = false;
              result.message += `Missing property ${prop} in alarm_skab configuration\n`;
              return result;
            }
          }
          result.hasKabelskab = true;
        }

        if (config.hasOwnProperty("alarmkabel")) {
          const props = ["alarmkabel_distance", "alarmkabel_art", "udpeg_layer"];
          for (const prop of props) {
            if (!config.hasOwnProperty(prop)) {
              result.status = false;
              result.message += `Missing property ${prop} in alarmkabel configuration\n`;
              return result;
            }
          }
        }
        return result;
      }
 

      /**
        * Get the alarm configuration from the extension config
        * and update the component state accordingly
        */
      async getConfig() {
        let me = this;
        // If user is set in extensionconfig, set it in state and get information from backend
        if (!config.extensionConfig.alarm) {
          me.createSnack("No alarm configuration found");
          return;
        }

        let data = config.extensionConfig.alarm;
        const status = me.validateConfig(data);
        if (status.status === false) {
          me.createSnack(status.message);
          return;
        }

        me.setState({
          user_db: true,
          layersOnStart: data.layersOnStart || []
        });
        if (data.udpeg_layer) {
          me.setState({
            user_udpeg_layer: data.udpeg_layer
          });
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

        utils.showInfoToast(html, { timeout: 5000, autohide: false })
      }


      /**
       * Simulates a click on the login button
       */
      clickLogin() {
        document.querySelector('[data-bs-target="#login-modal"]').click();
      }

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
      /**
       * Finds the nearest feature to a given point
       */
      getNearestFeature = (point, features) => {
        let nearest = null;
        let nearestDistance = Infinity;
        const me = this;
        if (!point || !features || features.length === 0) {
          return null;
        }

        for (const feature of features) {
          if (!feature.geometry || !feature.geometry.coordinates) {
            continue;
          }
          let candidate;
          let distance;

          if (feature.geometry.type === 'Point') {
            // Feature er allerede et punkt
            candidate = feature;
            distance = turfDistance(point, feature);

          } else if (
            feature.geometry.type === 'LineString' ||
            feature.geometry.type === 'MultiLineString'
          ) {
            try {
              candidate = nearestPointOnLine(feature, point);
              distance = turfDistance(point, candidate);
            } catch (error) {
              console.error("Error finding nearest point on line:", error);
              continue;
            }

          } else {
            // Ignorer andre geometrityper
            continue;
          }

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = candidate;
          }
        }

        return nearest;
      };

    
 

      /**
       * Renders component
       */
      render() {
        const _self = this;
        const s = _self.state;

        if (!s.authed) {
          return (
            <div role="tabpanel" >
              <div className="form-group" >
                <div id="drift-feature-login" className="alert alert-info" role="alert" >
                  {__("MissingLogin")}
                </div>
                <div className="d-grid mx-auto">
                  <button onClick={() => this.clickLogin()} type="button" className="btn btn-primary">{__("Login")}</button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div role="tabpanel">


            <div
              style={{ alignSelf: "center" }}
            >
              <h6>{__("Plugin Tooltip")}</h6>
              <p>{__("Info")}</p>
            

 
            </div>

    
          </div>

        );
        // Not Logged in - or not configured

      }
    }

    utils.createMainTab(
      exId,
      __("Plugin Tooltip"),
      __("Info"),
      require("./../../../browser/modules/height")().max,
      "bi-cone-striped",
      false,
      exId
    );

    // Append to DOM
    //==============
    try {
      createRoot(document.getElementById(exId)).render(<Drift ref={alarmRef} />);
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
