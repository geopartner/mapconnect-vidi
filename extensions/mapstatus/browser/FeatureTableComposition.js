/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import DraggableBox from "./DraggableBox.js";
import FeatureTablePipe from "./FeatureTablePipe.js";
import FeatureTableNode from "./FeatureTableNode.js";
import { getResolutions } from '../../../browser/modules/crs';
import { booleanIntersects as turfIntersects, buffer as turfBuffer } from "@turf/turf";
import { feature as turfFeature, point as turfPoint } from "@turf/helpers";
import { convert as geojsonToWKT } from "terraformer-wkt-parser";
class FeatureTableComposition extends React.Component {
    static get Ledninger() {  return 'ledninger';  }
    static get Broende() {  return 'bronde';  }
    constructor(props) {
        super(props);
        this.state = {
            activeTab: FeatureTableComposition.Ledninger,
            autoZoom: true,
            selectFeatureAtClick: false // true=tilføj udpeget feature, false=vælg feature  
        };
        this.map = props.map;
    }

    setActiveTab = (tab) => {
        this.setState({ activeTab: tab }, () => {
            const pipeActive = this.isPipeActive;
            this.props.pipeManager?.setInterActivity(pipeActive);
            this.props.nodeManager?.setInterActivity(!pipeActive);
            const featureClick = this.state.selectFeatureAtClick;
            this.setState({ selectFeatureAtClick: false }, () => {
                this.setState({ selectFeatureAtClick: featureClick });
            });
        });   
    }; 

    componentDidMount() {
        $('.bi-layout-text-window').on('click', function () { });

        this.props.backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:update`, () => {
            // this.forceUpdate();
            if (!this.props.isReadOnly) {
                this.props.pipeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
                this.props.nodeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
            }
        });

        this.props.backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:updatedata`, (featuresManager) => {
            if (!this.props.isReadOnly && featuresManager) {
                featuresManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
            }
        });

        if (this.map) {
            this.map.on('click', this.handleMapClick);
        }
        this.setActiveTab(FeatureTableComposition.Ledninger);
    };

    componentWillUnmount() {
        if (this.map) {
            this.map.off('click', this.handleMapClick);
        }
    };
     
    get isPipeActive()   {
        return this.state.activeTab === FeatureTableComposition.Ledninger;
    };
    

    handleMapClick = async (e) => {
        if (!this.map) {
            console.error("Map is not initialized.");
            return;
        }

        if (!this.state.selectFeatureAtClick)
            return;
        const distance = 5 * getResolutions(window.vidiConfig.crs)[this.map.getZoom()];
        const clickFeature = turfBuffer(turfPoint([e.latlng.lng, e.latlng.lat]), distance, { units: 'meters' });
        const wkt = geojsonToWKT(clickFeature.geometry)
                
        const featuresManager = this.isPipeActive ? this.props.pipeManager : this.props.nodeManager;
        await _makeSearch(wkt, false, featuresManager);
        this.forceUpdate(); 
    };

    updateData = async () => {
        if (this.isPipeActive) {
            await this.props.pipeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
        } else {
            await this.props.nodeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
        }
        this.forceUpdate();
    };

    updateDataNode = async () => {
        await this.props.nodeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
        this.forceUpdate();
    };
     exportExcel = () => {
        if (!this.props.activeProject) {
            alert("Ingen aktivt projekt valgt.");
            return;
        }
        const kundenavn = this.props.kundenavn;
        const excelExportManager = new ExcelExportManager(this.props.activeProject, this.props.nodeManager, this.props.pipeManager);
        excelExportManager.downloadExcel(kundenavn);
    };

    render() {
        const {
            activeTab,
        } = this.state;
        const isReadOnly = this.props.isReadOnly;
        const nodeManager = this.props.nodeManager;
        const pipeManager = this.props.pipeManager;
        const skema = this.props.skema;
        return (
            <DraggableBox  // for pipes and nodes
                headerText={`Underprojekt ${this.props.activeProject.navn}`}
                onExcel={() => {
                    this.exportExcel();
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
            >
                <>
                    <ul className="nav nav-tabs justify-content-start" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === FeatureTableComposition.Ledninger ? "active" : ""}`}
                                onClick={() => this.setActiveTab( FeatureTableComposition.Ledninger)} 
                                type="button"
                                role="tab"
                            >
                                Ledninger ({pipeManager.length()})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === FeatureTableComposition.Broende ? "active" : ""}`}
                                onClick={() => this.setActiveTab(FeatureTableComposition.Broende)}
                                type="button"
                                role="tab"
                            >
                                Brønde ({nodeManager.length()})
                            </button>
                        </li>
                    </ul>

                    {/* Tab content */}
                    <div className="tab-content">
                        {activeTab === FeatureTableComposition.Ledninger && (
                            <div className="tab-pane fade show active" role="tabpanel">
                                <FeatureTablePipe
                                    autoZoom={this.state?.autoZoom}
                                    activeProject={this.props.activeProject}
                                    backboneEvents={this.props.backboneEvents}
                                    className="border border-secondary pa-1 ma-1"
                                    featuresManager={pipeManager}
                                    skema={skema}
                                    selectedFeatureIds={pipeManager?.selectedFeatureIdsGet()}
                                    selectFeatureAtClick={this.state.selectFeatureAtClick}
                                    onClickExportExcel={() => { this.exportExcel(); }}
                                    onAutoZoomChange={() => {
                                        this.setState({ autoZoom: !this.state.autoZoom });
                                    }}
                                    onDataUpdated={this.updateData}
                                    onTableRowClick={(feature, index) => {
                                        this.setState({ selectFeatureAtClick: false, selectedFeature: feature });
                                    }}
                                    onAddFeatureToggle={() => {
                                        this.setState({ selectFeatureAtClick: !this.state.selectFeatureAtClick });
                                        const cursor = this.state.selectFeatureAtClick ? "crosshair" : "pointer";
                                        this.map.getContainer().style.cursor = cursor;
                                    }}
                                    styles={styleObject}
                                    isReadOnly={isReadOnly}
                                />
                            </div>
                        )}

                        {activeTab === FeatureTableComposition.Broende && (
                            <div className="tab-pane fade show active" role="tabpanel">
                                <FeatureTableNode
                                    autoZoom={this.state?.autoZoom}
                                    activeProject={this.props.activeProject}
                                    backboneEvents={this.props.backboneEvents}
                                    className="border border-secondary pa-1 ma-1"
                                    featuresManager={nodeManager}
                                    skema={skema}
                                    selectedFeatureIds={nodeManager?.selectedFeatureIdsGet()}
                                    selectFeatureAtClick={this.state.selectFeatureAtClick}
                                    onClickExportExcel={() => { this.exportExcel(); }}
                                    onAutoZoomChange={() => {
                                        this.setState({ autoZoom: !this.state.autoZoom });
                                    }}
                                    onDataUpdated={this.updateDataNode}
                                    onTableRowClick={(feature, index) => {
                                        this.setState({ selectFeatureAtClick: false, selectedFeature: feature });
                                    }}
                                    onAddFeatureToggle={() => {
                                        this.setState({ selectFeatureAtClick: !this.state.selectFeatureAtClick });
                                        const cursor = this.state.selectFeatureAtClick ? "crosshair" : "pointer";
                                        this.map.getContainer().style.cursor = cursor;
                                    }}
                                    styles={styleObject}
                                    isReadOnly={isReadOnly}
                                />
                            </div>
                        )}
                    </div>
                </>
            </DraggableBox>
        )
    }
}
export default FeatureTableComposition;