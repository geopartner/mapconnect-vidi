/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2020- Geoparntner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";


import {
  buffer as turfBuffer,
  point as turfPoint,
  nearestPointOnLine,
  featureCollection as turfFeatureCollection,
  applyFilter,
} from "@turf/turf";
import { convert as geojsonToWKT } from "terraformer-wkt-parser";


import _, { has } from "underscore";
import { createRoot } from "react-dom/client";

var React = require("react");

const alarmRef = React.createRef();

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
var exId = "alarm";
var exBufferDistance = 0.1;

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
  user_alarmkabel: false,
  user_alarmkabel_art: null,
};

// This element contains the styling for the module
var styleObject = require("./style.js");


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
        let foundFeature = null;
        let qstore = [];
        const point = turfPoint([lng, lat])
        const bufferedPolygon = turfBuffer(point, 2, { units: 'meters' })
        const wkt = geojsonToWKT(bufferedPolygon.geometry)
        if (!wkt || !fullLayerName) {
          return foundFeature;
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
                    foundFeature = feature;
                  });
                  resolve(foundFeature);
                } catch (err) {
                  reject(err);
                }
              } else {
                resolve(foundFeature);
              }
            },
            null,
            null,
            null,
            [fullLayerName],
            true,
            null,
            null
          );
        });


        // backboneEvents.get().trigger(`${MAPSTATUS_MODULE_NAME}:updatedata`, featuresManager);

      } catch (e) {
        console.error("Error in makeSearch:", e);
      }
    }


    /**
     *
     */
    class Alarm extends React.Component {

      constructor(props) {
        super(props)
        this.sqlQuery = props.sqlQuery;
        this.state = {
          active: false,
          authed: false,
          isAnalyzing: false,
          loading: false,
          user_db: false,
          user_udpeg_layer: config.extensionConfig.alarm.udpeg_layer || null,
          kabelpoint: null,
          user_alarmkabel: false,
          user_alarmkabel_distance: config.extensionConfig.alarm.alarmkabel_distance || 100,
          user_alarmkabel_art: config.extensionConfig.alarm.alarmkabel_art || 2,
          alarm_direction_selected: 'Both',
          alarm_skab_layer: null,
          alarm_skab_key: null,
          alarm_skab_selected: '',
          alarm_skabe: null,
          alarm_skabe_all: [],
          show_alarmskabe: false,
          results_alarmskabe: [],
          layersOnStart: [],
        };

        // Store bound event handlers as class properties to maintain consistent function references
        this.boundHandleAlarmkabelClick = this.handleAlarmkabelClick.bind(this);
        this.boundHandleAlarmskabClick = this.handleAlarmskabClick.bind(this);
        this.buildStyleObject();
      }

      buildStyleObject() {
        if (config.extensionConfig.alarm.afbrudt_ledning_farve) {
          styleObject.selectedLedning.color = config.extensionConfig.alarm.afbrudt_ledning_farve;
        }
        if (config.extensionConfig.alarm.indirekte_ledning_farve) {
          styleObject.selectedIndirekteLedning.color = config.extensionConfig.alarm.indirekte_ledning_farve;
        }
        if (config.extensionConfig.alarm.ventil_forbundet_farve) {
          styleObject.ventil_forbundet.fillColor = config.extensionConfig.alarm.ventil_forbundet_farve;
        }
        if (config.extensionConfig.alarm.ventil_ikke_forbundet_farve) {
          styleObject.ventil.fillColor = config.extensionConfig.alarm.ventil_ikke_forbundet_farve;
        }
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
          options.sort((a, b) => String(a.label ?? '').localeCompare(String(b.label ?? '')));
          options.unshift({ value: '', label: __("Select alarmskab") });
        }
        return options;
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
       * 
       * @param {*} alarm_skab 
       * @returns list of alarmskabe
       */
      getAlarmSkabe(alarm_skab) {
        return new Promise((resolve, reject) => {
          const body = {}
          body.key = alarm_skab.key
          body.name = alarm_skab.name
          body.geom = alarm_skab.geom
          body.layer = alarm_skab.layer

          $.ajax({
            url: "/api/extension/alarmskabelist",
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
          user_alarmkabel: data.alarmkabel,
          alarm_skab_selected: '',
          forsyningsart_selected: 2,
          layersOnStart: data.layersOnStart || []
        });
        if (data.udpeg_layer) {
          me.setState({
            user_udpeg_layer: data.udpeg_layer
          });
        }

        if (status.hasKabelskab) {
          const alarm_skabe_all = await me.getAlarmSkabe(config.extensionConfig.alarm.alarm_skab);

          if (!alarm_skabe_all) {
            return;
          }
          if (alarm_skabe_all && alarm_skabe_all.features.length > 0) {
            try{
            const alarm_skabe_options = me.createAlarmskabeOptions(alarm_skabe_all.features);
            me.setState({
              show_alarmskabe: true,
              alarm_skab_layer: data.alarm_skab.layer ? data.alarm_skab.layer : null,
              alarm_skab_key: data.alarm_skab.key ? data.alarm_skab.key : null,
              alarm_skabe: alarm_skabe_options,
              alarm_skabe_all: alarm_skabe_all.features,
            });
            } catch(e){
              me.createSnack("Error processing alarm skabe options");
            }
          }




        }
      }

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
            url: "/api/extension/alarmkabel/query",
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
      queryPointAlarmskab = (point, direction, alarmskab_gid, forsyningsart, distance) => {
        let me = this;
        let body = {};
        body.lat = point[0];
        body.lng = point[1];
        body.direction = direction;  //append distance to body
        body.alarmskab = alarmskab_gid; //append alarmskab to body
        body.forsyningsart = forsyningsart; //append forsyningsart to body
        body.distance = distance; //append distance to body

        return new Promise(function (resolve, reject) {
          $.ajax({
            url: "/api/extension/alarmskab/query",
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
       * Styles and adds the selected point to the map
       */
      addSelectedPointToMap(geojson) {
        try {
          var myIcon = new L.DivIcon(styleObject.selectedPoint);
          var l = L.geoJSON(geojson, {
            pointToLayer: function (feature, latlng) {
              return new L.Marker(
                latlng, {
                icon: myIcon,
                interactive: true,

                onEachFeature: function (feature, layer) {
                  layer.bindTooltip('Brudpunket', { sticky: true, direction: 'top' })
                }
              });
            },
          }).addTo(selectedPoint);
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
      * Handler for alarmkabel click events
      */
      handleAlarmkabelClick = async (e) => {
        let me = this;
        let point = null;

        // remove event listener
        cloud.get().map.off("click", me.boundHandleAlarmkabelClick);

        // if the click is blocked, return
        if (blocked || !me.state.active) {
          return;
        }

        //me.createSnack(__("Starting analysis"), true)

        // get the clicked point
        point = e.latlng;
        utils.cursorStyle().reset();
        blocked = true;

        const feature = await makeSearch(point.lng, point.lat, me.state.user_udpeg_layer);
        if (!feature) {
          console.warn("No feature found at clicked point");
          me.setState({ kabelpoint: null });
          _clearAlarmPositions();
          me.createSnack(__("No feature found at clicked point"));
          return;
        }
        try {
          const tpoint = turfPoint([point.lng, point.lat]);
          const projectedPoint = nearestPointOnLine(feature, tpoint);
          point.lng = projectedPoint.geometry.coordinates[0];
          point.lat = projectedPoint.geometry.coordinates[1];
          me.addAlarmPositionToMap(projectedPoint);
          me.setState({ kabelpoint: { point } });
        } catch (err) {
          console.error("Error processing feature:", err);
          me.createSnack(__("Error in search") + ": " + err);
          return;
        }
      }

      /**
       * This function starts the query for the alarmkabel based on the selected point.
      */
      startQueryPointAlarmkabel = () => {
        let me = this;
        const point = me.state.kabelpoint?.point;
        if (!point) {
          me.createSnack(__("No point selected"));
          clearAlarmPositions();
          return;
        }
        // send the point to the server + the distance
        me.queryPointAlarmkabel(point,
          me.state.user_alarmkabel_art,
          me.state.user_alarmkabel_distance,
          me.state.alarm_direction_selected)
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
            if (error?.responseJSON?.message) {
              me.createSnack(__("Error in search") + ": " + error.responseJSON.message);
            } else {
              me.createSnack(__("Error in search") + ": " + error);
            }
            console.warn(error);
            return
          });
      };

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
       * Starts the alarmskab analysis by sending the selected cabinet and direction to the server
       */
      startAlarmskabAnalysis = () => {
        let me = this;
        if (!me.state.alarm_skab_selected) {
          me.createSnack(__("No cabinet selected"));
          return;
        }
        const selectedSkab = this.state.alarm_skabe_all.find(skab => skab.properties.value === me.state.alarm_skab_selected);
        const point = selectedSkab ? selectedSkab.geometry.coordinates : null;
        me.createSnack(__("Starting analysis"), true)

        // send the point to the server + the direction and alarm_skab
        me.queryPointAlarmskab(point, me.state.alarm_direction_selected, me.state.alarm_skab_selected, user_alarmkabel_art, me.state.user_alarmkabel_distance)
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
            if (error.responseJSON && error.responseJSON.message) {
              me.createSnack(__("Error in search") + ": " + error.responseJSON.message);
            } else {
              me.createSnack(__("Error in search") + ": " + error);
            }
            console.warn(error);
            return
          });
      };

      /**
       * Handler for alarmskab click events
       */
      handleAlarmskabClick = async (e) => {
        let me = this;
        let point = null;

        // remove event listener
        cloud.get().map.off("click", me.boundHandleAlarmskabClick);

        // if the click is blocked, return
        if (blocked) {
          return;
        }



        // get the clicked point
        point = e.latlng;
        utils.cursorStyle().reset();
        blocked = true;

        const feature = await makeSearch(point.lng, point.lat, me.state.alarm_skab_layer);

        if (!feature) {
          me.alarmSkabeChange('');
          blocked = false;
          return;
        }
        const skabeId = feature ? feature.properties[me.state.alarm_skab_key] : null;
        me.alarmSkabeChange(skabeId.toString());
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

      zoomToXY = (lng, lat) => {
        const lngff = parseFloat(lng)
        const latf = parseFloat(lat)
        const padding = 0.0001

        const bounds = L.latLngBounds(
          [latf - padding, lngff - padding],
          [latf + padding, lngff + padding]
        );
        cloud.get().map.fitBounds(bounds, { maxZoom: 21, animate: true });
      }

      alarmSkabeChange = (skabKeyStr) => {
        if (!skabKeyStr || skabKeyStr === '') {
          this.setState({ alarm_skab_selected: '' });
          return;
        }
        const skabKey = parseInt(skabKeyStr, 10); // Convert to integer
        this.setState({
          alarm_skab_selected: skabKey
        });
        const selectedSkab = this.state.alarm_skabe_all.find(skab => skab.properties.value === skabKey);
        if (selectedSkab) {
          console.log("Selected alarmskab:", selectedSkab);
          const coordinates = selectedSkab.geometry.coordinates;
          this.zoomToXY(coordinates[0], coordinates[1]);
          this.addAlarmPositionToMap(selectedSkab);
        } else {
          console.warn("Alarmskab not found for key:", skabKey);
        }
      }

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
       * Renders component
       */
      render() {
        const _self = this;
        const s = _self.state;

        if (!s.authed) {
          return (
            <div role="tabpanel" >
              <div className="form-group" >
                <div id="blueidea-feature-login" className="alert alert-info" role="alert" >
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
              hidden={!s.user_alarmkabel}
            >
              <h6>{__("Alarm cable")}</h6>
              <div className="row mx-auto g-2 my-2 align-items-center flex-nowrap">
                <label className="col-4 col-form-label text-nowrap" >{__("Angiv søgeretning")}</label>
                <select
                  className="col form-select"
                  value={s.alarm_direction_selected}
                  onChange={(e) => this.setState({ alarm_direction_selected: e.target.value })}
                >
                  <option value="FT">{__('From-To')}</option>
                  <option value="TF">{__('To-From')}</option>
                  <option value="Both">{__('Both')}</option>
                </select>
              </div>
              <div className="row mx-auto g-2 my-2 align-items-center flex-nowrap">
                <label className="col-4 col-form-label text-nowrap" >{__("Distance from point")}</label>
                <input
                  type="number"
                  className="col form-control"
                  value={s.user_alarmkabel_distance}
                  onChange={(e) => this.setState({ user_alarmkabel_distance: e.target.value })}
                  min={0}
                  max={2000}
                />
              </div>


              <div className="row mx-auto my-3 align-items-center flex-nowrap">
                <div className="col-4"></div>
                <div className="col-8 d-flex justify-content-between align-items-center">
                  <button
                    onClick={() => this.selectPointAlarmkabel()}
                    style={{ width: '150px' }}
                    className="col-4 btn btn-primary "
                    disabled={!this.allowAlarmkabel() && s.user_alarmkabel_art}
                  >
                    {__("Select point for alarmkabel")}
                  </button>
                  <button
                    onClick={() => this.startQueryPointAlarmkabel()}
                    className="btn btn-primary"
                    style={{ width: '125px' }}
                    disabled={!s.kabelpoint}
                  >
                    Beregn
                  </button>
                </div>
              </div>
            </div>

            <div style={{ alignSelf: "center" }} hidden={!s.show_alarmskabe}>
              <div className="row mx-auto my-3 align-items-center flex-nowrap">
                <label className="col-4 col-form-label text-nowrap">
                  {__("Cabinet")}
                </label>
                <select
                  className="col form-select"
                  value={s.alarm_skab_selected}
                  onChange={(e) => this.alarmSkabeChange(e.target.value)}
                >
                  {s.alarm_skabe &&
                    s.alarm_skabe.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="row mx-auto my-3 align-items-center flex-nowrap">
                <div className="col-4"></div>
                <div className="col-8 d-flex justify-content-between align-items-center">

                  <button
                    onClick={() => this.selectPointAlarmskab()}
                    style={{ width: '150px' }}
                    className="btn btn-primary"
                    disabled={!this.allowAlarmkabel()}
                  >
                    {__("Select point for cabinet")}
                  </button>
                  <button
                    onClick={() => this.startAlarmskabAnalysis()}
                    style={{ width: '125px' }}
                    className="btn btn-primary"
                    disabled={!s.alarm_skab_selected}
                  >
                    Beregn
                  </button>
                </div>
              </div>

            </div>
            {/* <div className="form-text mb-3">Vælg alarmskab, og udpeg punkt</div> */}
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
        // Not Logged in - or not configured

      }
    };

    utils.createMainTab(
      exId,
      __("Plugin Tooltip"),
      __("Info"),
      require("./../../../browser/modules/height")().max,
      "bi-exclamation-triangle-fill",
      false,
      exId
    );

    // Append to DOM
    //==============
    try {
      createRoot(document.getElementById(exId)).render(<Alarm ref={alarmRef} />);
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
