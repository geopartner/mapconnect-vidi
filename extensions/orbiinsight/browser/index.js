/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

var React = require("react");
const ToastUtils = require("./utils/toastUtils");
const OrbiInsightRef = React.createRef();

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
var exId = "orbiinsight";

/**
 * Debug mode - set to true to enable debug logging
 * @type {boolean}
 */
const DEBUG_MODE = true;

/**
 * Debug logging function
 * @param {*} message - The message to log
 * @param {...*} args - Additional arguments to log
 */
function debugLog(message, ...args) {
  if (DEBUG_MODE) {
    console.log(`[${exId.toUpperCase()}]`, message, ...args);
  }
}

/**
 *
 */
var mapObj;

/**
 * Draw module
 */
var cloud;

// global layer
var ticketItems

var _clearTicket = function () {
  debugLog("Clearing ticket layer");
  try {
    // if ticketItems is not yet defined, return
    if (!ticketItems) {
      return;
    }

    // Also ensure the cluster group is properly refreshed
    if (mapObj && mapObj.hasLayer(ticketItems)) {
      mapObj.removeLayer(ticketItems);
      // set to null
      ticketItems = null; 
    }
  } catch (error) {
    console.warn("Error clearing ticket layers:", error);
  }
};


var styles = require("./style.js");
var DataSyncStatus = require("./components/DataSyncStatus.js");
var TaskDetails = require("./components/TaskDetails.js");
var TaskAutocomplete = require("./components/TaskAutocomplete.js");
var TaskRegistration = require("./components/TaskRegistration.js");

// TODO: These values should be hidden
const dv_tenant = "5bddbbaa-b9b7-432d-88b7-baa4aeaa7b25";


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

    /**
     *
     * Native Leaflet object
     */
    mapObj = cloud.get().map;

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

      if (dict[txt] && dict[txt][window._vidiLocale]) {
        return dict[txt][window._vidiLocale];
      } else {
        return txt;
      }
    };

    /**
     *
     */
    class OrbiInsight extends React.Component {
      constructor(props) {
        super(props);

        const defaultState = {
          data: [],
          tasktype: [],
          selectedTask: null,
          lastSyncTime: null,
          autoSync: false,
          selectedTaskType: null,
          allowWrite: false,
          isTaskRegistrationActive: false, // Track if task registration workflow is active
        };

        this.state = {
          ...defaultState,
          active: false,
        };
      }

      /**
       * Helper function to show error in snackbar
       * @param {string|Error} error - The error message or error object
       */
      showError = (error) => {
        const errorMessage = (typeof error === 'string') ? error : (error.message || 'Der opstod en uventet fejl');
        ToastUtils.showError(utils, errorMessage);
      }

      /**
       * Helper function to show success message in snackbar
       * @param {string} message - The success message
       */
      showSuccess = (message) => {
        ToastUtils.showSuccess(utils, message);
      }

      /**
       * Handle activation on mount
       */
      componentDidMount() {
        let me = this;

        // Activates module
        backboneEvents.get().on(`on:${exId}`, () => {
          debugLog("Activating");
          me.setState({
            ...me.defaultState,
            active: true,
          });

          // if logged in, get user
          if (me.state.authed) {
            this.handleReload();
          } 
        });

        // Deactivates module
        backboneEvents.get().on(`off:${exId} off:all reset:all`, () => {
          debugLog("Deactivating");
          // Reset cursor style
          utils.cursorStyle().reset();

          // Clear map layers
          _clearTicket();

          me.setState({ 
            ...me.defaultState,
            active: false,
          });
        });

      
        // On auth change, handle Auth state
        backboneEvents.get().on(`session:authChange`, () => {
          debugLog("Auth changed!");
          fetch("/api/session/status")
            .then((r) => r.json())
            .then((obj) => {
              debugLog("Auth status:", obj.status.authenticated);
              return me.setState({
                authed: obj.status.authenticated,
              });
            })
            .then(() => {
              // if logged in, get user
              if (me.state.authed) {
                this.handleReload(true);
              } else {
                // Clear map layers
                _clearTicket();
              }
            })
            .catch((e) => {
              console.error("Error in session:authChange", e);
              this.showError('Der opstod en fejl ved autentificering');
            })
        });
      }

      /**
       * Get ticket data from backend
       * @returns {Promise<void>}
       * @private
       */
      getData(force = false) {
        let me = this;
        // We call the backend to get data, which may be cached there

        // loading
        me.setState({
          loading: true,
        });

        let uri = `/api/extension/orbiinsight/${dv_tenant}`;
        if (force) {
          uri += "?force=true";
        }

        return fetch(uri)
          .then((r) => r.json())
          .then((resp) => {
            return new Promise((resolve) => {
              me.setState({
                data: resp.data,
                tasktype: resp.tasktype,
                loading: false,
                lastSyncTime: resp.lastUpdated ? new Date(resp.lastUpdated) : null,
                allowWrite: resp.allowWrite || false,
              }, () => {
                resolve(resp.data);
              });
            });
          })
          .catch((e) => {
            console.warn("Error fetching data from backend:", e);
            me.setState({
              loading: false,
            });
            
            me.showError('Der opstod en fejl ved hentning af data');
            throw e;
          }); 
      }

      /**
       * Get the task type for a given task
       * @param {string} featureGuid
       * @returns {Object}
       */
      getTaskType(tasktypeGuid) {
        const s = this.state;
        if (!tasktypeGuid) return null;
        debugLog("Getting task + type for task guid:", tasktypeGuid);

        const tasktype = s.tasktype.find((item) => item.guid === tasktypeGuid);

        debugLog("Found task type:", tasktype);
        return tasktype;
      }

      /**
       * Save the task changes
       * @param {string} taskId
       * @param {Object} formValues
       * @returns {Promise<void>}
       */
      handleSave = async (taskId, formValues) => {
        try {
          debugLog('Saving task:', taskId, formValues);
          // Make API call to save task
          const response = await fetch(`/api/extension/orbiinsight/${dv_tenant}/task/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(formValues)
          });
          
          if (response.ok) {
            // Refresh data and selected task
            await this.handleReload();
            // Optionally re-select the task to get updated data
            // this.selectTask(updatedTask);
            
            this.showSuccess("Opgave er opdateret succesfuldt");
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error saving task:', error);
          this.showError('Der opstod en fejl ved opdatering af opgaven');
          throw error; // Re-throw to allow calling code to handle if needed
        }
      };

      /**
       * Handle marker selection and zoom
       */
      selectTask = (feature) => {
        // If the feature is already selected, do nothing
        if (this.state.selectedTask && this.state.selectedTask.properties.guid === feature.properties.guid) {
          return;
        }

        // Zoom to the selected task
        this.zoomToTask(feature);

        // Get the updated feature from backend, and set as selected
        fetch(`/api/extension/orbiinsight/${dv_tenant}/task/${feature.properties.guid}`)
          .then((r) => r.json())
          .then((updatedFeature) => {
            this.setState({
              selectedTask: updatedFeature || null,
              selectedTaskType: this.getTaskType(updatedFeature.properties.taskTypeGuid) || null,
            });
          })
          .catch((e) => {
            console.warn("Error fetching task from backend:", e);
            this.showError('Der opstod en fejl ved hentning af opgave detaljer');
          });
      };

      /**
       * Zoom to a specific task feature
       */
      zoomToTask = (feature) => {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
          console.warn("Invalid feature for zooming");
          return;
        }

        // Derive latlng from feature coordinates
        var latlng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
        
        // Zoom to the marker location
        mapObj.setView(latlng, 18);
      };

      /**
       * Deselects any selected task
       */
      deselectTask = () => {
        this.setState({
          selectedTask: null,
          selectedTaskType: null,
        });
      };

      /**
       * Styles and adds ventiler to the map
       */
      addTicketToMap(features) {
        // Create the layer anew
        ticketItems = new L.markerClusterGroup({
          maxClusterRadius: 100,
          polygonOptions: {
            weight: 0,
            fillColor: "#333333",
            fillOpacity: 0.5,
          },
          disableClusteringAtZoom: 15, // Disable clustering at high zoom levels
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          maxZoom: 18,
          iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            
            if (count > 100) {
              size = 'large';
            } else if (count > 10) {
              size = 'medium';
            }
            
            return new L.DivIcon({
              html: '<div><span>' + count + '</span></div>',
              className: 'marker-cluster marker-cluster-' + size,
              iconSize: new L.Point(40, 40)
            });
          }
        });


        try {
          // Get current zoom level for responsive marker sizing
          const currentZoom = mapObj.getZoom();
          
          // for each ticket, add a marker
          for (let feature of features) {

            // TODO: implement filter here

            var ll = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            
            // Use enhanced styling from style.js
            const markerOptions = styles.ticketToLayer(feature, currentZoom);
            var marker = L.circleMarker(ll, markerOptions);
            
            // Set title and apply enhanced tooltip
            marker.feature = feature;
            styles.onEachTicket(feature, marker);

            // Add click event to select marker and zoom
            marker.on('click', (e) => {
              this.selectTask(feature);
            });

            // Add hover effects
            marker.on('mouseover', function(e) {
              this.openTooltip();
            });
            
            marker.on('mouseout', function(e) {
              this.closeTooltip();
            });

            // Add 
            ticketItems.addLayer(marker);
          }

          // if map has no maxZoom, set to 20 - needed to avoid leaflet warning
          mapObj.setMaxZoom(20);

          // Add to map
          mapObj.addLayer(ticketItems);
        } catch (error) {
          console.warn(error);
        } 
      }

      /**
       * Simulates a click on the login button
       */
      clickLogin() {
        document.querySelector('[data-bs-target="#login-modal"]').click();
      }

      /**
       * Handle reload button click // sign-in // switch etc.
       */
      handleReload = async (force = false) => {
        try {
          const data = await this.getData(force);

          // Build map layers from data
          // First clear existing layers
          _clearTicket();
          if (!data || data.length === 0) {
            debugLog("No data to add to map");
            return;
          } else {
            debugLog("Adding data to map");
            this.addTicketToMap(data);
          }
        } catch (error) {
          console.warn("Error in handleReload:", error);
          this.showError('Der opstod en fejl ved indlæsning af data');
        }
      };

      /**
       * Handle auto-sync toggle
       */
      handleAutoSyncToggle = (enabled) => {
        this.setState({
          autoSync: enabled
        });
      };

      /**
       * Handle task registration
       */
      handleTaskRegistration = async (taskData) => {
        try {
          debugLog('Registering new task:', taskData);
          
          const response = await fetch(`/api/extension/orbiinsight/${dv_tenant}/task`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
          });
          
          if (response.ok) {
            const result = await response.json();
            debugLog('Task registered successfully:', result);
            
            // Refresh data to show the new task
            await this.handleReload(true);
            
            return result;
          } else {
            const errorText = await response.text();
            throw new Error(`Failed to register task: ${response.status} ${errorText}`);
          }
        } catch (error) {
          console.error('Error registering task:', error);
          this.showError('Der opstod en fejl ved oprettelse af opgaven');
          throw error;
        }
      };

      /**
       * Handle task registration workflow state changes
       */
      handleTaskRegistrationStateChange = (isActive) => {
        this.setState({
          isTaskRegistrationActive: isActive
        });
      };

      /**
       * Renders component
       */
      render() {
        const _self = this;
        const s = _self.state;

        // If not logged in, show login button
        if (s.authed) {
          // Logged in
            return (
            <div role="tabpanel">
              <div>
              <DataSyncStatus
                lastSyncTime={s.lastSyncTime}
                onReload={this.handleReload}
                isLoading={s.loading}
                autoSync={s.autoSync}
                onAutoSyncToggle={this.handleAutoSyncToggle}
              />

              {s.allowWrite && !s.selectedTask && (
                <TaskRegistration
                  taskTypes={s.tasktype}
                  allowWrite={s.allowWrite}
                  onSubmit={this.handleTaskRegistration}
                  onStateChange={this.handleTaskRegistrationStateChange}
                  mapObj={mapObj}
                  utils={utils}
                />
              )}
              

              {!s.isTaskRegistrationActive && s.data && !s.selectedTask && (
                <TaskAutocomplete
                  data={s.data}
                  searchKeys={['domain', 'incidentTypeName', 'taskTypeString', 'addressString','contactPerson', 'contactEmail','contactName']}
                  onSelect={this.selectTask}
                  onClear={this.deselectTask}
                  className="mb-3"
                />
              )}

              {s.selectedTask && (
                <TaskDetails
                task={s.selectedTask}
                tasktype={s.selectedTaskType}
                onDeselectTask={this.deselectTask}
                onZoomToTask={this.zoomToTask}
                onSave={this.handleSave}
                allowWrite={s.allowWrite}
                />
              )}
              </div>
            </div>
            );
        }

        // Not Logged in - or not configured
        return (
          <div role = "tabpanel" >
            <div className = "form-group" >
                <div id = "blueidea-feature-login" className = "alert alert-info" role = "alert" >
                    {__("Man skal være logget ind for at benytte denne funktion.")}
                </div>
                <div className="d-grid mx-auto">
                    <button onClick = {() => this.clickLogin()} type="button" className="btn btn-primary">{__("Login")}</button>
                </div>
            </div>
        </div>
        );
      }
    };

    // Create main tab
    utils.createMainTab(
      exId,
      "Orbi Insight DV",
      "For at benytte denne funktion skal du have en aktiv konto hos Geopartner, samt adgang til Orbi Insight DV.",
      require("./../../../browser/modules/height")().max,
      "bi-list-task",
      false,
      exId
    );

    // Append to DOM
    //==============
    try {
      ReactDOM.render(<OrbiInsight ref={OrbiInsightRef}/>, document.getElementById(exId));
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
