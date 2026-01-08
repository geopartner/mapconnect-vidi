/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import DataManager from './DataManager.js';
import SelectedFeatureIds from './SelectedFeatureIds.js';

export default class SelectedFeaturesManager extends DataManager   {
  constructor(mapRef,
    backboneEvents,
    MAPSTATUS_MODULE_NAME,
    featureName = 'feature',
    colName = 'geojson',
    filterFunc = null, isNode = false) {
      
    super();

    this._geojson = { type: "FeatureCollection", features: [] };
    this._geojsonLayer = null;
    this.map = mapRef;
    this.featureName = featureName;
    this.colName = colName || 'geojson';
    this.filterFunc = filterFunc;
    this.selectedFeatures = [];
    this.selectedFeatureIds = new SelectedFeatureIds(featureName);
    this.selectedFeatureId = null;
    this.backboneEvents = backboneEvents;
    this.MAPSTATUS_MODULE_NAME = MAPSTATUS_MODULE_NAME;
    this.isNode = isNode;
    this.colorStyle = isNode ?
      { color: '#00ff00', weight: 12, opacity: 0.4 } :
      { color: '#ffd000', weight: 12, opacity: 0.4 };
    this.hiliteStyle = isNode ?
      { color: '#ff0000', weight: 20, opacity: 0.25 } :
      { color: '#800080', weight: 20, opacity: 0.25 };
  }

  getFeatureStyle(feature){
     const id = feature.properties.id;
     const isSelected =this.selectedFeatureIds.contains(id);
     const isNode =feature.properties.hasOwnProperty('knudenavn');

     if (isNode) {
       return isSelected ?  { color: '#00ff00', weight: 20, opacity: 0.25 } : { color: '#ff0000', weight: 12, opacity: 0.4 };
     }
     return isSelected ?   { color: '#800080', weight: 20, opacity: 0.25 } : { color: '#ffd000', weight: 12, opacity: 0.4  } ;
    
  }

  /*********************************************************************************************************************  
  *  getFeatureName:  gc2 layer name (table or view). eg. ledning_drift/knude_drift. 
  **********************************************************************************************************************/
  getFeatureName() {
    return this.featureName;
  }

  /*********************************************************************************************************************  
  *  getGeoJsonColumnName :  column name for geojson data in projektdata
  **********************************************************************************************************************/
  getGeoJsonColumnName() {
    return this.colName;
  }

  /*********************************************************************************************************************  
  *  selectedFeatureIdsGet:  list with ids  for selected features.
  **********************************************************************************************************************/
  selectedFeatureIdsGet() {
    return this.selectedFeatureIds;
  }

  /*********************************************************************************************************************  
  *  setMethod:  assign method on all selected features
  **********************************************************************************************************************/
  setMethod(method) {
    const updatedGeoJson = {
      ...this._geojson,
      features: this._geojson.features.map(feature => {
        if (this.selectedFeatureIds.contains(feature.properties.id)) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              metode: method
            }
          };
        }
        return feature;
      })
    };

    this._geojson = updatedGeoJson;
  }

 /*********************************************************************************************************************  
  *  setTerrain:  assign terrain on all selected features
 **********************************************************************************************************************/
    setTerrain(terrain) {
    const updatedGeoJson = {
      ...this._geojson,
      features: this._geojson.features.map(feature => {
        if (this.selectedFeatureIds.contains(feature.properties.id)) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              terraen: terrain
            }
          };
        }
        return feature;
      })
    };

    this._geojson = updatedGeoJson;
  }

/*********************************************************************************************************************  
  *  clear:  remove all features from the map and clear selectedFeatures collextion
 **********************************************************************************************************************/
   clear() {
    try {
      if (this._geojsonLayer && this._geojsonLayer.clearLayers) {
        this._geojsonLayer.clearLayers();
      }
      this._geojson.features = [];
      this.selectedFeatureIds.clear();
      this.selectedFeatureId = null;
    } catch (e) {
      console.error("Error in selectedFeaturesClear: " + e);
    }
  }


 /*********************************************************************************************************************  
  *  selectedFeaturesRemove:  remove feature by id from the selectedfeature collection
 **********************************************************************************************************************/
  selectedFeaturesRemove(featureId) {
    this.selectedFeatures = this.selectedFeatures.filter(id => id !== featureId);
  }


  /*********************************************************************************************************************  
  *  featureExists:  true if the feature is in the feature collection
 **********************************************************************************************************************/
  featureExists(feature) {
    return this._geojson.features.some(item => item.properties.id === feature.properties.id);
  }


  /*********************************************************************************************************************  
  * addFeature:  add feature to the featureCollection
  * - addToExisting: 
 **********************************************************************************************************************/
  addFeature(feature, addToExisting) {
    if (this.filterFunc && !this.filterFunc(feature)) {
      // console.warn("Feature filtered out by filterFunc: " + feature.properties.id);
      return false;
    }
    Object.keys(feature.properties).forEach(key => {
      if (!feature.properties[key]) {
        feature.properties[key] = '';
      }
    });
    if (addToExisting && this.featureExists(feature)) {

      console.warn("Feature with id already exists: " + feature.properties.id);
      return false;
    }

    this._geojson.features.push(feature);
    return true;
  }


 /*********************************************************************************************************************  
  * getFeatures:  get the entire feature collection
  * 
 **********************************************************************************************************************/
  getFeatures() {
     return this._geojson.features; 
  }
  
/*********************************************************************************************************************  
 * getFeaturesIdSort:  sorts the feature collection by id
 **********************************************************************************************************************/
  getFeaturesIdSort() {
    return this._geojson.features.sort((a, b) => {
      const idA = a.properties?.id ?? Infinity;  //  hvis id mangler
      const idB = b.properties?.id ?? Infinity;
      return idA - idB;
    });
  }


/*********************************************************************************************************************  
 * sortFeatures:  sorts the feature collection
 * - sortKey : the feature property to sort by
 * - direction : asc or  desc for assending or desending
 **********************************************************************************************************************/
  sortFeatures(sortKey, direction, isNumeric) {
   return this._geojson.features.sort((a, b) => {
    const valA = a.properties?.[sortKey] !== undefined 
      ? (isNumeric ? Number(a.properties[sortKey]) : a.properties[sortKey]?.toLowerCase()) 
      : (isNumeric ? -Infinity : '');  
    const valB = b.properties?.[sortKey] !== undefined 
      ? (isNumeric ? Number(b.properties[sortKey]) : b.properties[sortKey]?.toLowerCase()) 
      : (isNumeric ? -Infinity : '');  

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  }

/*********************************************************************************************************************  
 * length:  number of items in the feature collection
 **********************************************************************************************************************/
  length() {
    return this._geojson.features.length;
  }

 /*********************************************************************************************************************  
 * selectedCount:  number of items in the feature collection where isSelectec property is true
 **********************************************************************************************************************/
  selectedCount() {
    return this._geojson.features.filter(feature => feature.properties.isSelected).length;
  }


 /*********************************************************************************************************************  
 * addExtraProperties:  adding extra propertirs to all items in the feature collection
 **********************************************************************************************************************/
  addExtraProperties() {
    if (!this._geojson.features.length) return;

    this._geojson.features.forEach(feature => {
      if (!feature.properties.hasOwnProperty("isSelected")) {
        feature.properties.isSelected = true;
      }
      if (!feature.properties.hasOwnProperty("bem")) {
        feature.properties.bem = "";
      }
      if (!feature.properties.hasOwnProperty("metode")) {
        feature.properties.metode = "";
      }
      if (!feature.properties.hasOwnProperty("terraen")) {
        feature.properties.terraen = "";
      }

      if (!feature.properties.hasOwnProperty("hasVideo")) {
        feature.properties.hasVideo = false;
      }

      if (!feature.properties.hasOwnProperty("dybde") &&
        feature.properties.hasOwnProperty("bundkote") &&
        feature.properties.hasOwnProperty("terrænkote") &&
        feature.properties.hasOwnProperty("dækselkote") &&
        feature.properties.bundkote) {
        let dækselkote = null;
        let terrænkote = null;
        const bundkote = parseFloat(feature.properties.bundkote);
        let topKote = null;
        let dybde = null;
        if (feature.properties.dækselkote) {
          dækselkote = parseFloat(feature.properties.dækselkote);
        }
        if (feature.properties.terrænkote) {
          terrænkote = parseFloat(feature.properties.terrænkote);
        }
        topKote = Math.max(dækselkote || -Infinity, terrænkote || -Infinity);

        dybde = topKote !== null ? topKote - bundkote : null;
        feature.properties.dybde = dybde !== null ? parseFloat(dybde.toFixed(2)) : null;
      }
    });
  }

 /*********************************************************************************************************************  
 * zoomToFeature:  zoom to the feature in the map.
 **********************************************************************************************************************/
  zoomToFeature(feature) {
    const bounds = L.geoJSON(feature).getBounds();
    this.map.fitBounds(bounds, { maxZoom: 21 });
    this.map.setView(bounds.getCenter(), this.map.getZoom(), { animate: true });
  }

 /*********************************************************************************************************************  
 * zoomAll:  zoom to the extension of the feature collection in the map.
 **********************************************************************************************************************/
  zoomAll() {
    const layer = this._geojsonLayer ? this._geojsonLayer : L.geoJSON(this._geojson);
    if (layer) {
      let bounds = layer.getBounds();
      if (bounds.isValid()) {
        bounds = bounds.pad(0.1);
        this.map.fitBounds(bounds, { maxZoom: 21, animate: true });
      }
    }
  }


/*********************************************************************************************************************  
 * redraw:  redraw all features in the map with colors defined in the constructor
 * - hiliteFeatureId. features to draw with hilite color
 * control the the click in map functionality as well . TODO - seperate this in two functions
 **********************************************************************************************************************/
  redraw(hiliteFeatureId = null) {
    this.addExtraProperties();

    if (this._geojsonLayer) {
      this._geojsonLayer.clearLayers();
    }

    this._geojsonLayer = L.geoJSON(this._geojson, {
      style: (feature) => {
        const currentStyle = (hiliteFeatureId && feature.properties.id === hiliteFeatureId) ||
          this.selectedFeatureIds.contains(feature.properties.id)
          ? this.hiliteStyle
          : this.colorStyle;
        if (feature.properties.isSelected === false) {
          currentStyle.dashArray = '3, 4';
        }
        return currentStyle;
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.id) {
          layer.on('click', (e) => {
            //   Denne er fjernet så kortet ikke hopper når der klikkes på en feature
            // this.zoomToFeature(feature);
            this.selectedFeatureId = feature.properties.id;

            if (this.selectedFeatureIds.contains(this.selectedFeatureId)) {
              this.selectedFeatureIds.remove(this.selectedFeatureId);
              this.hilite(0);
              return;
            }

            const ctrlKey = e.originalEvent.ctrlKey;
            this.selectedFeatureIds.add(this.selectedFeatureId, !ctrlKey);
            this.hilite(this.selectedFeatureId);

            this.backboneEvents.get().trigger(`${this.MAPSTATUS_MODULE_NAME}:updateSelected`, this.selectedFeatureId);

          });
        }
      }
    }).addTo(this.map);
  }

 
 /*********************************************************************************************************************  
 * hilite:  
  **********************************************************************************************************************/
  hilite(hiliteFeatureId) {

    Object.values(this.map._layers).forEach(layer => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer(featureLayer => {
          const id = featureLayer.feature?.properties?.id;

          const currentStyle = this.getFeatureStyle(featureLayer.feature);
          if (featureLayer.feature.properties.isSelected === false) {
            currentStyle.dashArray = '3, 4';
          }
          featureLayer.setStyle(currentStyle);
        });
      }
    });
  }

  /*********************************************************************************************************************  
 * byId:  
  **********************************************************************************************************************/
  byId(featureId) {
    const feature = this._geojson.features.find(f => f.properties.id === featureId);
    if (!feature) {
      console.error("Feature not found with id: " + featureId);
      return null;
    }
    return feature;
  }

 /*********************************************************************************************************************  
  * updateFeatureProperty:  
  **********************************************************************************************************************/
  updateFeatureProperty(featureId, propertyName, value) {
    const feature = this.byId(featureId);
    if (feature && feature.properties.hasOwnProperty(propertyName)) {
      feature.properties[propertyName] = value;
    }
  }

 /*********************************************************************************************************************  
  * deleteFeatureAsync:  
  **********************************************************************************************************************/
  async deleteFeatureAsync(schema, activeProject, delFeature) {
    if (!delFeature || !delFeature.properties || !delFeature.properties.id) {
      console.error("No ledning feature provided");
      return;
    }
    this._geojson.features = this._geojson.features.filter(feature => feature.properties.id !== delFeature.properties.id);
    this.redraw();
    await this.saveFeatureAsync(schema, activeProject);
    return this._geojson.features;
  }


  /*********************************************************************************************************************  
  * saveFeatureAsync:  
  **********************************************************************************************************************/
  async saveFeatureAsync(skema, projektData) {
    try {
      const projectBody = {
        ...projektData,
        featureName: this.featureName,
        colName: this.colName,
        skema: skema,
        geojson: this._geojson // overskriv geojson
      };

      const url = `/api/extension/mapstatus/saveprojectdata/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (e) {
      console.error("Error in saveFeatureAsync:", e);
      return {};
    }
  }


/*********************************************************************************************************************  
  * filterFeatures:  
  **********************************************************************************************************************/
  filterFeatures(filterFunc) {
    if (typeof filterFunc !== 'function') {
      console.error("filterFunc is not a function");
      return;
    }
    this._geojson.features = this._geojson.features.filter(filterFunc);
  }
 
/*********************************************************************************************************************  
  * buildProjectFeatures:  
  **********************************************************************************************************************/
  buildProjectFeatures(projektData) {
    if (!Object.hasOwn(projektData, this.colName)) {
      console.error(`Column name ${this.colName} does not exist in projektData`);
      return projektData;
    }
    this.clear();
    const geojsonStr = projektData[this.colName];
    const geoJson = JSON.parse(geojsonStr);
    const features = geoJson.features;
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      this.addFeature(feature, false);
    }
  }

/*********************************************************************************************************************  
  * getCloudConnectUrl:  
  **********************************************************************************************************************/
  async getCloudConnectUrl(skema) {
    try {

      const url = `/api/extension/mapstatus/GetCloudConnectLink/${skema}`;
      const data = await this.fetchDataAsync(url);
      if (!data || !data.features || data.features.length === 0) {
        return ['', '']; // Return empty strings if no data is foun d
      }

      return [data.features[0].properties.tv_url_prefix, data.features[0].properties.tv_url_postfix]

    } catch (e) {
      console.error("Error in getCloudConnectUrl: " + e);
      return {};
    }
  }

  /*********************************************************************************************************************  
  * getLedningFilmfilAsync:  
  **********************************************************************************************************************/
  async getLedningFilmfilAsync(skema, ledningId) {
    if (!skema) {
      console.error("No skema provided");
      return;
    }
    if (!ledningId) {
      console.error("No ledningId provided");
      return;
    }
    try {
      const url = `/api/extension/mapstatus/GetTvfilmfil/${skema}/${ledningId}`;
      const data = await this.fetchDataAsync(url);
      if (data && data.features && data.features.length > 0) {
        return data.features[0].properties.filmfil;
      } else {
        console.warn("No filmfil found for  id: " + ledningId);
        return '';
      }
    } catch (e) {
      console.error("Error in GetTvfilmfil: " + e);
      return null;
    }
  }


  /*********************************************************************************************************************  
  * getLedningRapportnrAsync:  
  **********************************************************************************************************************/
  async getLedningRapportnrAsync(skema, ledningId) {
    if (!skema) {
      console.error("No skema provided");
      return;
    }
    if (!ledningId) {
      console.error("No ledningId provided");
      return;
    }
    try {
      const url = `/api/extension/mapstatus/GetRapportnr/${skema}/${ledningId}`;
      const data = await this.fetchDataAsync(url);
      if (data && data.features && data.features.length > 0) {
        return data.features[0].properties.rapport;

      } else {
        console.warn("No rapportid found with id: " + ledningId);
        return '';
      }
    } catch (e) {
      console.error("Error in getLedningRapportnrAsync: " + e);
      return null;
    }
  }

  /*********************************************************************************************************************  
  * getBroendRapportnrAsync:  
  **********************************************************************************************************************/
  async getBroendRapportnrAsync(skema, knudenavn) {
    if (!skema) {
      console.error("No skema provided");
      return;
    }
    if (!knudenavn) {
      console.error("No knudenavn provided");
      return;
    }
    try {
      const url = `/api/extension/mapstatus/GetBrrapUrl/${skema}/${knudenavn}`;
      const data = await this.fetchDataAsync(url);
      if (data && data.features && data.features.length > 0) {
        return data.features[0].properties.brrap;

      } else {
        console.warn("No broendrapport for: " + knudenavn);
        return '';
      }
    } catch (e) {
      console.error("Error in getBroendRapportnrAsync: " + e);
      return null;
    }
  }

}
