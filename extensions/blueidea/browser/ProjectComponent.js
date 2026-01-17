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
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    handleForsyningsart_selectedChange = (value)  => {
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
      this.props.onChange({ isReadOnly: true });
      this.props.onReadyPointLukkeliste();
   }
    render() {
        const {  pipeSelected,  project  } = this.props;
        const  isReadOnly = project.isReadOnly || pipeSelected;
        const isNotValid = project.isNotValid;
        const clearDisable = !pipeSelected;
        return (
            <>
                <div className="row mx-auto gap-3 my-2">
                    <label className="col-4" >{this.__("Forsyningstype")}</label>
                    <select
                        onChange={(e) => { handleForsyningsart_selectedChange( e.target.value) }}
                        value={project.forsyningsart_selected}
                        placeholder={this.__("Select utility-type")}
                        disabled={isReadOnly}
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
                                onChange={(e) => { this.handleBreakTypeChange( e.target.value) }}
                                value={project.brudtype}
                                placeholder={this.__("Break-type")}
                                disabled={isReadOnly}
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
                                onChange={ e => this.handleProjectStartChange(new Date(e.target.value))}
                                placeholder={this.__("Forventet-start")}
                                value={this.toDateTimeLocal(project.projectStartDate)}
                                type="datetime-local"
                            />
                        </div>

                        <div className="row mx-auto gap-3 my-2">
                            <label className="col-4" >{this.__("Forventet-slut")}</label>
                            <input
                                className="col-7"
                                disabled={isReadOnly}
                                onChange={ e => this.handleProjectEndChange(new Date(e.target.value))}
                                placeholder={this.__("Forventet-slut")}
                                value={this.toDateTimeLocal(project.projectEndDate)}
                                type="datetime-local"
                            />
                        </div>
                    </>
                )}
                <div className="row mx-auto gap-3 my-2">
                    <label className="col-4" >{this.__("admin info")}</label>
                    <input
                     className="col-7"
                     disabled={isReadOnly}
                     onChange={this.handleProjectSagsr}
                     placeholder={this.__("project description")}
                     value={project.projectName}
                     type="text"
                    />
                </div>
                <div className="row mx-auto gap-2 my-3">
                    <button
                      onClick={this.handlePointClick}
                      className="btn btn-primary col-4"
                      disabled={isNotValid} 
                    >
                      {this.__("Select point on map")}
                    </button>
                   <div className="col-3"></div>
                    <button
                      onClick={this.handleClearClick}
                      className="btn btn-primary col-4"
                      disabled={clearDisable}
                    >
                      {this.__("Clear map")}
                    </button>
                    <div className="col-1"></div>
                </div>
                {!pipeSelected && (
                   <div className="row mx-auto gap-3 my-3">
                     <span className="col-11 mx-2 badge bg-success" >
                      {project.statusMessage}
                      </span>
                   </div>
                )}
            </>
        )
    }

}

export default ProjectComponent;