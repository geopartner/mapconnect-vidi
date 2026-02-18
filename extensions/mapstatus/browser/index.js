/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

'use strict';
import React from 'react';

// browser components:
import CreateProjectForm from "./CreateProjectForm.js";
import FeatureTableComposition from './FeatureTableComposition.js'

import ProjectSelector from "./ProjectSelector.js";

import styleObject from "./style.js";
// managers
import ExcelExportManager from '../manager/ExcelExportManager.js';
import SelectedFeaturesManager from '../manager/SelectedFeaturesManager.js';
import ProjectManager from '../manager/ProjectManager.js';
// 
import { convert as geojsonToWKT } from "terraformer-wkt-parser";

const MAPSTATUS_MODULE_NAME = `mapstatus`;

require("./style.js");

let backboneEvents;
let qstore = [];

let _self = false;
var cloud;
let drawControl = null;

let nodeManager = null;
let pipeManager = null;


let meta;
let sqlQuery;
var layerTree = require("./../../../browser/modules/layerTree");

var switchLayer = require("./../../../browser/modules/switchLayer");
var utils;

const _makeSearch = async (wkt, addToExisting, featuresManager) => {
    try {
        const fullLayerName = _self.fullLayerName(featuresManager.getFeatureName());

        if (!wkt || !fullLayerName) {
            return;
        }

        let newFeatureId = 0;

        await new Promise((resolve, reject) => {
            sqlQuery.init(
            qstore,
            wkt,
            "4326",
            () => {
                if (qstore.length >= 1 && qstore[0].geoJSON) {
                    try {
                    qstore[0].geoJSON.features.forEach(feature => {
                        const isAdded = featuresManager?.addFeature(feature, addToExisting);
                        if (isAdded && addToExisting) {
                            newFeatureId = feature.properties.id;
                        }
                    });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            } else {
                resolve();
            }
        },
        null,
        null,
        null,
        [fullLayerName],
        true,
        null,
        null
        ); });

        // Når await ovenfor er færdig:
        if (!addToExisting) {
            featuresManager?.redraw(0);
        } else {
            featuresManager?.redraw(newFeatureId);
        }

        backboneEvents.get().trigger(`${MAPSTATUS_MODULE_NAME}:updatedata`, featuresManager);

    } catch (e) {
        console.error("Error in _makeSearch:", e);
    }
};


const exId = "mapstatus";
module.exports = {
    /**
     *
     * @param o
     * @returns {exports}
     */
    set: function (o) {

        backboneEvents = o.backboneEvents;
        bindEvent = o.bindEvent;
        cloud = o.cloud;
        draw = o.draw;
        layers = o.layers;
        layerTree = o.layerTree;
        let map = cloud.get().map;
        meta = o.meta;
        serializeLayers = o.serializeLayers;
        sqlQuery = o.sqlQuery;
        state = o.state;
        switchLayer = o.switchLayer;
        utils = o.utils;

        _self = this;

        return this;
    },
    /**
    *
    */


    init: function () {
        const dict = {};

        const ReactDOM = require('react-dom');

        backboneEvents.get().on(`reset:all reset:${MAPSTATUS_MODULE_NAME}`, () => {
            _self.reset();
        });
        backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:disableReadOnly`, () => {
            _self.startDrawControl(true);
        });
        backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:enableReadOnly`, () => {
            _self.off();
        });

        _self.active(true);

      
        utils.createMainTab(exId, utils.__("MapStatus", dict), utils.__("Info", dict), require('./../../../browser/modules/height')().max, "bi bi-layout-text-window");
       
        function nodeFilterFunction(feature) {
            return feature.properties.knudetype === "Brønd" ||
                feature.properties.knudetype === "Sandfang";
        }
        nodeManager = new SelectedFeaturesManager(
            cloud.get().map, backboneEvents, MAPSTATUS_MODULE_NAME,
            'knude_drift', 'geojsonnodes', nodeFilterFunction, true
        );

        pipeManager = new SelectedFeaturesManager(
            cloud.get().map, backboneEvents, MAPSTATUS_MODULE_NAME,
            'ledning_drift', 'geojson', null, false
        );
       


        class MapStatus extends React.Component {

            constructor(props) {
                super(props);
                this.map = props.map;
                const skema = this.getSkema();
                this.projectManager = new ProjectManager(skema);
              
                this.state = {
                    activeProject: this.projectManager.createProjectData(skema) || {},
                    createCustomer: false,
                    createProject: false,
                    projectManager: this.projectManager,
                    pipeManager: props.pipeManager,
                    nodeManager: props.nodeManager,
                    isLoggedIn: false,
                    pipeIsActive: true,
                    isReadOnly: true,
                    projects: [],
                    selectedFeature: {},
                    selectFeatureAtClick: false // true=tilføj udpeget feature, false=vælg feature  
                };
                this.portalContainer = document.createElement('div');
                document.body.appendChild(this.portalContainer);
            }

            componentWillUnmount() {
                document.body.removeChild(this.portalContainer);
            }

            componentDidMount() {
                this.buildProjectList();
            }

            componentDidUpdate() {
            }

            buildProjectList = () => {
                const skema = this.getSkema();

                this.state.projectManager?.getAllProjects(skema)
                    .then((projectOptionsObj) => {

                        const projectOptions = projectOptionsObj.projects;

                        this.setState({ isReadOnly: projectOptionsObj.isReadOnly });
                        this.setState({ isLoggedIn: projectOptionsObj.isLoggedIn });

                        if (projectOptions && projectOptions.length > 0) {
                            this.setState({ projects: projectOptions });
                        } else {
                            this.setState({ projects: [] });
                        }

                        if (!projectOptionsObj.isReadOnly) {
                            backboneEvents.get().trigger(`${MAPSTATUS_MODULE_NAME}:disableReadOnly`);
                        } else {
                            backboneEvents.get().trigger(`${MAPSTATUS_MODULE_NAME}:enableReadOnly`);
                        }

                    })
                    .catch((error) => {
                        this.setState({ isLoggedIn: false });
                        this.setState({ isLoggedIn: true });
                        this.forceUpdate();
                        console.log("Error fetching projects:", error);
                    });
            };

            exportExcel = () => {
                if (!this.state.activeProject) {
                    alert("Ingen aktivt projekt valgt.");
                    return;
                }
                const kundenavn = this.getKundeNavn();
                const excelExportManager = new ExcelExportManager(this.state.activeProject, this.state.nodeManager, this.state.pipeManager);
                excelExportManager.downloadExcel(kundenavn);
            };

            getKundeNavn = () => {
                if (this.state.activeProject && this.state.activeProject.kundeNavn) {
                    return this.state.activeProject.kundeNavn;
                }
                return '';
            }

            getProjectName = () => {
                let projectName = this.getSkema();
                projectName = projectName.replace('dd_', '');
                projectName = projectName.replace('_', ' ');
                projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1)
                return projectName;
            }

            getSkema = () => {
                const words = window.location.pathname.split("/").filter(Boolean);
                return words.length > 0 ? words[words.length - 1] : '';
            }


            handleProjectChange = (updatedProject) => {
                this.setState({ activeProject: updatedProject });
            };

            handleProjectSave = () => {
                this.state.projectManager?.saveProjectMetaAsync(this.state.activeProject)
                    .then((data) => {
                        this.buildProjectList(data);
                        this.setState({ createProject: false });
                        if (data.returning !== null && data.returning.length && data.returning[0]?.id) {
                            this.handleProjectSelect(data.returning[0].id, true);
                        }
                    })
                    .catch((error) => {
                        console.error("Fejl ved gem af projekt:", error);
                    });
            }

            handleProjectSelect = async (selectedProjectId, forceUpdate) => {
                _self.active(true);
                const isNewProject = selectedProjectId == 0;
                const skema = this.getSkema();  
                const { pipeManager, nodeManager, projectManager } = this.state;

                pipeManager?.clear();
                nodeManager?.clear();

                if (isNewProject) {
                    this.setState({ activeProject: this.projectManager.createProjectData(skema) });
                    return;
                }
                try {
                    const projektData = await projectManager?.getProjectAsync(
                        selectedProjectId,
                        this.projectManager.createProjectData(skema)
                    );

                    this.setState({ activeProject: projektData });

                    this.setState((prev) => ({
                        activeProject: projektData,
                        projects: [...prev.projects, projektData]
                    }));

                    pipeManager?.buildProjectFeatures(projektData);
                    const pipeFeatures = pipeManager?.getFeaturesIdSort();
                    if (pipeFeatures?.length > 0) {
                        pipeManager?.redraw(null);
                        pipeManager?.zoomToFeature(pipeFeatures[0]);
                        try {
                            pipeManager?.zoomAll();
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    nodeManager?.buildProjectFeatures(projektData);
                    const nodeFeatures = nodeManager?.getFeaturesIdSort();
                    if (nodeFeatures?.length > 0) {
                        nodeManager?.redraw(null);
                    }

                    if (forceUpdate && nodeFeatures?.length > 0) {
                        this.forceUpdate();
                    }

                } catch (error) {
                    console.error("Error fetching project:", error);
                }
            };

            get isNewProject() {
                return this.state.activeProject.id == 0;
            }

            render() {
                const {
                    activeProject,
                    createProject,
                    isLoggedIn,
                    isReadOnly,
                    projects } = this.state;

                const isProjectSelected = activeProject && activeProject.id !== 0;
                const skemaName = this.getProjectName();
                const skema = this.getSkema();
                const kundenavn = this.getKundeNavn();

                return (

                    <div role="tabpanel">
                        <div className="row fw-bold ">
                            <p className="col-4">Projekt</p>
                            <p className="col-7">
                                {skemaName.toUpperCase()}
                            </p>
                            <hr></hr>
                        </div>
                        {/* hvis man ikke er logget ind, vis login knap */}
                        {!isLoggedIn && (
                            <div className="row">
                                <div className="fw-bold col-md-12">
                                    <p>Login og tryk på start</p>
                                    <button
                                        className="btn btn-primary mt-2 w-100 "
                                        onClick={this.buildProjectList}>
                                        Start
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* alm. bruger og der ikke oprettet projekter endnu */}
                        {isLoggedIn && isReadOnly && projects.length === 0 && (
                            <div className="row">
                                <div className="fw-bold col-md-12">
                                    <p>Der er ikke oprettet projekter af administrator</p>
                                </div>
                            </div>
                        )}

                        {!isReadOnly && !createProject && !isProjectSelected && (
                            <button
                                className="btn btn-primary mb-3 w-100"
                                onClick={() => this.setState({ createCustomer: false, createProject: true })}
                            >Opret nyt underprojekt</button>
                        )}
                        <div className="mb-3" style={styleObject.formDialog}>

                            {isLoggedIn && !createProject && (
                                <ProjectSelector
                                    projects={this.state.projects}
                                    selectedProject={this.state.selectedProject}
                                    onSelectChange={this.handleProjectSelect}
                                    isProjectSelected={isProjectSelected}
                                    onClickExportExcel={() => { this.exportExcel(); }}
                                />
                            )}

                            {isLoggedIn && (createProject || isProjectSelected) && (
                                <CreateProjectForm
                                    activeProject={this.state.activeProject}
                                    isNewProject={!isProjectSelected}
                                    isReadOnly={isReadOnly}
                                    onSaveClick={this.handleProjectSave}
                                    onRejectClick={() => this.setState({ createProject: false })}
                                    onProjectChange={this.handleProjectChange}
                                    onDrawNewProject={_self.startDraw}
                                    skema={skema}
                                    style={styleObject}
                                />
                            )}
                        </div>


                        {this.state.pipeManager && !this.isNewProject &&
                            ReactDOM.createPortal(
                                <FeatureTableComposition
                                    activeProject={this.state.activeProject}
                                    backboneEvents={backboneEvents}
                                    isReadOnly={isReadOnly}
                                    kundenavn={kundenavn}
                                    map={this.map}
                                    nodeManager={this.state.nodeManager}
                                    onExcel={() => { this.exportExcel(); }}
                                    onMouseDown={(e) => { e.stopPropagation(); }}
                                    pipeManager={this.state.pipeManager}
                                    projectManager={this.state.projectManager}
                                    skema={skema}
                                />, this.portalContainer)

                        }
                    </div>


                );
            }
        }

        try {
            ReactDOM.render(<MapStatus nodeManager={nodeManager} pipeManager={pipeManager} map={cloud.get().map} />, document.getElementById(exId));

        } catch
        (e) {
            console.error("Error in MapStatus:", e);
        }
    },

    off: () => {
        if (drawControl) {
            cloud.get().map.removeControl(drawControl);
            drawControl = null;
        }
    },

    on: () => {
        _self.startDrawControl(true);
    },

    reset: () => {
        console.log("reset");
    },

    active: (active) => {
        try {
            _self.startDrawControl(active);
        }
        catch (e) {
            console.error(e);
        }
    },

    fullLayerName: (layerId) => {
        const metaData = meta.getMetaData();
        const layer = metaData.data.find(f => f.f_table_name == layerId);
        if (layer) {
            return `${layer.f_table_schema}.${layer.f_table_name}`;
        } else {
            console.error("Layer not found in metadata: " + layerId);
            return '';
        }
    },

    startDraw: () => {
        backboneEvents.get().trigger('draw:drawstart');
        if (!drawControl) {
            _self.startDrawControl(true);
        }
        var polygonDrawer = new L.Draw.Polygon(cloud.get().map, drawControl.options.draw.polygon);
        polygonDrawer.enable();

        cloud.get().map.on('draw:created', function (e) {
            var layer = e.layer;
            // drawnItems.addLayer(layer); // Legger til polygonen i feature-gruppen
            _self.startShapeSearch(e);
            backboneEvents.get().trigger(`${MAPSTATUS_MODULE_NAME}:updatedata`, null)
            polygonDrawer.disable();
        });
    },

    startDrawControl: (enable) => {

        _self.bindDrawEvents();
        if (drawControl || !enable) {
            return
        }

        drawControl = _self.createDrawControl();
        //  cloud.get().map.addControl(drawControl); skal ikke tilføjes, da det er en del af mapstatus
        searchOn = true;
        _self.bindDrawEvents();

        const po = $('.leaflet-draw-toolbar-top').popover({
            content: __("Brug værktøjet til at tegne polygoner, linjer og punkter på kortet. Du kan også redigere og slette eksisterende objekter."),
            trigger: "manual",
            placement: "left",
            customClass: "d-none d-lg-inline"
        });
        po.popover("show");
        setTimeout(function () {
            po.popover("hide");
        }, 2500);
    },

    startShapeSearch: async (drawEvent) => {
        try {
            var layer = drawEvent.layer;
            var geojson = layer.toGeoJSON();
            var wkt = geojsonToWKT(geojson.geometry);

            pipeManager?.clear();
            nodeManager?.clear();

            await _makeSearch(wkt, true, pipeManager);
            await _makeSearch(wkt, true, nodeManager);
        } catch (e) {
            console.error("Error in draw:created event:", e);
        }
    },

    bindDrawEvents: () => {
        backboneEvents.get().trigger(`drawing:turnedOn`);
        cloud.get().map.on('draw:editstop', function (e) {
            _self.startShapeSearch(e);
        });
    },

    createDrawControl: () => {
        if (drawControl) {
            return drawControl;
        }
        return new L.Control.Draw({
            draw: {
                polygon: {
                    title: 'Tegn en polygon!',
                    allowIntersection: false,
                    drawError: {
                        color: '#b00b00',
                        timeout: 1000
                    },
                    shapeOptions: {
                        color: '#662d91',
                        fillOpacity: 0
                    },
                    showArea: true
                },
                rectangle: {
                    shapeOptions: {
                        color: '#662d91',
                        fillOpacity: 0
                    }
                },
                marker: false,
                circlemarker: false,
            },
        });
    },

};