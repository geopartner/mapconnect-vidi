/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

var React = require("react");
var Pill = require("./Pill.js");
var StatusProgressBar = require("./StatusProgressBar.js");

/**
 * TaskDetails Component - displays information about the selected task
 */
class TaskDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formValues: {},
      isEditing: false
    };
  }

  componentDidMount() {
    this.initializeFormValues();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.task !== this.props.task) {
      this.initializeFormValues();
      console.log("TaskDetails props:", this.props);
    }
  }

  initializeFormValues() {
    const { task, tasktype } = this.props;
    
    if (!task || !tasktype) return;

    if (tasktype && tasktype.configJson && tasktype.configJson.fields) {
      const formValues = {};
      
      tasktype.configJson.fields.forEach(field => {
        // Find corresponding property value from task.properties.properties array
        const taskProperty = task.properties.properties && task.properties.properties.find(
          prop => prop.propertyName === field.propertyName
        );
        
        formValues[field.propertyName] = taskProperty ? taskProperty.propertyValue : '';
      });

      this.setState({ formValues });
    }
  }

  handleInputChange = (propertyName, value) => {
    this.setState(prevState => ({
      formValues: {
        ...prevState.formValues,
        [propertyName]: value
      }
    }));
  }

  handleSave = () => {
    const { task, onSave } = this.props;
    if (onSave && task) {

      // Create a copy of the task to avoid mutating props directly
      let newTask = JSON.parse(JSON.stringify(task));
      // Merge the updated form values into task properties, and overwrite existing values in task.properties.properties
      Object.keys(this.state.formValues).forEach(key => {
        const field = newTask.properties.properties.find(prop => prop.propertyName === key);
        if (field) {
          field.propertyValue = this.state.formValues[key];
        }
      });

      // TODO: Set manual stuff here.

      // Call the onSave callback with updated task
      onSave(task.properties.guid, newTask);
      this.setState({ isEditing: false });
    }
  }

  handleCancel = () => {
    this.initializeFormValues();
    this.setState({ isEditing: false });
  }

  handleDeepLink = () => {
    const { task } = this.props;
    if (task && task.properties && task.properties.guid) {
      const deeplinkUrl = `https://orbiorbiinsightdemoweb1.azurewebsites.net/field-ops/task/${task.properties.guid}`;
      window.open(deeplinkUrl, '_blank');
    }
  }

  renderFormField(field) {
    const { formValues, isEditing } = this.state;
    const value = formValues[field.propertyName] || '';
  
    if (!isEditing) {
      let displayValue = '';

      // Convert boolean values to display strings
      if (field.dataType === 'Boolean') {
        if (value === true || value === 'true') {
          displayValue = 'Ja';
        } else if (value === false || value === 'false') {
          displayValue = 'Nej'; 
        } else {
          displayValue = 'N/A';
        }
      } else {
        displayValue = value || 'N/A';
      }

      return (
        <div key={field.propertyName} className="mb-3">
          <label className="form-label text-muted small">{field.label}</label>
          <div className="form-value p-2 border rounded">{displayValue}</div>
        </div>
      );
    }

    console.log("field:", field.dataType, field.propertyName, value);

    switch (field.dataType) {
      case 'Text':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="text"
              className="form-control"
              value={value}
              maxLength={field.maxLength}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'TextMultiline':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <textarea
              className="form-control"
              value={value}
              maxLength={field.maxLength}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
              rows="3"
            />
          </div>
        );

      case 'DropDownString':
      case 'DropDownInt':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <select
              className="form-select"
              value={value}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            >
              <option value="">Vælg...</option>
              {field.options && field.options.map(option => (
                <option key={option.Value} value={option.Value}>
                  {option.Label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'Integer':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              className="form-control"
              value={value}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, parseInt(e.target.value) || '')}
              required={field.required}
              step="1"
            />
          </div>
        );

      case 'Decimal':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              className="form-control"
              value={value}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, parseFloat(e.target.value) || '')}
              required={field.required}
              step="0.01"
            />
          </div>
        );

      case 'DateTime':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="datetime-local"
              className="form-control"
              value={value}
              disabled={!field.editable}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'Boolean':      
        // Convert boolean values to string values for the select
        let selectValue = '';
        if (value === true || value === 'true') {
          selectValue = 'true';
        } else if (value === false || value === 'false') {
          selectValue = 'false';
        } else {
          selectValue = '';
        }
        
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <select
              className="form-select"
              value={selectValue}
              disabled={!field.editable}
              onChange={(e) => {
                let convertedValue;
                if (e.target.value === 'true') {
                  convertedValue = true;
                } else if (e.target.value === 'false') {
                  convertedValue = false;
                } else {
                  convertedValue = '';
                }
                this.handleInputChange(field.propertyName, convertedValue);
              }}
              required={field.required}
            >
              <option value="true">Ja</option>
              <option value="false">Nej</option>
              <option value="ukendt">Nej</option>
            </select>
          </div>
        );

      default:
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label text-muted small">{field.label}:</label>
            <div className="form-value p-2 border rounded">{value || 'N/A'}</div>
          </div>
        );
    }
  }

  getStatusLabel(status) {
    const statusMap = {
      0: 'Planned',
      10: 'Not Started',
      20: 'Ongoing',
      30: 'Not Inspected',
      40: 'On Hold',
      50: 'Sent to External',
      100: 'Closed'
    };
    return statusMap[status] || 'Unknown';
  }

  getPriorityLabel(priority) {
    const priorityMap = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Urgent'
    };
    return priorityMap[priority] || 'Unknown';
  }

  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('da-DK', options);
  }

  render() {
    const { task, tasktype } = this.props;
    const { isEditing } = this.state;
    
    if (!task) {
      return (
        <div className="task-details">
          <h6>Detaljer</h6>
          <p className="text-muted">Ingen opgave valgt</p>
        </div>
      );
    }

    const properties = task.properties;

    return (
      <div className="task-details mb-3 p-2">
        <div className="task-header mb-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="mb-0">Detaljer</h6>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-info btn-sm"
                onClick={() => this.handleDeepLink()}
                title="Åbn i OrbiInsight"
              > Åben i OrbiInsight
              </button>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => this.props.onZoomToTask && this.props.onZoomToTask(this.props.task)}
                title="Zoom til opgave"
              >
                <i className="bi bi-zoom-in"></i>
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={this.props.onDeselectTask}
                title="Fjern markering"
              >
                <i className="bi bi-arrow-left-short"></i>
                <span> Tilbage</span>
              </button>
            </div>
          </div>
          <div className="task-pills d-flex flex-wrap gap-2">
            <Pill value={properties.domainString} type="domain" />
            <Pill value={properties.taskTypeString} type="taskType" />
            <Pill value={properties.priority} type="priority" />
            <Pill value={properties.incidentTypeName || properties.incidentTypeGuid} type="incidentType" />
          </div>
        </div>

        <div className="task-info">
          {/* Status Progress Bar */}
          <StatusProgressBar status={properties.status} />

          {/* Basic task information - compact layout */}
          <div className="basic-info-section mb-3 p-2 border rounded">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong className="text-muted">Kontakt: </strong> 
                <span className="">
                  {properties.contactName || 'N/A'}
                  {properties.contactEmail && (
                    <span> - <a href={`mailto:${properties.contactEmail}`} className="text-decoration-none">{properties.contactEmail}</a></span>
                  )}
                  {properties.contactPhoneNumber && (
                    <span> - <a href={`tel:${properties.contactPhoneNumber}`} className="text-decoration-none">{properties.contactPhoneNumber}</a></span>
                  )}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><strong className="text-muted">Adresse:</strong> <span className="">{properties.addressString || 'N/A'}</span></div>
              {properties.createdDt && (
                <div><strong className="text-muted">Oprettet:</strong> <span className="">{this.formatDateTime(properties.createdDt)}</span></div>
              )}
              {properties.deadline && (
                <div><strong className="text-muted">Deadline:</strong> <span className="">{this.formatDateTime(properties.deadline)}</span></div>
              )}
              {properties.lastUpdatedDt && (
                <div><strong className="text-muted">Opdateret:</strong> <span className="">{this.formatDateTime(properties.lastUpdatedDt)}</span></div>
              )}
              {properties.lastUpdateBy && (
                <div><strong className="text-muted">Opdateret Af:</strong> <span className="">{properties.lastUpdateBy}</span></div>
              )}
              {properties.description && (
                <div style={{ gridColumn: '1 / -1', marginTop: '8px'}}>
                  <strong className="text-muted">Beskrivelse:</strong>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {properties.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic form fields based on configJson */}
          {tasktype && tasktype.configJson && tasktype.configJson.fields && (
            <div className="dynamic-fields-section">
              <form onSubmit={(e) => e.preventDefault()}>
                {tasktype.configJson.fields.map(field => this.renderFormField(field))}
              </form>
            </div>
          )}

          {/* Task actions moved below dynamic fields */}
          {tasktype && tasktype.configJson && tasktype.configJson.fields && tasktype.configJson.fields.length > 0 && this.props.allowWrite && (
            <div className="task-actions mt-3">
              {/* Show message if task is on hold */}
              {(properties.isOnHold || properties.status === 40) && (
                <div className="alert alert-warning alert-sm mb-2" role="alert">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Denne opgave er sat på hold og kan ikke redigeres.
                </div>
              )}
              
              <div className="d-flex justify-content-end">
                {!isEditing ? (
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => this.setState({ isEditing: true })}
                    disabled={properties.isOnHold || properties.status === 40}
                    title={properties.isOnHold || properties.status === 40 ? "Opgaven er sat på hold og kan ikke redigeres" : "Rediger opgave"}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Rediger
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-success btn-sm me-2"
                      onClick={this.handleSave}
                    >
                      <i className="bi bi-check-lg me-1"></i>
                      Gem
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={this.handleCancel}
                    >
                      Afbryd
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

module.exports = TaskDetails;