/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class CreateProjectForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            kunder: []
        }
        this.selectRef = React.createRef();
        console.log('Constructor props:', props);
    }

    componentDidMount() {
        console.log('Mounted props:', this.props);
        // Fetch customers from the API
        fetch('/api/extension/mapstatus/GetKunder')
            .then(response => response.json())
            .then(data => {

                const result = data.features.map(feature => ({
                    id: feature.properties.id,
                    navn: feature.properties.kundenavn
                }))

                this.setState({ kunder: result });
            })
            .catch(error => {
                console.error('Error fetching customers:', error);
            });
        if (this.props.isNewProject) {
            this.getTemplate();
        }
    }
    getTemplate = () => {
        fetch(`/api/extension/mapstatus/getprojecttemplate/${this.props.skema}`)
            .then(response => response.json())
            .then(data => {
                // Handle the project template data
                if (data && data.features && data.features.length > 0 && this.props.activeProject) {
                    Object.assign(this.props.activeProject, data.features[0].properties);
                    this.forceUpdate();
                }
                else {
                    alert("No project template found");
                }
            })
            .catch(error => {
                console.error('Error fetching project template:', error);
            });
    }

    componentDidUpdate() {
        if (this.props.isReadOnly) {
            return;
        }
        const selectEl = this.selectRef.current;
        const kundeNavn = selectEl.options[selectEl.selectedIndex].text;
        if (this.props.activeProject?.kundeNavn !== kundeNavn) {
            this.handleFieldChange("kundeNavn", kundeNavn);
        }
    }


    handleFieldChange = (field, value) => {
        try {
            const updated = {
                ...this.props.activeProject,
                [field]: value
            };
            this.props.onProjectChange(updated);
        } catch (error) {
            console.error("Error updating project field:", error);
        }
    };


    render() {

        const {
            activeProject,
            onSaveClick,
            onRejectClick,
            isNewProject,
            onDrawNewProject,
            isReadOnly,
            style
        } = this.props;

        const canCreateProject = activeProject?.kundeid && activeProject?.afdeling && activeProject?.navn;

        return (
            <div style ={{userSelect: 'none'}} >
                <>
                    {isNewProject && (
                        <>
                            <p className="fw-bold">Opret nyt underprojekt</p>
                        </>
                    )}
                    {!isReadOnly && (
                        <details open className="mb-4 p-2">
                            <summary className="fw-bold">Projekt</summary>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label htmlFor="kunde-select" className="form-label fw-bold" style={{minWidth: '140px'}}>Kunde</label>
                                <select
                                    className="form-control flex-grow-1"
                                    id="kunde-select"
                                    value={this.props.activeProject?.kundeid || ''}
                                    onChange={(e) => {
                                        this.handleFieldChange("kundeid", e.target.value);
                                        const kundeNavn = e.target.options[e.target.selectedIndex].text;
                                        this.handleFieldChange("kundeNavn", kundeNavn);
                                    }}
                                    readOnly={isReadOnly}
                                    ref={this.selectRef}
                                    disabled={isReadOnly}
                                >
                                    <option value="">Vælg kunde</option>
                                    {this.state.kunder.map((kunde) => (
                                        <option key={kunde.id} value={kunde.id}>
                                            {kunde.navn}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label className="form-label" style={{minWidth: '140px'}}>Afdelingsnavn</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Afdelingsnavn"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.afdeling || ''}
                                    onChange={(e) => this.handleFieldChange("afdeling", e.target?.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label className="form-label" style={{minWidth: '140px'}}>Projekttype</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Projekt type "
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.projektnavn || ''}
                                    onChange={(e) => this.handleFieldChange("projektnavn", e.target?.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <><label className="form-label" style={{minWidth: '140px'}}>Oprettet dato</label></>
                                <input
                                    className="form-control flex-grow-1"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    value={this.props.activeProject?.oprettet || ''}
                                    type="date"
                                    onChange={(e) => this.handleFieldChange("oprettet", e.target.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <><label className="form-label" style={{minWidth: '140px'}}>Revision dato</label></>
                                <input
                                    className="form-control flex-grow-1"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    value={this.props.activeProject?.editdate || ''}
                                    type="date"
                                    onChange={(e) => this.handleFieldChange("editdate", e.target.value)}
                                />
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <><label className="form-label" style={{minWidth: '140px'}}>Revision nr</label></>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Revision nr"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.revision || ''}

                                    onChange={(e) => this.handleFieldChange("revision", e.target?.value)}
                                />
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <><label className="form-label" style={{minWidth: '140px'}}>Status</label></>
                                <select
                                    className="form-control flex-grow-1"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    value={this.props.activeProject?.status || ''}
                                    onChange={(e) => this.handleFieldChange("status", e.target.value)}
                                >
                                    <option value="1">Projektering</option>
                                    <option value="2">I udbud</option>
                                    <option value="3">Igangværende</option>
                                    <option value="4">Afsluttet</option>
                                </select>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label style={{ fontWeight: "bold" }} className="form-label" style={{minWidth: '140px'}}>Bygherre</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Bygherre navn"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.bygherrenavn || ''}
                                    onChange={(e) => this.handleFieldChange("bygherrenavn", e.target?.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label className="form-label" style={{minWidth: '140px'}}>Afdeling</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Bygherre afdlingsnavn"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.bygherreafdeling || ''}
                                    onChange={(e) => this.handleFieldChange("bygherreafdeling", e.target?.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label className="form-label" style={{minWidth: '140px'}}>Adresse</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Bygherre adresse"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.bygherreadresse || ''}
                                    onChange={(e) => this.handleFieldChange("bygherreadresse", e.target?.value)}
                                />
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <label className="form-label" style={{minWidth: '140px'}}>Postnr</label>
                                <input
                                    className="form-control flex-grow-1"
                                    placeholder="Bygherre postnr og by"
                                    disabled={isReadOnly}
                                    readOnly={isReadOnly}
                                    type="text"
                                    value={this.props.activeProject?.bygherrepostnr || ''}
                                    onChange={(e) => this.handleFieldChange("bygherrepostnr", e.target?.value)}
                                />
                            </div>

                        </details>
                    )}
                    <hr></hr>
                    <details open className="mb-4 p-2">
                        <summary className="fw-bold" >Underprojekt</summary>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <label className="form-label fw-bold" style={{minWidth: '140px'}}>Navn</label>
                            <input
                                className="form-control flex-grow-1"
                                placeholder="Navn på underprojekt"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                type="text"
                                value={this.props.activeProject?.navn || ''}
                                onChange={(e) => this.handleFieldChange("navn", e.target?.value)}
                            />
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-2">
                            <><label className="form-label" style={{minWidth: '140px'}}>Projektadresse</label></>
                            <input
                                className="form-control flex-grow-1"
                                placeholder="Projektadresse"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                type="text"
                                value={this.props.activeProject?.projektadresse || ''}
                                onChange={(e) => this.handleFieldChange("projektadresse", e.target?.value)}
                            />
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-2">
                            <label className="form-label" style={{minWidth: '140px'}}>Postnr</label>
                            <input
                                className="form-control flex-grow-1"
                                placeholder="Underprojekt postnr og by"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                type="text"
                                value={this.props.activeProject?.projektpostnr || ''}
                                onChange={(e) => this.handleFieldChange("projektpostnr", e.target?.value)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <><label className="form-label" style={{minWidth: '140px'}}>Status</label></>
                            <select
                                className="form-control flex-grow-1"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                value={this.props.activeProject?.underprojektstatus || ''}
                                onChange={(e) => this.handleFieldChange("underprojektstatus", e.target.value)}
                            >
                                <option value="1">Projektering</option>
                                <option value="2">I udbud</option>
                                <option value="3">Igangværende</option>
                                <option value="4">Afsluttet</option>
                            </select>
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <><label className="form-label" style={{minWidth: '140px'}}>Oprettet dato</label></>
                            <input

                                className="form-control flex-grow-1"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                value={this.props.activeProject?.underprojektoprettet || ''}
                                type="date"
                                onChange={(e) => this.handleFieldChange("underprojektoprettet", e.target.value)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <><label className="form-label" style={{minWidth: '140px'}}>Revision dato</label></>
                            <input
                                className="form-control flex-grow-1"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                value={this.props.activeProject?.underprojektediteret || ''}
                                type="date"
                                onChange={(e) => this.handleFieldChange("underprojektediteret", e.target.value)}
                            />
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-2">
                            <><label className="form-label" style={{minWidth: '140px'}}>Revision nr</label></>
                            <input
                                className="form-control flex-grow-1"
                                placeholder="Revision nr"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                type="text"
                                value={this.props.activeProject?.underprojektrevision || ''}

                                onChange={(e) => this.handleFieldChange("underprojektrevision", e.target?.value)}
                            />
                        </div>

                        <div className="mb-2">
                            <label className="form-label">Bemærkning</label>
                        </div>
                        <div className="mb-2">
                            <textarea
                                className="form-control"
                                placeholder="Bemærkning"
                                disabled={isReadOnly}
                                readOnly={isReadOnly}

                                value={this.props.activeProject?.beskrivelse || ''}
                                onChange={(e) => this.handleFieldChange("beskrivelse", e.target.value)}
                            />
                        </div>
                    </details>
                </>
                <>
                    {!isReadOnly && (
                        <div className="d-flex gap-2 mt-2">
                            <button className="btn btn-outline-primary" title="Tegn projekt" onClick={onDrawNewProject}>
                                <i className="leaflet-draw-draw-rectangle" onClick={onDrawNewProject}></i> Tegn
                            </button>
                            <div className="flex-grow-1"></div>
                            <button className="btn btn-outline-danger" onClick={onRejectClick}>
                                Annuller
                            </button>
                            <button disabled={!canCreateProject} className="btn btn-primary" onClick={onSaveClick}>
                                {isNewProject ? 'Opret' : 'Gem'}
                            </button>
                        </div>
                    )}
                </>
            </div >
        );
    }
}

export default CreateProjectForm;
