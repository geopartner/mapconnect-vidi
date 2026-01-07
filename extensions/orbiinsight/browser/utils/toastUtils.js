/*
 * @author     René Borella <rgb@geopartner.dk>
 * @copyright  2025- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

"use strict";

/**
 * Centralized toast utility for OrbiInsight extension
 * Provides consistent styling and icons for different message types
 */
class ToastUtils {
  
  /**
   * Show an info toast with centralized styling and icons
   * @param {Object} utils - The main utils object with showInfoToast function
   * @param {string} text - The message text to display
   * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
   */
  static showInfoToast(utils, text, type = 'info') {
    if (!utils || !utils.showInfoToast) {
      console.warn('Utils.showInfoToast not available');
      return;
    }

    // Define type configurations with Bootstrap classes and icons
    const typeConfig = {
      success: {
        textClass: "",
        icon: "bi-check-circle",
        timeout: 3000
      },
      error: {
        textClass: "", 
        icon: "bi-exclamation-triangle",
        timeout: 5000
      },
      warning: {
        textClass: "",
        icon: "bi-exclamation-triangle", 
        timeout: 4000
      },
      info: {
        textClass: "",
        icon: "bi-info-circle",
        timeout: 3000
      }
    };

    // If type is unrecognized, fallback to info
    const config = typeConfig[type] || typeConfig.info;
    
    // Generate the formatted HTML with consistent styling
    const formattedText = `<span class="${config.textClass}"><i class="bi ${config.icon} me-2"></i>${text}</span>`;
    
    // Call the original showInfoToast with formatted HTML and appropriate timeout
    utils.showInfoToast(formattedText, { timeout: config.timeout, autohide: true });
  }

  /**
   * Convenience method for success messages
   * @param {Object} utils - The main utils object
   * @param {string} text - The message text
   */
  static showSuccess(utils, text) {
    this.showInfoToast(utils, text, 'success');
  }

  /**
   * Convenience method for error messages
   * @param {Object} utils - The main utils object
   * @param {string} text - The message text
   */
  static showError(utils, text) {
    this.showInfoToast(utils, text, 'error');
  }

  /**
   * Convenience method for warning messages
   * @param {Object} utils - The main utils object
   * @param {string} text - The message text
   */
  static showWarning(utils, text) {
    this.showInfoToast(utils, text, 'warning');
  }

  /**
   * Convenience method for info messages
   * @param {Object} utils - The main utils object
   * @param {string} text - The message text
   */
  static showInfo(utils, text) {
    this.showInfoToast(utils, text, 'info');
  }
}

module.exports = ToastUtils;