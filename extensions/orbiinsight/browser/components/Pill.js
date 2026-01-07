/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

var React = require("react");

/**
 * Pill Component - displays various types of information as colored pills
 */
class Pill extends React.Component {
  getPriorityConfig(priority) {
    const priorityMap = {
      'Low': {
        label: 'Lav',
        className: 'bg-success'
      },
      'Medium': {
        label: 'Mellem',
        className: 'bg-warning'
      },
      'High': {
        label: 'Høj',
        className: 'bg-danger'
      },
      'Urgent': {
        label: 'Akut',
        className: 'bg-danger'
      }
    };

    return priorityMap[priority] || {
      label: priority || 'Ukendt',
      className: 'bg-secondary'
    };
  }

  getConfig(value, type) {
    switch (type) {
      case 'priority':
        return this.getPriorityConfig(value);
      case 'domain':
        return {
          label: value || 'Ukendt',
          className: 'bg-primary'
        };
      case 'taskType':
        return {
          label: value || 'Ukendt',
          className: 'bg-info'
        };
      case 'incidentType':
        return {
          label: value || 'Ukendt',
          className: 'bg-secondary'
        };
      default:
        return {
          label: value || 'Ukendt',
          className: 'bg-secondary'
        };
    }
  }

  render() {
    const { value, type = 'default', className: additionalClassName } = this.props;
    
    if (!value) {
      return null;
    }

    const config = this.getConfig(value, type);
    const combinedClassName = `badge ${config.className}${additionalClassName ? ` ${additionalClassName}` : ''}`;

    return (
      <span className={combinedClassName}>
        {config.label.charAt(0).toUpperCase() + config.label.slice(1)}
      </span>
    );
  }
}

module.exports = Pill;