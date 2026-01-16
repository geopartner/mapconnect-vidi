/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2023 MapCentia ApS
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Registers Handlebars helpers used throughout the application
 * @param {Object} Handlebars - The Handlebars instance
 */
const dayjs = require('dayjs');

module.exports = function(Handlebars) {
    // Register formatDate helper
    Handlebars.registerHelper("formatDate", function (datetime, format = null, inFormat = null) {
        if (datetime == null) {
            return null;
        }
        const dateFormats = window.vidiConfig.dateFormats;
        if (format !== null && dateFormats.hasOwnProperty(format)) {
            return dayjs(datetime.toString(), inFormat).format(dateFormats[format]);
        } else {
            return dayjs(datetime.toString(), inFormat).format(format);
        }
    });

    // Register breakLines helper
    Handlebars.registerHelper('breakLines', function (text) {
        if (text == null) {
            return null;
        }
        text = Handlebars.Utils.escapeExpression(text);
        text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
        return new Handlebars.SafeString(text);
    });

    // Register replaceNull helper
    Handlebars.registerHelper('replaceNull', function (value, text) {
        if (value === null) {
            return text;
        }
        return null;
    });

    // Register formatDecimalNumber helper
    Handlebars.registerHelper('formatDecimalNumber', function (value) {
        if (value === null) {
            return null;
        }
        return value.toString().replace('.', window.decimalSeparator);
    });
};
