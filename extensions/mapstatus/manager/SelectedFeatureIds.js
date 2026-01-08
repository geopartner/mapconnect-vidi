/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

export default class SelectedFeatureIds {
  
  constructor(featureName = 'feature') {
    this.featureName = featureName;
    this.selectedFeatureIds = [];
  }

  add(featureId, clear = false) {
    if (clear) {
      this.clear()  ;
    }
    if (!this.selectedFeatureIds.includes(featureId)) {
      this.selectedFeatureIds.push(featureId);
    }
  }
  addRange(featureIds) {
    featureIds.forEach(id => this.add(id));
  }

  remove(featureId) {
    this.selectedFeatureIds = this.selectedFeatureIds.filter(id => id !== featureId);
  }

  clear() {
    this.selectedFeatureIds = [];
  }
  
  contains(featureId) {
    return this.selectedFeatureIds.includes(featureId);
  }

  getAll() {
    return this.selectedFeatureIds;
  }

  count() {
    return this.selectedFeatureIds.length;

    }
}
