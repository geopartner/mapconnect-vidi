"use strict";
var React = require("react");
var dict = require("./i18n.js");


class ProjectComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    __ = (txt) => {
        if (dict[txt][window._vidiLocale]) {
            return dict[txt][window._vidiLocale];
        } else {
            return txt;
        }
    }

    forsyningsart_options = () => {
        let options = [];
        for (let i = 0; i < this.props.project.forsyningsarter.length; i++) {
            options.push({
                value: i,
                label: this.props.project.forsyningsarter[i].value,
            });
        }
        return options;
    }

    validateDates = (projectStart, projectEnd) => {
        return projectStart.getTime() < projectEnd.getTime()
    };

    toDateTimeLocal(date) {
        if (!date) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        //return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    handleForsyningsart_selectedChange = (value) => {
        this.props.onChange({ forsyningsart_selected: value });
    };

    handleProjectStartChange = (date) => {
        this.props.onChange({ projectStartDate: date });
    };

    handleProjectEndChange = (date) => {
        this.props.onChange({ projectEndDate: date });
    };

    handleBreakTypeChange = (breakType) => {
        this.props.onChange({ brudtype: breakType });

        if( breakType === '1'   ){
            this.props.onChange({ projectEndDate: null });
        }
    }

    onHandleDeleteProject = () => {
        this.props.onChange({ projectEndDate: null });
    }

    sanitizeInput = (value) => {
        return value.replace(/[^a-zA-Z0-9æøåÆØÅ\s\-:]/g, '');
    }
    handleProjectSagsr = (e) => {
        const sagsnr = this.sanitizeInput(e.target.value);
        this.props.onChange({ projectName: sagsnr });
    };
    handleClearClick = () => {
        this.props.onChange({ isReadOnly: false });
        this.props.onChange({ projectName: '' });
        this.props.onClearLukkeliste();
    };
    handlePointClick = () => {
        this.props.onReadyPointLukkeliste();
    }
    handleSaveProject = () => {
        this.props.onChange({ isReadOnly: false });
        this.props.onChange({ projectName: '' });
        this.props.onHandleSaveProject(this.props.project);
    }   

    render() {
        const { pipeSelected, project } = this.props;
        const isReadOnly = project.isReadOnly || pipeSelected;
        const editProject = this.props.editProject;
        const isNotValid = project.isNotValid;
        const isAkut = project.brudtype === '1';    
        const showTrash = project.allowDeleteEndDate && project.projectEndDate;
        let clearDisable = !pipeSelected;
        if (editProject) clearDisable = false;
        const toDate = project.projectEndDate ? this.toDateTimeLocal(project.projectEndDate) : '';
        // const hideDate = toDate === '' ? true : false;
        const showNextStep = pipeSelected && !editProject;
        return (
            <>
                <div className="row mx-auto gap-3 my-2">
                    <label className="col-4" >{this.__("Forsyningstype")}</label>
                    <select
                        onChange={(e) => { this.handleForsyningsart_selectedChange(e.target.value) }}
                        value={project.forsyningsart_selected}
                        placeholder={this.__("Select utility-type")}
                        disabled={isReadOnly || editProject}
                        className="col-7"
                    >
                        {this.forsyningsart_options().map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {project.useBreakType && (
                    <>
                        <div className="row mx-auto gap-3 my-2">
                            <label className="col-4" >{this.__("Break-type")}</label>
                            <select
                                onChange={(e) => { this.handleBreakTypeChange(e.target.value) }}
                                value={project.brudtype}
                                placeholder={this.__("Break-type")}
                                disabled={isReadOnly || editProject}
                                className="col-7"
                            >
                                {project.breakTypeOptions().map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="row mx-auto gap-3 my-2">
                            <label className="col-4" >{this.__("Forventet-start")}</label>
                            <input
                                className="col-7"
                                disabled={isReadOnly}
                                onChange={e => this.handleProjectStartChange(new Date(e.target.value))}
                                placeholder={this.__("Forventet-start")}
                                value={this.toDateTimeLocal(project.projectStartDate)}
                                type="datetime-local"
                            />
                        </div>

                        <div className="row mx-auto gap-2 my-2">
                            <label className="col-3" >{this.__("Forventet-slut")}</label>
                            {showTrash  ? (
                              <i 
                              className="col-1 bi bi-trash"
                               onClick={this.onHandleDeleteProject}
                               style={{ cursor: 'pointer' }}
                               title="Nulstil dato"
                              ></i>
                            ) :
                            (
                              <label className="col-1"></label>
                            )}
                            <input
                                className="col-7"
                                disabled={isReadOnly}
                                onChange={e => this.handleProjectEndChange(new Date(e.target.value))}
                                placeholder={this.__("Forventet-slut")}
                                value={toDate}
                                type="datetime-local"
                            />
                            
                        </div>
                        
                    </>
                )}
                <div className="row mx-auto gap-3 my-2">
                    <label className="col-4" >{this.__("admin info")}</label>
                    <input
                        className="col-7"
                        disabled={isReadOnly || editProject}
                        onChange={this.handleProjectSagsr}
                        placeholder={this.__("project description")}
                        value={project.projectName}
                        type="text"
                    />
                </div>
                {!pipeSelected && (
                    <div className="row mx-auto gap-3 my-2">
                        <span className="col" style={{ color: '#ee9b10' }}>
                            {project.statusMessage}
                        </span>
                    </div>
                )}
                {showNextStep && (
                    <div className="row mx-auto gap-3 my-2">
                        <span className="col text-primary" >
                            {this.__("project next step info")}
                        </span>
                    </div>
                )}
                <div className="row mx-auto gap-2 my-3">
                    <button
                        onClick={this.handlePointClick}
                        className="btn btn-primary col-4"
                        disabled={isNotValid || editProject}
                    >
                        {this.__("Select point on map")}
                    </button>
                    {!editProject && (
                        <div className="col-3" ></div>
                    )}
                    {editProject && (
                        <button
                            onClick={this.handleSaveProject}
                            className="btn btn-primary col-3"
                            disabled={isNotValid}
                        >
                            {this.__("Save")}
                        </button>
                    )}
                    <button
                        onClick={this.handleClearClick}
                        className="btn btn-primary col-4"
                        disabled={clearDisable}
                    >
                        {this.__("Clear map")}
                    </button>
                </div>
            </>
        )
    }

}

export default ProjectComponent;