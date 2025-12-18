/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

/**
 * Common tools for drawing
 */

/**
 * Get readable distance of feature
 * @param e
 * @returns {string}
 * @private
 */
const getFeatureDistance = feature => {
    let tempLatLng = null;
    let totalDistance = 0.00000;
    let coords = feature.geometry.coordinates;
    $.each(coords, function (i, latlng) {
        let current = L.latLng(latlng[1], latlng[0]);
        if (tempLatLng == null) {
            tempLatLng = current;
            return;
        }
        totalDistance += tempLatLng.distanceTo(current);
        tempLatLng = current;
    });
    return L.GeometryUtil.readableDistance(totalDistance, true);
};

/**
 * Get readable area of feature
 * @param e
 * @returns {string}
 * @private
 */
const getFeatureArea = feature => {
    let latLngs = [];
    for (const latLng of feature.geometry.coordinates[0])
        latLngs.push(L.latLng(latLng[1], latLng[0]));

    return L.GeometryUtil.geodesicArea(latLngs);
};

const getAreaValue = e => {
    return L.GeometryUtil.geodesicArea(e.getLatLngs()[0]);
};

const getAreaOfCircleValue = e => {
    return Math.pow(e.getRadius(), 2) * Math.PI;
};

module.exports = { getFeatureDistance, getAreaValue, getFeatureArea, getAreaOfCircleValue };