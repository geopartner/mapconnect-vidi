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

    constructor(props) {
        super(props);
        this.state = {
            activeTab: "ledninger",
            autoZoom: true,
            selectFeatureAtClick: false // true=tilføj udpeget feature, false=vælg feature  
        };
        this.map = props.map;
    }

    setActiveTab = (tab) => {
        this.setState({ activeTab: tab, selectFeatureAtClick: false });
    };

    componentDidMount() {
        $('.bi-layout-text-window').on('click', function () { });

        this.props.backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:update`, () => {
            this.forceUpdate();


            if (!this.props.isReadOnly) {
                this.props.pipeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
                this.props.nodeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
            }
        });

        this.props.backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:updatedata`, (featuresManager) => {
            this.forceUpdate();
            if (!this.props.isReadOnly && featuresManager) {

                featuresManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
            }
        });

        if (this.map) {
            this.map.on('click', this.handleMapClick);
        }
    };

    componentWillUnmount() {
        if (this.map) {
            this.map.off('click', this.handleMapClick);
        }
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
        const pipe = this.state.activeTab === "ledninger";
        const featuresManager = pipe ? this.props.pipeManager : this.props.nodeManager;
        await _makeSearch(wkt, false, featuresManager);
    };

    updateData = async () => {
        await this.state.pipeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
        this.forceUpdate();
    };

    updateDataNode = async () => {
        await this.state.nodeManager?.saveFeatureAsync(this.props.skema, this.props.activeProject);
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
                                className={`nav-link ${activeTab === "ledninger" ? "active" : ""}`}
                                onClick={() => this.setActiveTab("ledninger")}
                                type="button"
                                role="tab"
                            >
                                Ledninger ({pipeManager.length()})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "bronde" ? "active" : ""}`}
                                onClick={() => this.setActiveTab("bronde")}
                                type="button"
                                role="tab"
                            >
                                Brønde ({nodeManager.length()})
                            </button>
                        </li>
                    </ul>

                    {/* Tab content */}
                    <div className="tab-content">
                        {activeTab === "ledninger" && (
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

                        {activeTab === "bronde" && (
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