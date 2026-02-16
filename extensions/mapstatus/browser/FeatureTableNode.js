/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import EditDialog from './EditDialog.js';
import NodeMethodComponent from "./NodeMethodComponent.js";
import PipeTerrainComponent from "./PipeTerrainComponent.js";
import styleObject from "./style.js";
import UrlDialog from "./UrlDialog.js";
import ExcelExport from "./ExcelExport.js";

const MAPSTATUS_MODULE_NAME = `mapstatus`;
class FeatureTableNode extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            bemRequired: false,
            isNumeric: true,
            mouseClickXY: props.mouseClickXY || { x: 0, y: 0 },
            showModal: false,
            selectedFeature: {},
            selectedFeatureId: 0,
            selectedRowIndex: -1,
            sortKey: 'id',
            sortDirection: 'asc',
            urlDialog: ''
        };
        this.columns = [
            { key: '-', label: '', isNumeric: false },
            { key: '#', label: '', isNumeric: false },
            { key: 'knudenavn', label: 'Brønd', isNumeric: false },
            { key: 'system', label: 'System', isNumeric: false },
            { key: 'kategori', label: 'Kategori.', isNumeric: false },
            { key: 'knudetype', label: 'Type', isNumeric: false },
            { key: 'dimension', label: 'Dimension', isNumeric: true },
            { key: 'brøndmateriale', label: 'Materiale', isNumeric: true },
            { key: 'dybde', label: 'Dybde', isNumeric: true },
            { key: 'metode', label: 'Metode', isNumeric: false },
            { key: 'terraen', label: 'Terræn', isNumeric: false },
            { key: 'bem', label: 'Bemærkning', isNumeric: false },
            { key: 'pdf', label: <i className="bi bi-file-pdf"></i>, isNumeric: false },
        ];
    };
    rowRefs = [];

    scrollToRow = () => {
        const row = this.rowRefs[this.state.selectedRowIndex];
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    componentDidUpdate(prevProps) {
        if (this.props.backboneEvents) {
            this.props.backboneEvents.get().on(`${MAPSTATUS_MODULE_NAME}:updateSelected`, (selectedFeatureId) => {
                if (!selectedFeatureId)
                    return;
                const si = this.props.featuresManager?.getFeatures().findIndex(feature => feature.properties.id == selectedFeatureId);
                if (si === this.state.selectedRowIndex) {    
                    return; // No change in selection, skip update
                }
                this.setState({ selectedRowIndex: si });
                this.scrollToRow();
                this.props.featuresManager?.hilite(selectedFeatureId);
                
            });
        } else {
            console.warn("No backboneEvents in FeatureTable");
            alert("No backboneEvents in FeatureTable");
        }

    };

    updateData = () => {
        const skema = this.props.skema
        this.props.featuresManager?.saveFeatureAsync(skema, this.props.activeProject);
        this.forceUpdate();
    };

    onBemClick = (e, feature) => {
        if (this.props.isReadOnly) {
            return;
        }
        if (this.state.showModal) {
            return;
        }
        e.stopPropagation();
        this.setState({
            selectedFeature: feature,
            showModal: true,
            mouseClickXY: { x: e.clientX, y: e.clientY }
        });
    }

    handlePdfLink = (knudenavn) => {
        const skema = this.props.skema;
        this.setState({ showModal: false });
        this.props.featuresManager?.getBroendRapportnrAsync(skema, knudenavn)
            .then((url) => {
                if (url) {
                    this.setState({ urlDialog: url });
                } else {
                    alert("Ingen PDF fundet for denne brønd.");
                }
            })
            .catch((error) => {
                console.error("Error fetching PDF link:", error);
                alert("Fejl ved hentning af PDF link: " + error.message);
            });
    };

    handleHeaderClick = (event) => {
        if (event.target.tagName !== 'TH') return;
        const clickedIndex = event.target.cellIndex;
        const column = this.columns[clickedIndex];
        const sortKey = this.columns[clickedIndex].key;

        const isSameColumn = this.state.sortKey === sortKey;
        const newDirection = isSameColumn && this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        
        this.setState({
            isNumeric: column.isNumeric,
            sortKey,
            sortDirection: newDirection
            
        });
        this.forceUpdate();
    }

    onRowClick = (e, feature, index) => {
        this.setState({
            selectedRowIndex: index,
            selectedFeatureId: feature.properties.id,
            mouseClickXY: { x: e.clientX, y: e.clientY }
        });
        if (this.props.autoZoom) {
            this.props.featuresManager?.zoomToFeature(feature);
        }
        this.props.featuresManager?.hilite(feature.properties.id);
        this.setState({ selectedFeature: feature });
    }

    handleRowMultiSelect = (feature, event) => {
        const { selectedFeatureIds } = this.props;
        const featureId = feature.properties.id;
        if (event.shiftKey && selectedFeatureIds.count() > 0) {
            const features = this.props.featuresManager?.getFeatures() || [];
            const lastSelectedIndex = features.findIndex(f => f.properties.id === selectedFeatureIds.getAll()[selectedFeatureIds.count() - 1]);
            const currentIndex = features.findIndex(f => f.properties.id === featureId);
            const range = [lastSelectedIndex, currentIndex].sort((a, b) => a - b);
            const newSelectedFeatures = features.slice(range[0], range[1] + 1).map(f => f.properties.id);
            selectedFeatureIds.addRange(newSelectedFeatures);
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            if (selectedFeatureIds.contains(featureId)) {
                selectedFeatureIds.remove(featureId);
                return
            }
            selectedFeatureIds.add(featureId);
        } else {
            selectedFeatureIds.clear();
            selectedFeatureIds.add(featureId);
        }
    }

    onDeleteFeature = (feature) => {
        if (!this.state.isReadOnly) {
            if (!confirm(`Er du sikker på at du vil fjerne brønd \n${feature.properties.knudenavn}\nfra projektet ?`)) {
                return;
            }
            this.props.featuresManager?.deleteFeatureAsync(this.props.skema, this.props.activeProject, feature);
            this.props.featuresManager?.hilite(0);
            this.updateData();

        } else {
            alert("Du kan ikke slette features i read-only tilstand.");
        }
    }
    onSetMethod = (nodeMethod) => {
        this.props.featuresManager?.setMethod(nodeMethod);
        this.updateData();
    }
    onSetSingleMethod = (nodeMethod) => {
        const bemRequired = nodeMethod === 'Udskiftning af brønd';
        this.setState({ showModal: bemRequired, bemRequired: bemRequired });
    }

    onSetTerrain = (pipeTerrain) => {
        this.props.featuresManager?.setTerrain(pipeTerrain);
        this.updateData();
    }

    render() {
        const {
            featuresManager,
            isReadOnly,
            onAutoZoomChange,
            onAddFeatureToggle,
            onTableRowClick,
            selectedFeatureIds,
            selectFeatureAtClick

        } = this.props;
        const { sortKey, sortDirection } = this.state;
        const detailText = `Brønde: ${featuresManager.selectedCount()} / ${featuresManager.length()}`
        const selectedFeatureCount = featuresManager?.selectedFeatureIdsGet().count() || 0;
        const selectedTxt = selectedFeatureCount === 1 ? "1 valgt" : selectedFeatureCount > 1 ? `${selectedFeatureCount} valgte` : "";
        const features = this.props.featuresManager?.sortFeatures(this.state.sortKey, this.state.sortDirection, this.state.isNumeric);
        const visibeTxt = isReadOnly ? "false" : "true";
        const labelTxt = selectFeatureAtClick ? "Klik i kort: Brønd tilføjes listen" : "Klik i kort: Brønd findes listen";
        const biSelectMapCheck = selectFeatureAtClick ? 'bi bi-plus-square' : 'bi  bi-info-circle';
        const biCheck = this.props.autoZoom ? 'bi bi-check2-circle small' : 'bi bi-circle small';
        return (
            <>
                {this.state.urlDialog && (
                    <UrlDialog
                        url={this.state.urlDialog}
                        onClose={() => this.setState({ urlDialog: '' })}
                    >  </UrlDialog>)
                }
                {this.state.showModal && !isReadOnly && (
                    <EditDialog
                        mouseClickXY={this.state.mouseClickXY}
                        onDataChanged={(featureId, bem, save) => {
                            if (!this.state.isReadOnly && save) {
                                featuresManager?.updateFeatureProperty(featureId, "bem", bem);
                                this.updateData();
                            }
                            if (this.state.bemRequired && (!bem || bem.trim() === '')) {
                                alert("Bemærkning er påkrævet ved udskiftning af brønd.");
                                return;
                            }
                            this.setState({ showModal: false, bemRequired: false });
                        }}
                        feature={this.state.selectedFeature}
                    />
                )}
                <div className="d-flex flex-column" style={{ flex: '1 1 auto', height: '500px', cursor: 'pointer', border: '1px solid gray', padding: '5px' }} >
                    <div className="row mb-2 align-items-end" style={{ flex: '0 0 auto' }} >
                        <div onClick={onAutoZoomChange} className="col-2">
                            <div
                                className="small mb-1"
                                style={{ fontSize: '0.75rem' }}
                                title="Antal i tilbudsliste/ i alt"  >
                                {detailText}
                            </div>
                            <div onClick={onAutoZoomChange} className="small align-items-bottom" >
                                <i
                                    className={biCheck}
                                    onClick={onAutoZoomChange}
                                    style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                                    title="Auto zoom til valgt brønd" > Auto zoom </i>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <div className="col-md-1 text-end">
                                <button
                                    aria-pressed={selectFeatureAtClick}
                                    className="btn btn-primary small ml-2 text-end"
                                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', borderRadius: '0.2rem' }}
                                    id="udpegButton"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="top"
                                    title="Skift mellem at tilføje brønd eller vise i tabellen ved klik i kort"
                                    onClick={onAddFeatureToggle}>
                                    <i className={biSelectMapCheck}></i>
                                </button>
                            </div>
                        )}
                        {!isReadOnly && (
                            <div className="col-md-2  mb-0 word-break" style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', borderRadius: '0.2rem' }}>
                                <label style={{ fontSize: '0.75rem' }} >{labelTxt}</label>
                            </div>
                        )}
                        {!isReadOnly && (
                            <>
                                <div className="col-md-2">
                                    <label className="small mr-1">Reperationsmetode</label>
                                    <NodeMethodComponent
                                        showAdd={true}
                                        enableAdd={true}
                                        onAddMetode={(nodeMethod) => {
                                            this.onSetMethod(nodeMethod);
                                        }}
                                    >
                                    </NodeMethodComponent>
                                </div>
                                <div className="col-md-2">
                                    <label className="small mr-1">Terræn</label>
                                    <PipeTerrainComponent
                                        showAdd={true}
                                        enableAdd={true}
                                        onAddMetode={(pipeTerrain) => {
                                            this.onSetTerrain(pipeTerrain);
                                        }}
                                    >
                                    </PipeTerrainComponent>
                                </div>
                            </>
                        )}
                        {isReadOnly && (
                            <div className="col-md-7" >
                            </div>)}
                        <div className="col-md-2 small">
                            <p >{selectedTxt}</p>
                        </div>
                        <div className="col-md-1">
                            <ExcelExport onClickExportExcel={this.props.onClickExportExcel} />
                        </div>

                    </div>
                    <div style={{ cursor: 'pointer', flex: '1 1 auto', minHeight: '0', overflowY: 'auto'  }} >
                        <table className="table table-striped table-bordered table-hover table-sm" >
                            <thead onClick={(e) => this.handleHeaderClick(e)}>
                                <tr style={styleObject.headerRow} >
                                    {this.columns.map((col, index) => (
                                        <th key={index}
                                            style={index === 0 || index === this.columns.length - 1 ? styleObject.tableHeaderSmall : styleObject.tableHeader} >
                                            {col.label}
                                            {sortKey === col.key && (
                                                <span className="ms-1">
                                                    {sortDirection === 'asc' ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody >
                                {features.map((feature, index) => {
                                    const biCheck = feature.properties.isSelected ? 'bi bi-check2-circle' : 'bi bi-circle';
                                     const pdfClassName ='bi bi-file-pdf';
                                    const styleToUse = selectedFeatureIds.contains(feature.properties.id) ? styleObject.cellStyleLongTextBold : styleObject.cellStyleLongText; //fontWeight
                                    return (
                                        <tr
                                            key={index}
                                            ref={(el) => this.rowRefs[index] = el}
                                            onClick={(e) => {
                                                if (this.state.showModal) return;
                                                this.handleRowMultiSelect(feature, e);
                                                this.onRowClick(e,feature, index)
                                                onTableRowClick(e,feature, index);
                                            }}
                                            className="tableInfo"

                                            style={{
                                                border: selectedFeatureIds.contains(feature.properties.id) ? '4px solid rgb(0, 150, 130)' : '1px solid gray',
                                            }}
                                        >
                                            <td
                                                onClick={() => {
                                                    this.onDeleteFeature(feature)
                                                }}
                                                visible={visibeTxt}
                                                style={styleObject.cellStyle}>
                                                <i className="bi bi-trash"
                                                    readOnly={isReadOnly}
                                                    disabled={isReadOnly}
                                                >
                                                </i>
                                            </td>
                                            <td
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    feature.properties.isSelected = !feature.properties.isSelected;
                                                    this.updateData();
                                                    //this.onCheckboxChange(feature.properties.id, !feature.properties.isSelected);
                                                }}
                                                visible={visibeTxt}>
                                                <i className={biCheck}
                                                    readOnly={isReadOnly}
                                                    disabled={isReadOnly}
                                                >
                                                </i>
                                            </td>
                                            <td style={styleToUse}>{feature.properties.knudenavn}</td>
                                            <td style={styleToUse}>{feature.properties.system}</td>
                                            <td style={styleToUse}>{feature.properties.kategori}</td>
                                            <td style={styleToUse}>{feature.properties.knudetype}</td>
                                            <td style={styleToUse}>{feature.properties.dimension}</td>
                                            <td style={styleToUse}>{feature.properties.brøndmateriale}</td>
                                            <td style={styleToUse}>{feature.properties.dybde}</td>
                                            
                                            <td style={styleToUse}>
                                                {!isReadOnly && (<NodeMethodComponent

                                                    enableAdd={false}
                                                    disabled={this.state.showModal}
                                                    onChange={(e) => {
                                                        feature.properties.metode = e.target.value;
                                                        this.onSetSingleMethod(feature.properties.metode);
                                                        this.updateData();
                                                    }}
                                                    readOnly={this.state.showModal}
                                                    selected={feature.properties.metode}
                                                    showAdd={false}
                                                />
                                                )}
                                                {isReadOnly && feature.properties.metode}

                                            </td>
                                            <td style={styleToUse}>
                                                {!isReadOnly && (<PipeTerrainComponent

                                                    disabled={this.state.showModal}
                                                    enableAdd={false}
                                                    onChange={(e) => {
                                                        feature.properties.terraen = e.target.value;
                                                        this.updateData();
                                                    }}
                                                    readOnly={this.state.showModal}
                                                    selected={feature.properties.terraen}
                                                    showAdd={false}
                                                />

                                                )}
                                                {isReadOnly && feature.properties.terraen}

                                            </td>
                                            
                                            <td style={styleToUse} onClick={(e) => this.onBemClick(e, feature)} >{feature.properties.bem}</td>

                                            <td onClick={() => this.handlePdfLink(feature.properties.knudenavn)} >
                                                <i className={pdfClassName}  ></i>
                                            </td>
                                        </tr>
                                    );

                                }
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    }
}

export default FeatureTableNode;
