/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

var React = require("react");
var DAWASearchModule = require("../../../geosag/browser/DAWASearch.js");
var DAWASearch = DAWASearchModule.default || DAWASearchModule;
const ToastUtils = require("../utils/toastUtils");

/**
 * TaskRegistration Component - allows users to register new tasks
 * Uses sidebar workflow: Step 1 = place marker, Step 2 = fill form
 */
class TaskRegistration extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isActive: false, // Whether the task registration workflow is active
      currentStep: 'inactive', // 'inactive', 'location', 'contact', 'task-type', 'details'
      formValues: {},
      selectedTaskType: '',
      isSubmitting: false,
      errors: {},
      location: null, // Will store the clicked location coordinates
      marker: null, // Will store the placed marker
      contactName: '',
      contactPhoneNumber: '',
      contactEmail: '',
      description: '',
      priority: '',
      addressString: '' // Store the selected address string
    };
  }

  componentDidMount() {
    // Listen for map clicks when in marker placement mode
    if (this.props.mapObj) {
      this.props.mapObj.on('click', this.handleMapClick);
    }
  }

  componentWillUnmount() {
    // Clean up map event listeners and marker
    if (this.props.mapObj) {
      this.props.mapObj.off('click', this.handleMapClick);
    }
    this.cleanupMarker();
    this.resetCursor();
    
    // Notify parent component that task registration is no longer active
    if (this.props.onStateChange) {
      this.props.onStateChange(false);
    }
  }

  cleanupMarker = () => {
    if (this.state.marker && this.props.mapObj) {
      this.props.mapObj.removeLayer(this.state.marker);
      this.setState({ marker: null });
    }
  }

  resetCursor = () => {
    if (this.props.utils && this.props.utils.cursorStyle) {
      this.props.utils.cursorStyle().reset();
    }
  }

  handleMapClick = (e) => {
    if (this.state.currentStep === 'location') {
      // Create a temporary marker at the clicked location with enhanced styling
      const marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 12,
        fillColor: '#0d6efd',      // Bootstrap primary blue
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        className: 'orbi-registration-marker'
      })
        .bindTooltip("📍 Ny opgave placering<br/><small>Klik et andet sted på kortet for at flytte markør</small>", {
          permanent: false,
          direction: 'top',
          className: 'orbi-tooltip'
        })
        .addTo(this.props.mapObj);

      // Clean up any existing marker
      this.cleanupMarker();

      this.setState({
        location: {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        },
        marker: marker,
        addressString: '' // Clear address string since this is a manual map click, not an address search
      });
      
      // Reset cursor style
      this.resetCursor();
    }
  }

  startRegistration = () => {
    this.setState({
      isActive: true,
      currentStep: 'location',
      formValues: {},
      selectedTaskType: '',
      errors: {},
      location: null,
      contactName: '',
      contactPhoneNumber: '',
      contactEmail: '',
      description: '',
      priority: '',
      addressString: '' // Reset address string
    });
    
    // Notify parent component that task registration is active
    if (this.props.onStateChange) {
      this.props.onStateChange(true);
    }
    
    // Set cursor style to crosshair for marker placement
    if (this.props.utils && this.props.utils.cursorStyle) {
      this.props.utils.cursorStyle().crosshair();
    }
  }

  cancelRegistration = () => {
    this.cleanupMarker();
    this.resetCursor();
    
    this.setState({
      isActive: false,
      currentStep: 'inactive',
      formValues: {},
      selectedTaskType: '',
      errors: {},
      location: null,
      contactName: '',
      contactPhoneNumber: '',
      contactEmail: '',
      description: '',
      priority: '',
      addressString: '' // Reset address string
    });
    
    // Notify parent component that task registration is no longer active
    if (this.props.onStateChange) {
      this.props.onStateChange(false);
    }
  }

  goBackToMarkerPlacement = () => {
    this.cleanupMarker();
    
    this.setState({
      currentStep: 'location',
      location: null
    });
    
    // Set cursor style to crosshair again
    if (this.props.utils && this.props.utils.cursorStyle) {
      this.props.utils.cursorStyle().crosshair();
    }
  }

  // Step navigation functions
  goToNextStep = () => {
    const { currentStep, location, selectedTaskType, contactName, contactPhoneNumber, contactEmail, description, priority, errors } = this.state;
    
    if (currentStep === 'location' && location) {
      this.setState({ currentStep: 'contact' });
    } else if (currentStep === 'contact' && contactName && contactPhoneNumber && contactEmail && !errors.contactEmail) {
      this.setState({ currentStep: 'task-type' });
    } else if (currentStep === 'task-type' && selectedTaskType && description && priority) {
      this.setState({ currentStep: 'details' });
    }
  }

  goToPreviousStep = () => {
    const { currentStep } = this.state;
    
    if (currentStep === 'details') {
      this.setState({ currentStep: 'task-type' });
    } else if (currentStep === 'task-type') {
      this.setState({ currentStep: 'contact' });
    } else if (currentStep === 'contact') {
      this.setState({ currentStep: 'location' });
      // Set cursor style to crosshair again
      if (this.props.utils && this.props.utils.cursorStyle) {
        this.props.utils.cursorStyle().crosshair();
      }
    }
  }

  goToStep = (step) => {
    this.setState({ currentStep: step });
    
    if (step === 'location') {
      // Set cursor style to crosshair
      if (this.props.utils && this.props.utils.cursorStyle) {
        this.props.utils.cursorStyle().crosshair();
      }
    } else {
      // Reset cursor style
      this.resetCursor();
    }
  }

  // Handle address selection from DAWASearch component
  handleAddressSelect = (addressData) => {
    console.log('DAWASearch result:', addressData);
    
    // Use the new wgs84Position property if available (from enhanced DAWASearch)
    let lat, lng, address;
    
    if (addressData.wgs84Position.lat && addressData.wgs84Position.lng) {
      // Use the transformed WGS84 coordinates directly - this is the preferred method
      lat = addressData.wgs84Position.lat;
      lng = addressData.wgs84Position.lng;
      address = addressData.tekst || this.formatDAWAAddress(addressData);
    } else{
      // Fallback: Alternative format - these are likely UTM coordinates
      lat = addressData.adresse.y;
      lng = addressData.adresse.x;
      address = addressData.tekst || addressData.address;
    }

    // Create a marker at the address location with enhanced styling
    const marker = L.circleMarker([lat, lng], {
      radius: 12,
      fillColor: '#0d6efd',      // Bootstrap primary blue
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
      className: 'orbi-registration-marker'
    })
      .bindTooltip(`📍 ${address}<br/><small>Valgt adresse</small>`, { 
        permanent: false,
        direction: 'top',
        className: 'orbi-tooltip'
      })
      .addTo(this.props.mapObj);

    // Clean up any existing marker
    this.cleanupMarker();

    this.setState({
      location: {
        lat: lat,
        lng: lng,
        address: address
      },
      marker: marker,
      addressString: address // Store the address string for the task data
    });

    // Pan map to the selected location
    if (this.props.mapObj) {
      this.props.mapObj.setView([lat, lng], 16);
    }

    // Reset cursor style since location is now set
    this.resetCursor();
  }

  // Helper method to format DAWA address if tekst is not available
  formatDAWAAddress = (addressData) => {
    if (!addressData) return '';
    
    let address = '';
    
    if (addressData.adgangsadresse) {
      const adgang = addressData.adgangsadresse;
      address = `${adgang.vejstykke?.navn || ''} ${adgang.husnr || ''}`;
      if (adgang.etage || adgang.dør) {
        address += `, ${adgang.etage || ''}${adgang.dør ? ' ' + adgang.dør : ''}`;
      }
      if (adgang.postnummer) {
        address += `, ${adgang.postnummer.nr} ${adgang.postnummer.navn}`;
      }
    }
    
    return address.trim();
  }

  handleTaskTypeChange = (taskTypeGuid) => {
    this.setState({
      selectedTaskType: taskTypeGuid,
      formValues: {} // Reset form values when task type changes
    });
  }

  handleContactFieldChange = (fieldName, value) => {
    // Real-time email validation
    const newErrors = { ...this.state.errors };
    
    if (fieldName === 'contactEmail' && value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        newErrors.contactEmail = 'Dette er ikke en gyldig mail-adresse';
      } else {
        delete newErrors.contactEmail;
      }
    } else {
      delete newErrors[fieldName];
    }

    this.setState({
      [fieldName]: value,
      errors: newErrors
    });
  }

  handleDescriptionChange = (value) => {
    this.setState({
      description: value,
      errors: {
        ...this.state.errors,
        description: undefined // Clear error when user starts typing
      }
    });
  }

  handlePriorityChange = (value) => {
    this.setState({
      priority: value,
      errors: {
        ...this.state.errors,
        priority: undefined // Clear error when user starts typing
      }
    });
  }

  handleInputChange = (propertyName, value) => {
    this.setState(prevState => ({
      formValues: {
        ...prevState.formValues,
        [propertyName]: value
      },
      errors: {
        ...prevState.errors,
        [propertyName]: undefined // Clear error when user starts typing
      }
    }));
  }

  handleLocationSelect = () => {
    this.setState({
      currentStep: 'location'
    });
    
    // Set cursor style to crosshair
    if (this.props.utils && this.props.utils.cursorStyle) {
      this.props.utils.cursorStyle().crosshair();
    }
  }

  // Helper function to get step status
  getStepStatus = (step) => {
    const { currentStep, location, contactName, contactPhoneNumber, contactEmail, selectedTaskType, description, priority, errors } = this.state;
    
    if (step === 'location') {
      if (location) return 'completed';
      if (currentStep === 'location') return 'active';
      return 'pending';
    } else if (step === 'contact') {
      if (contactName && contactPhoneNumber && contactEmail && !errors.contactEmail) return 'completed';
      if (currentStep === 'contact') return 'active';
      if (location) return 'pending';
      return 'disabled';
    } else if (step === 'task-type') {
      if (selectedTaskType && description && priority) return 'completed';
      if (currentStep === 'task-type') return 'active';
      if (contactName && contactPhoneNumber && contactEmail && !errors.contactEmail) return 'pending';
      return 'disabled';
    } else if (step === 'details') {
      if (currentStep === 'details') return 'active';
      if (selectedTaskType && description && priority) return 'pending';
      return 'disabled';
    }
    return 'disabled';
  }

  validateForm = () => {
    const { selectedTaskType, formValues, location, contactName, contactPhoneNumber, contactEmail, priority } = this.state;
    const { taskTypes } = this.props;
    const errors = {};

    // Validate task type selection
    if (!selectedTaskType) {
      errors.taskType = 'Task type is required';
    }

    // Validate location
    if (!location) {
      errors.location = 'Location is required';
    }

    // Validate contact information
    if (!contactName || contactName.trim() === '') {
      errors.contactName = 'Contact name is required';
    }
    
    if (!contactPhoneNumber || contactPhoneNumber.trim() === '') {
      errors.contactPhoneNumber = 'Contact phone number is required';
    }
    
    if (!contactEmail || contactEmail.trim() === '') {
      errors.contactEmail = 'Contact email is required';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        errors.contactEmail = 'Please enter a valid email address';
      }
    }

    // Validate priority
    if (!priority || priority.trim() === '') {
      errors.priority = 'Priority is required';
    }

    // Validate description
    if (!this.state.description || this.state.description.trim() === '') {
      errors.description = 'Description is required';
    }

    // Validate required fields based on task type configuration
    if (selectedTaskType) {
      const taskType = taskTypes.find(tt => tt.guid === selectedTaskType);
      if (taskType && taskType.configJson && taskType.configJson.fields) {
        taskType.configJson.fields.forEach(field => {
          if (field.required) {
            const value = formValues[field.propertyName];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              errors[field.propertyName] = `${field.label} is required`;
            }
          }
        });
      }
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }

    this.setState({ isSubmitting: true });

    try {
      const { selectedTaskType, formValues, location, contactName, contactPhoneNumber, contactEmail, description, priority, addressString } = this.state;
      const { onSubmit, utils } = this.props;

      // Prepare task data
      const taskData = {
        taskTypeGuid: selectedTaskType,
        location: location,
        properties: formValues,
        contactName: contactName,
        contactPhoneNumber: contactPhoneNumber,
        contactEmail: contactEmail,
        description: description,
        priority: priority,
        addressString: addressString // Include the address string
      };

      if (onSubmit) {
        await onSubmit(taskData);
        this.cancelRegistration(); // Reset the entire workflow
        
        // Show success message
        if (utils) {
          ToastUtils.showSuccess(utils, 'Opgave er oprettet succesfuldt');
        }
      } else {
        console.error('No onSubmit prop provided!');
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      
      // Show error message in snackbar
      if (this.props.utils) {
        const errorMessage = error.message || error.toString() || 'Der opstod en fejl ved oprettelse af opgaven';
        ToastUtils.showError(this.props.utils, errorMessage);
      }
    } finally {
      this.setState({ isSubmitting: false });
    }
  }

  renderFormField(field) {
    const { formValues, errors } = this.state;
    const value = formValues[field.propertyName] || '';
    const hasError = errors[field.propertyName];

    switch (field.dataType) {
      case 'Text':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              maxLength={field.maxLength}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'TextMultiline':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <textarea
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              maxLength={field.maxLength}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
              rows="3"
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'DropDownString':
      case 'DropDownInt':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <select
              className={`form-select ${hasError ? 'is-invalid' : ''}`}
              value={value}
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
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'Integer':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <input
              type="number"
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              onChange={(e) => this.handleInputChange(field.propertyName, parseInt(e.target.value) || '')}
              required={field.required}
              step="1"
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'Decimal':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <input
              type="number"
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              onChange={(e) => this.handleInputChange(field.propertyName, parseFloat(e.target.value) || '')}
              required={field.required}
              step="0.01"
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'DateTime':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <input
              type="datetime-local"
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      case 'Boolean':
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <select
              className={`form-select ${hasError ? 'is-invalid' : ''}`}
              value={value === true ? 'true' : value === false ? 'false' : ''}
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
              <option value="">Vælg...</option>
              <option value="true">Ja</option>
              <option value="false">Nej</option>
            </select>
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );

      default:
        return (
          <div key={field.propertyName} className="mb-3">
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              className={`form-control ${hasError ? 'is-invalid' : ''}`}
              value={value}
              onChange={(e) => this.handleInputChange(field.propertyName, e.target.value)}
              required={field.required}
            />
            {hasError && <div className="invalid-feedback">{hasError}</div>}
          </div>
        );
    }
  }

  render() {
    const { taskTypes, allowWrite } = this.props;
    const { 
      isActive,
      currentStep,
      selectedTaskType, 
      isSubmitting, 
      errors, 
      location,
      formValues,
      contactName,
      contactPhoneNumber,
      contactEmail,
      description,
      priority
    } = this.state;

    // Don't show the button if user doesn't have write access
    if (!allowWrite) {
      return null;
    }

    const selectedTaskTypeData = taskTypes.find(tt => tt.guid === selectedTaskType);

    // If not active, just show the trigger button
    if (!isActive) {
      return (
        <div className="p-2">
          <button
            className="btn btn-primary w-100"
            onClick={this.startRegistration}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Ny Opgave
          </button>
        </div>
      );
    }

    // Active stepper workflow in sidebar
    return (
      <div className="task-registration-stepper p-2 mb-3">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Ny Opgave</h6>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={this.cancelRegistration}
            disabled={isSubmitting}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            {/* Step 1: Location */}
            <div 
              className="d-flex flex-column align-items-center flex-fill"
              onClick={() => this.getStepStatus('location') !== 'disabled' && this.goToStep('location')}
              style={{ cursor: this.getStepStatus('location') !== 'disabled' ? 'pointer' : 'default' }}
            >
              <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 border ${
                this.getStepStatus('location') === 'completed' 
                  ? 'bg-success border-success text-white' 
                  : this.getStepStatus('location') === 'active'
                  ? 'bg-primary border-primary text-white'
                  : 'border-secondary text-muted'
              }`} style={{ width: '28px', height: '28px', fontSize: '0.75rem', fontWeight: '600' }}>
                {this.getStepStatus('location') === 'completed' ? (
                  <i className="bi bi-check"></i>
                ) : (
                  <span>1</span>
                )}
              </div>
              <small className={`text-center ${
                this.getStepStatus('location') === 'completed' || this.getStepStatus('location') === 'active'
                  ? 'text-primary fw-semibold'
                  : 'text-muted'
              }`} style={{ fontSize: '0.7rem' }}>Lokation</small>
            </div>

            <div className={`border-top flex-fill mx-1 ${
              this.getStepStatus('location') === 'completed' ? 'border-success' : 'border-secondary'
            }`} style={{ height: '2px', marginTop: '14px' }}></div>

            {/* Step 2: Contact */}
            <div 
              className="d-flex flex-column align-items-center flex-fill"
              onClick={() => this.getStepStatus('contact') !== 'disabled' && this.goToStep('contact')}
              style={{ cursor: this.getStepStatus('contact') !== 'disabled' ? 'pointer' : 'default' }}
            >
              <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 border ${
                this.getStepStatus('contact') === 'completed' 
                  ? 'bg-success border-success text-white' 
                  : this.getStepStatus('contact') === 'active'
                  ? 'bg-primary border-primary text-white'
                  : 'border-secondary text-muted'
              }`} style={{ width: '28px', height: '28px', fontSize: '0.75rem', fontWeight: '600' }}>
                {this.getStepStatus('contact') === 'completed' ? (
                  <i className="bi bi-check"></i>
                ) : (
                  <span>2</span>
                )}
              </div>
              <small className={`text-center ${
                this.getStepStatus('contact') === 'completed' || this.getStepStatus('contact') === 'active'
                  ? 'text-primary fw-semibold'
                  : 'text-muted'
              }`} style={{ fontSize: '0.7rem' }}>Kontakt</small>
            </div>

            <div className={`border-top flex-fill mx-1 ${
              this.getStepStatus('contact') === 'completed' ? 'border-success' : 'border-secondary'
            }`} style={{ height: '2px', marginTop: '14px' }}></div>

            {/* Step 3: Task Type */}
            <div 
              className="d-flex flex-column align-items-center flex-fill"
              onClick={() => this.getStepStatus('task-type') !== 'disabled' && this.goToStep('task-type')}
              style={{ cursor: this.getStepStatus('task-type') !== 'disabled' ? 'pointer' : 'default' }}
            >
              <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 border ${
                this.getStepStatus('task-type') === 'completed' 
                  ? 'bg-success border-success text-white' 
                  : this.getStepStatus('task-type') === 'active'
                  ? 'bg-primary border-primary text-white'
                  : 'border-secondary text-muted'
              }`} style={{ width: '28px', height: '28px', fontSize: '0.75rem', fontWeight: '600' }}>
                {this.getStepStatus('task-type') === 'completed' ? (
                  <i className="bi bi-check"></i>
                ) : (
                  <span>3</span>
                )}
              </div>
              <small className={`text-center ${
                this.getStepStatus('task-type') === 'completed' || this.getStepStatus('task-type') === 'active'
                  ? 'text-primary fw-semibold'
                  : 'text-muted'
              }`} style={{ fontSize: '0.7rem' }}>Type</small>
            </div>

            <div className={`border-top flex-fill mx-1 ${
              this.getStepStatus('task-type') === 'completed' ? 'border-success' : 'border-secondary'
            }`} style={{ height: '2px', marginTop: '14px' }}></div>

            {/* Step 4: Details */}
            <div 
              className="d-flex flex-column align-items-center flex-fill"
              onClick={() => this.getStepStatus('details') !== 'disabled' && this.goToStep('details')}
              style={{ cursor: this.getStepStatus('details') !== 'disabled' ? 'pointer' : 'default' }}
            >
              <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 border ${
                this.getStepStatus('details') === 'active'
                  ? 'bg-primary border-primary text-white'
                  : 'border-secondary text-muted'
              }`} style={{ width: '28px', height: '28px', fontSize: '0.75rem', fontWeight: '600' }}>
                <span>4</span>
              </div>
              <small className={`text-center ${
                this.getStepStatus('details') === 'active'
                  ? 'text-primary fw-semibold'
                  : 'text-muted'
              }`} style={{ fontSize: '0.7rem' }}>Detaljer</small>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-3 rounded border">
          {/* Step 1: Location Selection */}
          {currentStep === 'location' && (
            <div>
              <h6 className="mb-3">Vælg Lokation</h6>
              
              {/* Address Search */}
              <div className="mb-3">
                <label className="form-label">Søg efter adresse</label>
                <DAWASearch
                  _handleResult={this.handleAddressSelect}
                  nocache={true}
                  placeholder="Indtast adresse..."
                />
              </div>

              {/* OR divider */}
              <div className="text-center mb-3">
                <small className="text-muted px-2">eller</small>
              </div>
              
              {/* Map click instruction */}
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Klik på kortet for at placere markør manuelt.
              </div>
              
              {/* Selected location display */}
              {location && (
                <div className="mb-3">
                  <div className="card">
                    <div className="card-body p-3">
                      <h6 className="card-title mb-2">
                        <i className="bi bi-geo-alt-fill text-primary me-1"></i>
                        Valgt lokation
                      </h6>
                      {location.address && (
                        <div className="mb-2">
                          <strong>{location.address}</strong>
                        </div>
                      )}
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted small">
                          Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            this.cleanupMarker();
                            this.setState({ location: null });
                            if (this.props.utils && this.props.utils.cursorStyle) {
                              this.props.utils.cursorStyle().crosshair();
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          <i className="bi bi-geo-alt me-1"></i>
                          Fjern
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="d-grid gap-2">
                {location && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={this.goToNextStep}
                  >
                    Næste
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={this.cancelRegistration}
                >
                  Annuller
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 'contact' && (
            <div>
              <h6 className="mb-3">Kontaktinformation</h6>
              
              <div className="mb-3">
                <label className="form-label">
                  Navn <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.contactName ? 'is-invalid' : ''}`}
                  value={this.state.contactName}
                  onChange={(e) => this.handleContactFieldChange('contactName', e.target.value)}
                  placeholder="Indtast navn"
                  disabled={isSubmitting}
                />
                {errors.contactName && <div className="invalid-feedback">{errors.contactName}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Telefonnummer <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  className={`form-control ${errors.contactPhoneNumber ? 'is-invalid' : ''}`}
                  value={this.state.contactPhoneNumber}
                  onChange={(e) => this.handleContactFieldChange('contactPhoneNumber', e.target.value)}
                  placeholder="Indtast telefonnummer"
                  disabled={isSubmitting}
                />
                {errors.contactPhoneNumber && <div className="invalid-feedback">{errors.contactPhoneNumber}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  E-mail <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.contactEmail ? 'is-invalid' : ''}`}
                  value={this.state.contactEmail}
                  onChange={(e) => this.handleContactFieldChange('contactEmail', e.target.value)}
                  placeholder="Indtast e-mail adresse"
                  disabled={isSubmitting}
                />
                {errors.contactEmail && <div className="invalid-feedback">{errors.contactEmail}</div>}
              </div>

              <div className="d-grid gap-2">
                <div className="row">
                  <div className="col">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={this.goToPreviousStep}
                      disabled={isSubmitting}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Tilbage
                    </button>
                  </div>
                  <div className="col">
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={this.goToNextStep}
                      disabled={!this.state.contactName || !this.state.contactPhoneNumber || !this.state.contactEmail || errors.contactEmail || isSubmitting}
                    >
                      Næste
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Task Type Selection */}
          {currentStep === 'task-type' && (
            <div>
              <h6 className="mb-3">Henvendelse</h6>

              <div className="mb-3">
                <label className="form-label">
                  Beskrivelse <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  value={this.state.description}
                  onChange={(e) => this.handleDescriptionChange(e.target.value)}
                  placeholder="Beskriv opgaven..."
                  rows="4"
                  required
                  disabled={isSubmitting}
                />
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                <div className="form-text">
                  Tilføj yderligere oplysninger om opgaven her.
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">
                  Opgavetype <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.taskType ? 'is-invalid' : ''}`}
                  value={selectedTaskType}
                  onChange={(e) => this.handleTaskTypeChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Vælg opgavetype...</option>
                  {taskTypes.map(taskType => (
                    <option key={taskType.guid} value={taskType.guid}>
                      {taskType.name}
                    </option>
                  ))}
                </select>
                {errors.taskType && <div className="invalid-feedback">{errors.taskType}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Prioritet <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.priority ? 'is-invalid' : ''}`}
                  value={this.state.priority}
                  onChange={(e) => this.handlePriorityChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Vælg prioritet...</option>
                  <option value="Low">Lav</option>
                  <option value="Medium">Medium</option>
                  <option value="High">Høj</option>
                  <option value="Urgent">Akut</option>
                </select>
                {errors.priority && <div className="invalid-feedback">{errors.priority}</div>}
              </div>

              <div className="d-grid gap-2">
                <div className="row">
                  <div className="col">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={this.goToPreviousStep}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Tilbage
                    </button>
                  </div>
                  <div className="col">
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={this.goToNextStep}
                      disabled={!selectedTaskType || !this.state.priority || !this.state.description}
                    >
                      Næste
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {currentStep === 'details' && (
            <div>
              <h6 className="mb-3">Detaljer</h6>
              
              <form onSubmit={this.handleSubmit}>
                {/* Dynamic Form Fields */}
                {selectedTaskTypeData && selectedTaskTypeData.configJson && selectedTaskTypeData.configJson.fields && (
                  <div className="mb-3">
                    {selectedTaskTypeData.configJson.fields.map(field => this.renderFormField(field))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSubmitting || !selectedTaskType || !location}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Gemmer...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        Opret opgave
                      </>
                    )}
                  </button>
                  
                  <div className="row">
                    <div className="col">
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100"
                        onClick={this.goToPreviousStep}
                        disabled={isSubmitting}
                      >
                        <i className="bi bi-arrow-left me-1"></i>
                        Tilbage
                      </button>
                    </div>
                    <div className="col">
                      <button
                        type="button"
                        className="btn btn-outline-danger w-100"
                        onClick={this.cancelRegistration}
                        disabled={isSubmitting}
                      >
                        Annuller
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }
}

module.exports = TaskRegistration;