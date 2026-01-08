/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var React = require("react");

// Default configuration
const DEFAULT_CONFIG = {
  searchKeys: [
    'caseNumber',     // Case/ticket number
    'addressString',  // Address string
    'name',          // Task name
    'description'    // Task description
  ],
  displayKey: 'name',
  placeholder: 'Søg efter opgaver (sagsnummer, adresse, navn)...',
  maxResults: 8,
  debounceMs: 300,
  minSearchLength: 0
};

/**
 * Simple fuzzy search implementation
 * @param {string} needle - Search term
 * @param {string} haystack - Text to search in
 * @returns {boolean} Whether the needle fuzzy matches the haystack
 */
function fuzzyMatch(needle, haystack) {
  if (!needle || !haystack) return false;
  
  // Convert both to lowercase for case-insensitive search
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();
  
  // Simple contains match first
  if (haystack.includes(needle)) return true;
  
  // Fuzzy matching - each character in needle should appear in order in haystack
  let needleIndex = 0;
  for (let i = 0; i < haystack.length && needleIndex < needle.length; i++) {
    if (haystack[i] === needle[needleIndex]) {
      needleIndex++;
    }
  }
  
  return needleIndex === needle.length;
}

/**
 * Search through task data based on configured search keys
 * @param {Array} data - Array of task features
 * @param {string} searchTerm - The search term
 * @param {Array} searchKeys - Array of property keys to search in
 * @returns {Array} Filtered array of tasks
 */
function searchTasks(data, searchTerm, searchKeys) {
  if (!searchTerm || !searchTerm.trim()) {
    return data;
  }
  
  const trimmedTerm = searchTerm.trim();
  
  return data.filter(task => {
    const properties = task.properties || {};
    
    // Search through each configured key
    return searchKeys.some(key => {
      const value = properties[key];
      if (!value) return false;
      
      // Convert to string and perform fuzzy search
      return fuzzyMatch(trimmedTerm, String(value));
    });
  });
}

class TaskAutocomplete extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      searchTerm: '',
      filteredTasks: [],
      isOpen: false,
      highlightedIndex: -1,
      isSearching: false
    };
    
    this.debounceTimer = null;
    this.searchInputRef = React.createRef();
    this.resultsRef = React.createRef();
  }

  componentDidMount() {
    // Set initial filtered tasks to show all tasks
    this.setState({
      filteredTasks: this.props.data || []
    });
  }

  componentDidUpdate(prevProps) {
    // Update filtered tasks when data changes
    if (prevProps.data !== this.props.data) {
      this.performSearch(this.state.searchTerm);
    }
  }

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  /**
   * Performs the actual search operation
   */
  performSearch = (searchTerm) => {
    const { data, searchKeys = DEFAULT_CONFIG.searchKeys } = this.props;
    
    this.setState({ isSearching: true });
    
    // Use setTimeout to simulate async search and allow UI to update
    setTimeout(() => {
      const filtered = searchTasks(data || [], searchTerm, searchKeys);
      
      this.setState({
        filteredTasks: filtered,
        isSearching: false,
        highlightedIndex: -1
      });
    }, 10);
  }

  /**
   * Handles input changes with debouncing
   */
  handleInputChange = (e) => {
    const searchTerm = e.target.value;
    
    this.setState({
      searchTerm,
      isOpen: true
    });

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer for debounced search
    this.debounceTimer = setTimeout(() => {
      this.performSearch(searchTerm);
    }, this.props.debounceMs || DEFAULT_CONFIG.debounceMs);
  }

  /**
   * Handles input focus
   */
  handleInputFocus = () => {
    this.setState({ isOpen: true });
  }

  /**
   * Handles input blur with delay to allow click selection
   */
  handleInputBlur = () => {
    // Delay closing to allow item selection
    setTimeout(() => {
      this.setState({ isOpen: false });
    }, 150);
  }

  /**
   * Handles keyboard navigation
   */
  handleKeyDown = (e) => {
    const { filteredTasks, highlightedIndex, isOpen } = this.state;
    
    if (!isOpen || filteredTasks.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.setState({
          highlightedIndex: Math.min(highlightedIndex + 1, filteredTasks.length - 1)
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.setState({
          highlightedIndex: Math.max(highlightedIndex - 1, -1)
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredTasks.length) {
          this.selectTask(filteredTasks[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        this.setState({ isOpen: false, highlightedIndex: -1 });
        this.searchInputRef.current?.blur();
        break;
    }
  }

  /**
   * Selects a task and calls the onSelect callback
   */
  selectTask = (task) => {
    const { onSelect } = this.props;
    
    this.setState({
      searchTerm: this.getTaskDisplayText(task),
      isOpen: false,
      highlightedIndex: -1
    });

    if (onSelect) {
      onSelect(task);
    }
  }

  /**
   * Gets display text for a task based on search keys
   */
  getTaskDisplayText = (task) => {
    const { searchKeys = DEFAULT_CONFIG.searchKeys, displayKey = DEFAULT_CONFIG.displayKey } = this.props;
    const properties = task.properties || {};
    
    // Use displayKey if provided, otherwise use first search key
    const keyToUse = displayKey || (searchKeys && searchKeys[0]) || 'name';

    // Use a combination of keys for display if needed, start with capitalized domain, incidentTypeName, taskTypeString
    const domain = properties.domain ? properties.domain.charAt(0).toUpperCase() + properties.domain.slice(1) : '';
    const incidentTypeName = properties.incidentTypeName || '';
    const taskTypeString = properties.taskTypeString || '';

    return [domain, incidentTypeName, taskTypeString].filter(Boolean).join(' - ');;

  }

  /**
   * Gets secondary display text for task (address)
   */
  getTaskSecondaryText = (task) => {
    const properties = task.properties || {};
    return properties.addressString || '';
  }

  /**
   * Clears the search
   */
  clearSearch = () => {
    this.setState({
      searchTerm: '',
      isOpen: false,
      highlightedIndex: -1
    });
    
    // Reset to show all tasks
    this.performSearch('');
    
    if (this.props.onClear) {
      this.props.onClear();
    }
  }

  render() {
    const { 
      searchKeys = DEFAULT_CONFIG.searchKeys,
      displayKey = DEFAULT_CONFIG.displayKey,
      placeholder = DEFAULT_CONFIG.placeholder, 
      maxResults = DEFAULT_CONFIG.maxResults,
      debounceMs = DEFAULT_CONFIG.debounceMs,
      className = "",
      disabled = false
    } = this.props;
    
    const { 
      searchTerm, 
      filteredTasks, 
      isOpen, 
      highlightedIndex, 
      isSearching 
    } = this.state;

    const showResults = isOpen && (searchTerm.length > 0 || filteredTasks.length > 0);
    const displayedTasks = filteredTasks.slice(0, maxResults);

    return (
      <div className={`task-autocomplete mb-3 p-2 position-relative ${className}`}>
        <div className="input-group">
          <input
            ref={this.searchInputRef}
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={searchTerm}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            onBlur={this.handleInputBlur}
            onKeyDown={this.handleKeyDown}
            disabled={disabled}
            autoComplete="off"
          />
          {searchTerm && (
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={this.clearSearch}
              title="Ryd søgning"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        {showResults && (
          <div 
            ref={this.resultsRef}
            className="dropdown-menu show position-absolute w-100 shadow-sm"
            style={{ 
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            {isSearching && (
              <div className="dropdown-item-text p-2 text-center text-muted">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Søger...
              </div>
            )}
            
            {!isSearching && displayedTasks.length === 0 && searchTerm && (
              <div className="dropdown-item-text p-2 text-center text-muted">
                Ingen opgaver fundet
              </div>
            )}
            
            {!isSearching && displayedTasks.length === 0 && !searchTerm && (
              <div className="dropdown-item-text p-2 text-center text-muted">
                Indtast søgeord for at finde opgaver
              </div>
            )}

            {!isSearching && displayedTasks.map((task, index) => {
              const isHighlighted = index === highlightedIndex;
              const primaryText = this.getTaskDisplayText(task);
              const secondaryText = this.getTaskSecondaryText(task);
              
              return (
                <button
                  key={task.properties?.guid || index}
                  className={`dropdown-item ${isHighlighted ? 'active' : ''}`}
                  onClick={() => this.selectTask(task)}
                  onMouseEnter={() => this.setState({ highlightedIndex: index })}
                  type="button"
                >
                  <div className="fw-semibold">{primaryText}</div>
                  {secondaryText && (
                    <div className="small text-muted">{secondaryText}</div>
                  )}
                </button>
              );
            })}

            {!isSearching && filteredTasks.length > maxResults && (
              <div className="dropdown-item-text p-2 text-center text-muted small">
                Viser {maxResults} af {filteredTasks.length} resultater
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

module.exports = TaskAutocomplete;