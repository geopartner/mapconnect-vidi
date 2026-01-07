/**
 * DataSyncStatus Component
 * Shows when data was last synced and provides a reload button
 */

var React = require("react");

/**
 * Formats the time difference in Danish
 * @param {Date} lastSyncTime 
 * @returns {string}
 */
function formatTimeAgo(lastSyncTime) {
  if (!lastSyncTime) {
    return "Aldrig synkroniseret";
  }

  const now = new Date();
  const diffMs = now.getTime() - lastSyncTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "nu";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minut siden" : `${diffMinutes} min siden`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 time siden" : `${diffHours} timer siden`;
  } else {
    return diffDays === 1 ? "1 dag siden" : `${diffDays} dage siden`;
  }
}

class DataSyncStatus extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      currentTime: new Date()
    };
    
    this.updateInterval = null;
    this.autoSyncInterval = null;
  }

  componentDidMount() {
    // Update the current time every minute to keep the "time ago" display fresh
    this.updateInterval = setInterval(() => {
      this.setState({ currentTime: new Date() });
    }, 60000); // Update every minute

    // Start auto-sync if enabled
    if (this.props.autoSync) {
      this.startAutoSync();
    }
  }

  componentDidUpdate(prevProps) {
    // Handle auto-sync toggle
    if (prevProps.autoSync !== this.props.autoSync) {
      if (this.props.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.stopAutoSync();
  }

  startAutoSync = () => {
    this.stopAutoSync(); // Clear any existing interval
    this.autoSyncInterval = setInterval(() => {
      if (this.props.onReload && !this.props.isLoading) {
        this.props.onReload();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  stopAutoSync = () => {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  handleAutoSyncToggle = (e) => {
    if (this.props.onAutoSyncToggle) {
      this.props.onAutoSyncToggle(e.target.checked);
    }
  }

  render() {
    const { lastSyncTime, onReload, isLoading, autoSync } = this.props;
    const timeAgoText = formatTimeAgo(lastSyncTime);
    const autoSyncTooltip = autoSync 
      ? "Auto-opdater aktiveret (hvert 5. minut)" 
      : "Klik for at aktivere auto-opdater (hvert 5. minut)";

    return (
      <div className="data-sync-status mb-3 p-2">
        <div className="d-flex justify-content-between align-items-center">
          <div className="sync-info">
            <small className="text-muted">
              <i className="bi bi-clock me-1"></i>
              Sidst opdateret: <strong>{timeAgoText}</strong>
            </small>
          </div>
          <div className="sync-actions d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn p-1 border-0 ${autoSync ? 'text-primary' : 'text-muted'}`}
              onClick={() => this.handleAutoSyncToggle({ target: { checked: !autoSync } })}
              disabled={isLoading}
              title={autoSyncTooltip}
              style={{ backgroundColor: 'transparent' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 4.9 4c1.552 0 2.94-.707 3.857-1.818a.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">A</text>
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onReload}
              disabled={isLoading}
              title="Genindlæs data"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Indlæser...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Opdater
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = DataSyncStatus;