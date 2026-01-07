var express = require("express");
var request = require("request");
var router = express.Router();
var moment = require("moment");
var config = require("../../../config/config.js");

// SET GC2 HOST
GC2_HOST = config.gc2.host;

// Set locale for date/time string
moment.locale("da_DK");

// Set secrets for this demo
const outdateAfterMinutes = 10;
const dv_uri = config.extensionConfig.orbiinsight.dv_uri;
const publicAccessToken = config.extensionConfig.orbiinsight.accessToken;
const rw_access = config.extensionConfig.orbiinsight.rw_access || [];
const DV_origin = '30'

// In-memory storage of data
const dataStore = {};
const retain_minutes = 20;

/**
 * This function handles basic checks for each request
 * @param req
 * @param response
 */
function guard(req, response) {
  // guard against missing session (not logged in to GC2)
  if (!req.session.hasOwnProperty("gc2SessionId")) {
    response
      .status(401)
      .send("No active session - please login in the vidi application");
    return;
  }

  // else do nothing
  return;
}

function protected(req, response) {
  // Check if user has write access
  if (!req.session.hasOwnProperty("screenName") || !rw_access.includes(req.session.screenName)) {
    response.status(403).send("Insufficient permissions");
    return;
  }
}

// Get current user and setup
router.get("/api/extension/orbiinsight/:tenantid", async function (req, response) {
  guard(req, response);

  // Get the current cache of data from DV, unless expired
  const tenantid = req.params.tenantid;


  // if there is a force query parameter, clear cache
  if (req.query.hasOwnProperty("force")) {
    if (req.query.force === "true") {
      // Clear cached data
      delete dataStore[tenantid];
    }
  }

  // Check if data is expired, else get new data from DV and update store
  if (dataStore.hasOwnProperty(tenantid)) {
    let lastUpdated = dataStore[tenantid].lastUpdated;
    let now = new Date();
    let diffMinutes = (now - lastUpdated) / (1000 * 60);
    if (diffMinutes < retain_minutes) {
      // Return cached data
      response.json(dataStore[tenantid]);
      return;
    }
  }
  
  // Get new data from DV
  let data = [];
  let tasktype = [];
  let lastSynced = null;
  let allow_write = false;

  // Check if the current user has write access, right now its just username based
  if (req.session.hasOwnProperty("screenName")) {
    let username = req.session.screenName;
    if (rw_access.includes(username)) {
      allow_write = true;
    } 
  }

  try {
    data = await read_data_from_dv(tenantid);
    tasktype = await read_tasktype_from_dv(tenantid);
    lastSynced = new Date();

    // Update data store
    dataStore[tenantid] = {
      data: data,
      tasktype: tasktype,
      lastUpdated: lastSynced,
      allowWrite: allow_write,
    };

  } catch (error) {
    response.status(500).send("Error fetching data from DV");
    return;
  } 

  // Return data from store, none if no data is found.
  response.json(dataStore[tenantid] || {
    data: [],
    lastUpdated: null
  });
});

// Get single task by id
router.get("/api/extension/orbiinsight/:tenantid/task/:taskid", async function (req, response) {
  guard(req, response);
  const tenantid = req.params.tenantid;
  const taskid = req.params.taskid;
  let task = null;
  try {
    task = await read_task_from_dv(tenantid, taskid);
  } catch (error) {
    response.status(500).send("Error fetching task from DV");
    return;
  }

  // Return the task if found
  response.json(task || {
    data: null,
    lastUpdated: null
  });
});

// Save task updates
router.put("/api/extension/orbiinsight/:tenantid/task/:taskid", async function (req, response) {
  guard(req, response);
  protected(req, response);
  
  const tenantid = req.params.tenantid;
  const taskid = req.params.taskid;
  const updatedProperties = JSON.parse(req.body).properties;

  // Strip some properties
  const propertiesToStrip = ["logItems", "isAcknowledged", "hasUnreadLog","receipientPopUp"];
  propertiesToStrip.forEach(prop => delete updatedProperties[prop]);

  options = {
    uri: dv_uri + tenantid + "/task/" + taskid,
    headers: {
      "Content-Type": "application/json",
      "publicAccessToken": publicAccessToken,
      "Accept": "application/json",
    },
    body: JSON.stringify(updatedProperties),
  };
  request.put(options, function (error, res, body) {
    if (error) {
      console.error("Error updating task in DV:", error);
      response.status(500).send("Error updating task in DV");
    } else {
      data = JSON.parse(body);
      response.status(res.statusCode)
      response.json(data);
    }
  });
});

// Create new task
router.post("/api/extension/orbiinsight/:tenantid/task", async function (req, response) {
  guard(req, response);
  protected(req, response);

  const tenantid = req.params.tenantid;
  const frontendTaskData = req.body;

  try {
    // Transform frontend task data to DV API format
    const transformedTaskData = transformTaskDataForDV(frontendTaskData, tenantid);
    
    const options = {
      uri: dv_uri + tenantid + "/task",
      headers: {
        "Content-Type": "application/json",
        "publicAccessToken": publicAccessToken,
        "Accept": "application/json",
      },
      body: JSON.stringify(transformedTaskData),
    };

    request.post(options, function (error, res, body) {
      if (error) {
        console.error("Error creating task in DV:", error);
        response.status(500).send("Error creating task in DV");
        return;
      } else {
        data = JSON.parse(body);
        response.status(res.statusCode)
        response.json(data);
      }
    });

  } catch (error) {
    console.error("Error preparing task data:", error);
    response.status(400).send("Invalid task data");
  }
});


// Get data from DV
function read_data_from_dv(tenant_id) {
  var options = {
    uri: dv_uri + tenant_id + "/task",
    headers: {
      "Content-Type": "application/json",
      "publicAccessToken": publicAccessToken,
      "Accept": "application/json",
    },
  };

  return new Promise(function (resolve, reject) {
    request.get(options, function (error, res, body) {
      if (error) {
        console.error("Error fetching data from DV:", error);
        reject(error);
      } else {
        data = JSON.parse(body);
        // The data is fine, but forceing it into geojson is better.
        let geojsonFeatures = data.data.map((item) => {
          return convertToGeoJSONFeature(item);
        });
        resolve(geojsonFeatures);
      }
    });
  });
}

// Get task types from DV
function read_tasktype_from_dv(tenant_id) {
  var options = {
    uri: dv_uri + tenant_id + "/tasktype",
    headers: {
      "Content-Type": "application/json",
      "publicAccessToken": publicAccessToken,
      "Accept": "application/json",
    },
  };

  return new Promise(function (resolve, reject) {
    request.get(options, function (error, res, body) {
      if (error) {
        console.error("Error fetching data from DV:", error);
        reject(error);
      } else {
        data = JSON.parse(body);

        // The data is fine, but the "configJson" field is a string that needs parsing
        data = data.map((item) => {
          if (item.hasOwnProperty("configJson") && item.configJson) {
            item.configJson = JSON.parse(item.configJson);
          }
          return item;
        });

        resolve(data);
      }
    });
  });
}

// Get single task from DV
function read_task_from_dv(tenant_id, task_id) {
  var options = {
    uri: dv_uri + tenant_id + "/task/" + task_id,
    headers: {
      "Content-Type": "application/json",
      "publicAccessToken": publicAccessToken,
      "Accept": "application/json",
    },
  };
  return new Promise(function (resolve, reject) {
    request.get(options, function (error, res, body) {
      if (error) {
        console.error("Error fetching data from DV:", error);
        reject(error);
      } else {
        data = JSON.parse(body);
        resolve(convertToGeoJSONFeature(data));
      }
    });
  });
}
// Simple WKT to GeoJSON converter
wktToGeoJSON = function (wkt) {
  // Simple WKT to GeoJSON converter for POINT geometries
  if (wkt.startsWith("POINT")) {
    const coordsText = wkt.slice(7, -1).trim(); // Remove "POINT (" and ")"
    const coords = coordsText.split(" ").map(Number);
    return {
      type: "Point",
      coordinates: coords,
    };
  }
  return null;
};

// Convert item with WKT geometry to GeoJSON feature
function convertToGeoJSONFeature(item) {
  if (item.hasOwnProperty("geometryWkt") && item.geometryWkt) {
    // Convert WKT to GeoJSON geometry
    let geojson = wktToGeoJSON(item.geometryWkt);
    let srid = item.geometrySrid || "EPSG:4326";
    
    // Create a copy of the item to avoid modifying the original
    let properties = { ...item };
    
    // Return as GeoJSON feature
    return {
      type: "Feature",
      crs: {
        type: "name",
        properties: { 
          name: srid
        },
      },
      geometry: geojson,
      properties: properties,
    };
  }
  return null;
}

// Transform frontend task data to DV API format
function transformTaskDataForDV(frontendData, tenantId) {
  const taskTypeDefinition = getTaskTypeDefinition(frontendData.taskTypeGuid, tenantId);
  
  return [{
    taskTypeGuid: frontendData.taskTypeGuid,
    geometryWkt: createGeometryWkt(frontendData.location),
    geometrySrid: 4326,
    description: frontendData.description || "",
    OpsTaskFeatureRelations: [],
    properties: transformProperties(frontendData.properties, taskTypeDefinition),
    origin: parseInt(DV_origin),
    addressString: frontendData.addressString || "",
    ...extractContactAndPriorityFields(frontendData)
  }];
}

// Get task type definition from cache
function getTaskTypeDefinition(taskTypeGuid, tenantId) {
  if (!dataStore[tenantId]?.tasktype) {
    return null;
  }
  
  return dataStore[tenantId].tasktype.find(
    taskType => taskType.guid === taskTypeGuid
  );
}

// Create WKT geometry string from location object
function createGeometryWkt(location) {
  return `POINT (${location.lng} ${location.lat})`;
}

// Transform properties object to API properties array format
function transformProperties(properties, taskTypeDefinition) {
  if (!properties || typeof properties !== 'object') {
    return [];
  }
  
  return Object.entries(properties).map(([key, value]) => ({
    propertyName: key,
    propertyValue: convertPropertyValue(value, getPropertyKind(key, taskTypeDefinition)),
    kind: getPropertyKind(key, taskTypeDefinition)
  }));
}

// Get the correct 'kind' for a property based on task type definition
function getPropertyKind(propertyName, taskTypeDefinition) {
  const defaultKind = "String";
  
  if (!taskTypeDefinition?.configJson?.properties) {
    return defaultKind;
  }
  
  const propertyDef = taskTypeDefinition.configJson.properties.find(
    prop => prop.propertyName === propertyName
  );
  
  return propertyDef ? mapDataTypeToKind(propertyDef.dataType) : defaultKind;
}

// Extract contact and priority fields from frontend data
function extractContactAndPriorityFields(frontendData) {
  const fields = {};
  const contactFields = ['contactName', 'contactPhoneNumber', 'contactEmail', 'priority'];
  
  contactFields.forEach(field => {
    if (frontendData[field]) {
      fields[field] = frontendData[field];
    }
  });
  
  return fields;
}

// Map data types from task type definition to API 'kind' values
function mapDataTypeToKind(dataType) {
  const dataTypeMap = {
    'Text': 'String',
    'TextMultiline': 'String',
    'DropDownString': 'String',
    'Integer': 'Int',
    'DropDownInt': 'Int',
    'Decimal': 'Decimal',
    'DateTime': 'DateTime',
    'Boolean': 'Boolean'
  };
  
  return dataTypeMap[dataType] || 'String';
}

// Convert property value to the appropriate type
function convertPropertyValue(value, kind) {
  const converters = {
    'Int': (val) => parseInt(val) || 0,
    'Decimal': (val) => parseFloat(val) || 0.0,
    'Boolean': (val) => Boolean(val),
    'DateTime': (val) => String(val),
    'String': (val) => String(val)
  };
  
  const converter = converters[kind] || converters['String'];
  return converter(value);
}

module.exports = router;
