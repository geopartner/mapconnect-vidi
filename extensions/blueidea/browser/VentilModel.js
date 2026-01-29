/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2020- Geoparntner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */
var dict = require("./i18n.js");

class VentilProperties {

    constructor({
        key = 'gid',
        name_key = 'knudenavn',
        type_key = 'type',
        funktion_key = 'funktion',
        xkoordinat_key = 'xkoord',
        ykoordinat_key = 'ykoord',
        forbundet_key = 'forbundet'
    } = {}) {

        this.key = key;
        this.name_key = name_key;
        this.type_key = type_key;
        this.funktion_key = funktion_key;
        this.xkoordinat_key = xkoordinat_key;
        this.ykoordinat_key = ykoordinat_key;
        this.forbundet_key = forbundet_key;
    }
}

class VentilModel {

    constructor({
        value = '',
        label = '',
        type = '',
        funktion = '',
        xkoordinat = Number.MIN_VALUE,
        ykoordinat = Number.MIN_VALUE,
        forbundet = true,
        checked = false,
    } = {}) {
        this.value = value;
        this.label = label;
        this.type = type;
        this.funktion = funktion;
        this.xkoordinat = xkoordinat;
        this.ykoordinat = ykoordinat;
        this.forbundet = forbundet;
        this.checked = checked;
    }

    __ = (txt) => {
        if (dict[txt][window._vidiLocale]) {
            return dict[txt][window._vidiLocale];
        } else {
            return txt;
        }
    }

    /** Create a VentilModel instance from a GeoJSON feature.
     * @param {Object} feature - The GeoJSON feature object.
      @param {VentilProperties} ventilProperties - An instance of VentilProperties defining the property keys.
    */

    static fromFeatureFactory(
        feature = {},
        ventilProperties = new VentilProperties(),
        selectedVentilValues = []
    ) {
        if (!feature || typeof feature !== 'object') {
            throw new Error('Feature skal være et objekt');
        }
        if (!feature.properties || typeof feature.properties !== 'object') {
            throw new Error('Feature.properties skal være et objekt');
        }
        if (!ventilProperties || !(ventilProperties instanceof VentilProperties)) {
            throw new Error('ventilProperties skal være en instans af VentilProperties');
        }

        const properties = feature.properties;

        // const missing = ventilProperties.filter(
        //     prop => !(prop in properties)
        // );

        // if (missing.length > 0) {
        //     throw new Error(
        //         `Feature.properties mangler følgende påkrævede felter: ${missing.join(', ')}`
        //     );
        // }
        const isChecked = Boolean(selectedVentilValues.some(  v => String(v) === String(properties[ventilProperties.key])));
   
    
        const ventilModel = new VentilModel({
            value: properties[ventilProperties.key],
            label: properties[ventilProperties.name_key],
            type: properties[ventilProperties.type_key],
            funktion: properties[ventilProperties.funktion_key],
            xkoordinat: properties[ventilProperties.xkoordinat_key],
            ykoordinat: properties[ventilProperties.ykoordinat_key],
            forbundet: properties[ventilProperties.forbundet_key],
            checked: isChecked,
        });
        return ventilModel;
    }
    /** Create an array of VentilModel instances from an array of GeoJSON features.
     * @param {Array} features - An array of GeoJSON feature objects.
     * @param {VentilProperties} ventilProperties - An instance of VentilProperties defining the property keys. 
     * @param {Array} selectedVentilValues - An array of ventil values that should be marked as checked.
     *  @return {Array} An array of VentilModel instances.
     */

    static fromFeaturesFactory(features = [], ventilProperties = new VentilProperties(), selectedVentilValues = []) {
        if (!Array.isArray(features)) {
            console.log('features skal være et array');
            return [];
        }

        const seenKeys = new Set();

        return features
            .filter(Boolean)
            .filter(feature => {
                if (seenKeys.has(feature.properties[ventilProperties.key])) {
                    return false;
                }
                seenKeys.add(feature.properties[ventilProperties.key]);
                return true;
            })
            .map(feature => VentilModel.fromFeatureFactory(feature, ventilProperties, selectedVentilValues));
    }


    get isChecked() {
        return this.checked;
    }
    set isChecked(value) {
        this.checked = value;
    }

    get textColor() {
        return this.forbundet ? '' : '#AA4A44';
    }

    get ventilIsDisabled() {
        return !this.forbundet && !this.checked;
    }

    get ventilTooltip() {
        if (!this.forbundet && this.checked) {
            return 'Ventilen har været fravalgt i en genberegning og afbrydning af denne kan fortrydes';
        }
        if (this.ventilIsDisabled) {
            return 'Ventilen er medtaget men kan ikke påvirke den aktuelle lukkeplan';
        }
        return 'Vælg for at ignorere ved ny kørsel';
    }

    get ventilCursor() {
        return this.ventilIsDisabled ? 'not-allowed' : 'pointer';
    }

    withChanges(changes) {
        return new VentilModel({ ...this, ...changes });
    }

}

export { VentilModel, VentilProperties };