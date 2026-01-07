// This element contains the styling for the module

/**
 * Priority-based color scheme
 */
const PRIORITY_COLORS = {
  'High': '#dc3545',      // Red for high priority
  'Medium': '#fd7e14',   // Orange for medium priority  
  'Low': '#20c997',      // Teal for low priority
  'Urgent': '#ff23daff',   // Pink for urgent priority
  'default': '#6c757d'   // Gray for undefined priority
};

/**
 * Task type-based color scheme
 */
const TASKTYPE_COLORS = {
  'Vedligeholdelse': '#0d6efd',    // Blue for maintenance
  'Reparation': '#dc3545',         // Red for repair
  'Inspektion': '#198754',         // Green for inspection
  'Installation': '#6f42c1',       // Purple for installation
  'Nødvendigt': '#fd7e14',         // Orange for urgent
  'default': '#6c757d'             // Gray for undefined
};

/**
 * Creates custom marker options based on task properties
 */
function ticketToLayer(feature, zoomLevel = 15) {
  const props = feature.properties || {};
  const priority = props.priority;
  const taskType = props.taskTypeString;
  
  // Determine color based on priority (primary) or task type (secondary)
  let fillColor = PRIORITY_COLORS.default;
  let size = Math.max(8, Math.min(16, 8 + (zoomLevel - 10))); // Responsive size based on zoom
  
  if (priority && PRIORITY_COLORS[priority]) {
    fillColor = PRIORITY_COLORS[priority];
    // Make high priority tasks larger
    if (priority === 'Høj') {
      size += 4;
    } else if (priority === 'Mellem') {
      size += 2;
    }
  } else if (taskType && TASKTYPE_COLORS[taskType]) {
    fillColor = TASKTYPE_COLORS[taskType];
  }
  
  // Create enhanced marker options
  let markerOptions = {
    radius: size,
    fillColor: fillColor,
    color: '#ffffff',           // White border for better contrast
    weight: 2,                  // Thinner border
    opacity: 1,
    fillOpacity: 0.8,          // Slightly transparent fill
    className: 'orbi-task-marker'
  };
  
  // Add pulsing effect for high priority tasks
  if (priority === 'Høj') {
    markerOptions.className += ' high-priority-pulse';
  }
  
  return markerOptions;
}

/**
 * Enhanced tooltip with rich information
 */
function onEachTicket(feature, layer) {
  const props = feature.properties || {};
  
  if (props.name || props.taskTypeString || props.priority) {
    let tooltipContent = '';
    
    // Task name
    if (props.name) {
      tooltipContent += `<strong>${props.name}</strong><br/>`;
    }
    
    // Task type with icon
    if (props.taskTypeString) {
      const icon = getTaskTypeIcon(props.taskTypeString);
      tooltipContent += `${icon} ${props.taskTypeString}<br/>`;
    }
    
    // Priority with colored indicator
    if (props.priority) {
      const color = PRIORITY_COLORS[props.priority] || PRIORITY_COLORS.default;
      tooltipContent += `<span><strong>Prioritet: ${props.priority}</strong></span><br/>`;
    }
    
    // Domain if available
    if (props.domainString) {
      tooltipContent += `<small>${props.domainString}</small>`;
    }
    
    layer.bindTooltip(tooltipContent, {
      direction: 'top',
      offset: [0, -10],
      className: 'orbi-tooltip'
    });
  }
}

/**
 * Get appropriate icon for task type
 */
function getTaskTypeIcon(taskType) {
  const icons = {
    'Vedligeholdelse': '🔧',
    'Reparation': '🛠️',
    'Inspektion': '🔍',
    'Installation': '⚙️',
    'Nødvendigt': '⚠️'
  };
  return icons[taskType] || '📋';
}

/**
 * CSS styles for enhanced markers
 */
const markerStyles = `
  .orbi-task-marker {
    transition: box-shadow 0.2s ease-in-out, filter 0.2s ease-in-out;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  
  .orbi-task-marker:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    filter: brightness(1.15) saturate(1.2);
  }
  
  .orbi-registration-marker {
    transition: box-shadow 0.2s ease-in-out, filter 0.2s ease-in-out;
    box-shadow: 0 3px 6px rgba(13, 110, 253, 0.3);
    animation: registration-pulse 2s infinite;
    cursor: pointer;
  }
  
  .orbi-registration-marker:hover {
    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.5);
    filter: brightness(1.15) saturate(1.2);
  }
  
  .high-priority-pulse {
    animation: pulse-high-priority 2s infinite;
  }
  
  @keyframes registration-pulse {
    0% { box-shadow: 0 3px 6px rgba(13, 110, 253, 0.3), 0 0 0 0 rgba(13, 110, 253, 0.4); }
    50% { box-shadow: 0 3px 6px rgba(13, 110, 253, 0.3), 0 0 0 8px rgba(13, 110, 253, 0.1); }
    100% { box-shadow: 0 3px 6px rgba(13, 110, 253, 0.3), 0 0 0 0 rgba(13, 110, 253, 0); }
  }
  
  @keyframes pulse-high-priority {
    0% { box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 0 0 rgba(220, 53, 69, 0.7); }
    70% { box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 0 10px rgba(220, 53, 69, 0); }
    100% { box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 0 0 rgba(220, 53, 69, 0); }
  }
  
  /* Theme-aware tooltip styling */
  .orbi-tooltip {
    background: var(--bs-body-bg) !important;
    border: 1px solid var(--bs-border-color) !important;
    border-radius: var(--bs-border-radius) !important;
    color: var(--bs-body-color) !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
    padding: 8px 12px !important;
    box-shadow: var(--bs-box-shadow) !important;
    max-width: 250px !important;
  }
  
  .orbi-tooltip:before {
    border-top-color: var(--bs-body-bg) !important;
  }
  
  /* Simplified marker cluster styling with proper text centering */
  .marker-cluster {
    cursor: pointer !important;
    border-radius: 50% !important;
  }
  
  .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
    background: linear-gradient(135deg, var(--bs-primary), color-mix(in srgb, var(--bs-primary) 80%, black)) !important;
    box-shadow: var(--bs-box-shadow-sm) !important;
    border: 2px solid var(--bs-body-bg) !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
    background: transparent !important;
    color: var(--bs-body-bg) !important;
    font-weight: 600 !important;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 50% !important;
    font-size: 14px !important;
  }
  
  .marker-cluster div span {
    display: block !important;
    text-align: center !important;
    line-height: 1 !important;
  }
  
  /* Theme-aware legend styling */
  .orbi-legend {
    background: var(--bs-body-bg);
    color: var(--bs-body-color);
    border: 1px solid var(--bs-border-color);
    padding: 12px;
    border-radius: var(--bs-border-radius);
    box-shadow: var(--bs-box-shadow-sm);
    font-size: 12px;
    line-height: 1.4;
    max-width: 200px;
  }
  
  .legend-title {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--bs-emphasis-color);
  }
  
  .legend-section {
    margin-bottom: 8px;
  }
  
  .legend-section strong {
    display: block;
    margin-bottom: 4px;
    color: var(--bs-secondary-color);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
    font-size: 11px;
  }
  
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 6px;
    border: 1px solid var(--bs-border-color);
    box-shadow: var(--bs-box-shadow-sm);
    flex-shrink: 0;
  }
  
  .legend-note {
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--bs-border-color);
    color: var(--bs-secondary-color);
    font-style: italic;
  }
  
  .legend-note i {
    margin-right: 4px;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = markerStyles;
  document.head.appendChild(styleSheet);
}

/**
 * Creates a legend for the marker color coding
 */
function createLegend() {
  return `
    <div class="orbi-legend">
      <h6 class="legend-title">Opgave markører</h6>
      
      <div class="legend-section">
        <strong>Prioritet:</strong>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${PRIORITY_COLORS['Høj']}"></span>
          Høj prioritet
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${PRIORITY_COLORS['Mellem']}"></span>
          Mellem prioritet
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${PRIORITY_COLORS['Lav']}"></span>
          Lav prioritet
        </div>
      </div>
      
      <div class="legend-section">
        <strong>Opgave type:</strong>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${TASKTYPE_COLORS['Vedligeholdelse']}"></span>
          🔧 Vedligeholdelse
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${TASKTYPE_COLORS['Reparation']}"></span>
          🛠️ Reparation
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${TASKTYPE_COLORS['Inspektion']}"></span>
          🔍 Inspektion
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${TASKTYPE_COLORS['Installation']}"></span>
          ⚙️ Installation
        </div>
      </div>
      
      <small class="legend-note">
        <i class="bi bi-info-circle"></i>
        Høj prioritet opgaver blinker og er større
      </small>
    </div>
  `;
}

module.exports = {
  ticketToLayer: ticketToLayer,
  onEachTicket: onEachTicket,
  createLegend: createLegend,
  PRIORITY_COLORS: PRIORITY_COLORS,
  TASKTYPE_COLORS: TASKTYPE_COLORS
};