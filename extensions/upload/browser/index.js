/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

'use strict';

let cloud;
let utils;
let backboneEvents;
let draw = require("../../../browser/modules/draw");
let drawTools = require("../../../browser/modules/drawTools");
let drawToolsGp = require("../../../browser/modules/gp/drawTools");
import JSZip from "jszip";
import shp from "shpjs";
let dict = require("./i18n");

// defaults
const maxCount = 200;

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
    set: (o) => {
        cloud = o.cloud;
        utils = o.utils;
        transformPoint = o.transformPoint;
        backboneEvents = o.backboneEvents;
        return this;
    },

    /**
     *
     */
    init: () => {

        // Inject button in draw
        // We inject the buttons and callbacks here
        let draw_selector = "#draw-content > div.d-flex.justify-content-around.mb-3"
        let me = this;

        // add the button, but as the first element
        $(draw_selector).prepend(`
             <button id="_draw_upload_shape_btn" class="btn btn-sm btn-secondary" for="_draw_upload_shape_file" title="Upload shape zip file" target="_blank" href="javascript:void(0)">
                <i class="bi bi-upload" aria-hidden="true"></i> Upload
                <input id="_draw_upload_shape_file"  style="display:none;" type="file"  accept-language  accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed" >                                
            </button>
        `);

        // attach events to buttons
        $("#_draw_upload_shape_file").on('change', async function (e) {
            try {
                if (e.target.files && e.target.files.length > 0) {
                    let file = e.target.files[0];
                    if (!file.name.toLowerCase().endsWith(".zip")) {
                        snack(__('Error: Must be a .zip file'));
                        return;
                    }
                    snack(__('Start loading'), true);
                    handleZipFile(file);
                } else {
                    snack(__('Error: First file is not a zip file'));
                    return;
                }

            } catch (e) {
                console.error(e);
                snack(__('Error: Conversion to layer error'));
            }
        });

        $("#_draw_upload_shape_btn").on('click', function (e) {
            document.getElementById('_draw_upload_shape_file').click();
        });

        function __(txt) {
            if (dict[txt][window._vidiLocale]) {
                return dict[txt][window._vidiLocale];
            } else {
                return txt;
            }
        };

        // Define functions

        /**
        * Creates a new snackbar
        * @param {*} text
        * @param {*} loading
        */

        function snack(text, loading = false) {
            let html = "";
            // if loading is true, show a loading spinner in the snackbar
            if (loading) {
                html = "<span class='spinner-border spinner-border-sm'></span><span id='upload-progress'> " + text + "</span>";
            } else {
                html = "<span id='upload-progress'>" + text + "</span>"
            }
            utils.showInfoToast(html, { timeout: 5000, autohide: false })
        }

        /**
         * Handles the zip file
         * @param {*} file
         */

        function handleZipFile(file) {
            // Read the file, and asses the contents
            JSZip.loadAsync(file)
                .then(function (zip) {
                    // Get a list of all files in the zip
                    let files = Object.keys(zip.files);

                    // If no .shp file, continue
                    if (!files.some(f => f.endsWith('.shp'))) {
                        throw new Error(__("Error: No .shp file found in zip"));
                    }

                    // parse into an arraybuffer
                    parseFile(file);
                })
                .catch(function (err) {
                    console.error(err);
                    snack(__('Error unpacking file') + ": " + err);
                });
        }

        /**
         * Parse the zip-file into ArrayBuffers
         * @param {*} file
         */

        function parseFile(file) {
            try {
                const reader = new FileReader();
                reader.onload = function () {
                    if (reader.readyState != 2 || reader.error) {
                        return;
                    } else {
                        
                        convertToLayer(reader.result);
                    }
                }
                reader.readAsArrayBuffer(file);
            } catch (err) {
                snack(__('Error on upload'))
            }
        }

        /**
         * Converts a shp-file to a layer
         * @param {*} ArrayBuffer
         * 
         */

        function convertToLayer(buffer) {
            // Parse the buffer as a shape-file
            shp(buffer)
                .then(function (geojson) {
                    // If the file is not an array, make it an array
                    if (!Array.isArray(geojson)) {
                        geojson = [geojson];
                    }

                    // Handle as array
                    for (const element of geojson) {
                        // Count elements
                        var count = countObjects(element);

                        // If no features, continue 
                        if (count == 0) {
                            throw new Error(__("Error: No features found in file"));
                        }

                        // If too many features, continue
                        if (count > maxCount) {
                            const errTxt = __("File contains") + " " + count + " " + __("objects") + ". Max: " + maxCount;
                            throw new Error(errTxt)
                        }

                        // If we got so far, add missing properties to the layer
                        setGeometryProperties(element);

                        // Add the layer to the map
                        //backboneEvents.get().trigger('draw:created', L.geoJSON(element));

                        for (const feature of element.features) {
                            var layergroup = L.geoJSON(feature);
                            var layer = layergroup.getLayers()[0];
                            cloud.get().map.fire('draw:created', {layer: layer, layerType: feature.properties.type});
                        }
                    }

                    // Done, refresh the draw
                    backboneEvents.get().trigger(`draw:update`);
                    // avoid control floating out of view
                    $('#draw-content').css("margin-left", "50px");
                    snack(__("File parsed successfully"))
                })
                .catch(function (err) {
                    snack(__('Error: No features found in file'));
                    console.error(err);
                });
        }

        /**
         * Counts the number of objects in a geojson
         * @param {*} geojson
         * @returns integer
         */

        function countObjects(geojson) {
            try {
                if (geojson.features.length==0) {
                    snack(__('Error: No features found in file'));
                    return 0;
                }
                return geojson.features.length;
            } catch (err) {
                console.error(err);
                snack(__('Error unpacking file'));
                return 0;
            }
        }

        /**
         * Adds properties to the geojson
         * @param {*} geoJson
         * @returns geoJson
         */

        function setGeometryProperties(geoJson) {

            for (const feature of geoJson.features) {

                if (feature.geometry.type === 'LineString') {
                    feature.properties.type = 'polyline';
                    feature.properties.distance = drawToolsGp.getFeatureDistance(feature);
                }

                else if (feature.geometry.type === 'Polygon') {
                    feature.properties.type = 'polygon';
                    const area = drawToolsGp.getFeatureArea(feature);
                    const formatArea = utils.formatArea(area);
                    feature.properties.area = formatArea;
                }
                else
                    feature.properties.type = 'marker';
            }
        }
    }
};