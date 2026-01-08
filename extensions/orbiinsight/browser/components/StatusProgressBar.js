/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

var React = require("react");

/**
 * StatusProgressBar Component - displays task status as a progress bar
 */
class StatusProgressBar extends React.Component {
  getStatusConfig(status) {
    const statusMap = {
      'Planned': {
        label: 'Planlagt',
        value: 0,
        className: 'bg-info',
        animated: false
      },
      'NotStarted': {
        label: 'Ikke startet',
        value: 10,
        className: 'bg-primary',
        animated: false
      },
      'Ongoing': {
        label: 'Igang',
        value: 20,
        className: 'bg-primary',
        animated: true
      },
      'NotInspected': {
        label: 'Ikke inspiceret',
        value: 30,
        className: 'bg-warning',
        animated: false
      },
      'OnHold': {
        label: 'Afventer',
        value: 40,
        className: 'bg-warning',
        animated: false
      },
      'SentToExternal': {
        label: 'Sendt til ekstern',
        value: 50,
        className: 'bg-primary',
        animated: true
      },
      'Closed': {
        label: 'Afsluttet',
        value: 100,
        className: 'bg-primary',
        animated: false
      }
    };

    return statusMap[status] || {
      label: 'Ukendt',
      value: 0,
      className: 'bg-secondary',
      animated: false
    };
  }

  render() {
    const { status } = this.props;

    if (!status) {
      return null;
    }

    const config = this.getStatusConfig(status);
    const progressClass = `progress-bar ${config.className}${config.animated ? ' progress-bar-striped progress-bar-animated' : ''}`;

    return (
      <div className="status-progress-bar mb-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">Status</small>
          <small className="text-muted"><strong>{config.label}</strong></small>
        </div>
        <div className="progress" style={{ height: '8px' }}>
          <div 
            className={progressClass}
            role="progressbar" 
            style={{ width: `${config.value}%` }}
            aria-valuenow={config.value} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
          </div>
        </div>
      </div>
    );
  }
}

module.exports = StatusProgressBar;