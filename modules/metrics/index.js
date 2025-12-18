/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

const express = require('express');
const PrometheusBundle = require('express-prom-bundle');
const Prometheus = require('prom-client');
const config = require('../../config/config.js');
const collectors = require('./collectors');

// Track active user sessions for activity metrics
const activeSessions = new Map();
// Track user states per database
const userStates = new Map(); // sessionId -> {db, state, lastSeen}

/**
 * Initialize Prometheus metrics for the application
 * @param {Object} app - Express application instance
 */
function initializeMetrics(app) {
    if (!isEnabled()) {
        return;
    }

    // Initialize all metric collectors
    collectors.initializeCollectors();

    // Set up error metrics handlers
    setupErrorMetrics();

    // Set up user activity endpoint
    setupUserActivityEndpoint(app);

    // Initialize Prometheus metrics
    new Prometheus.AggregatorRegistry().setDefaultLabels({
        app: 'vidi',
        instance: process.env.HOSTNAME || 'localhost',
        version: config?.version || 'unknown',
    });

    // Register default metrics, and make sure to collect other endpoints
    const pathsToIgnore = [
        'favicon.ico',
        'images/',
        'css/',
        'js/',
        'node_modules/',
        'fonts/',
        'public/',
        'service-worker.bundle.js',
        'locale',
        '.well-known/appspecific/com.chrome.devtools.json',
        'icons/',
        //'connection-check.ico', - not this, we need it to track active maps
    ];
    
    const ignorestring = "/((?!(" + pathsToIgnore.map(path => path).join('|') + ")))*";
    app.use(ignorestring, PrometheusBundle({
        autoregister: false, // disable /metrics for single workers
        includeMethod: true,
        includePath: true,
        includeStatusCode: true,
        includeUp: false,
        httpDurationMetricName: 'vidi_http_request',
        normalizePath: [
            // Normalize app paths with database/schema parameters
            ['^/app/[^/]+/[^/]+.*', '/app/#db/#schema'],
            ['^/app/[^/]+.*', '/app/#db'],
            ['^/api/state-snapshots/[^/]+.*', '/api/state-snapshots/#db'],
            ['^/api/gc2/config/[^/]+.*', '/api/gc2/config/#config'],
            ['^/api/meta/[^/]+/[^/]+.*', '/api/meta/#db/#schema'],
            ['^/api/setting/[^/]+/[^/]+.*', '/api/setting/#db/#schema'],
            ['^/api/legend/[^/]+.*', '/api/legend/#db'],
            ['^/api/wms/[^/]+/[^/]+.*', '/api/wms/#db/#schema'],
            ['^/api/dataforsyningen/[^/]+.*', '/api/dataforsyningen/#param'],
            ['^/api/datafordeler/[^/]+.*', '/api/datafordeler/#param'],
            ['^/api/sql/nocache/[^/]+.*', '/api/sql/nocache/#db'],
            ['^/api/sql/[^/]+.*', '/api/sql/#db'],
            ['^/api/config/[^/]+.*', '/api/config/#db'],
            ['^/api/symbols/[^/]+.*', '/api/symbols/#param'],
            ['^/api/css/[^/]+.*', '/api/css/#param'],
            ['^/index.html', '/'],
            ['^/tmp/print/pdf/[^/]+.*', '/tmp/print/pdf/#param'],
            ['^/tmp/print/png/[^/]+.*', '/tmp/print/png/#param'],
            ['^/tmp/print/zip/[^/]+.*', '/tmp/print/zip/#param'],
        ],
    }));
}

/**
 * Start the metrics server for cluster metrics
 */
function startMetricsServer() {
    if (!isEnabled()) {
        return;
    }

    const metricsPort = config?.metrics?.port || 9100;
    const metricsApp = express();
    metricsApp.use('/metrics', PrometheusBundle.clusterMetrics());
    metricsApp.listen(metricsPort);
    console.log(`cluster metrics listening on ${metricsPort}`);
}

/**
 * Set up error metrics handlers
 */
function setupErrorMetrics() {
    if (!isEnabled()) {
        return;
    }

    const errorMetrics = collectors.getErrorMetrics();

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        errorMetrics.uncaughtExceptions.inc({ 
            type: error.name || 'UnknownError', 
            origin: 'uncaughtException' 
        });
        console.error('Uncaught Exception:', error);
        // Don't exit the process, just log and count
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        errorMetrics.uncaughtExceptions.inc({ 
            type: reason?.name || 'UnhandledRejection', 
            origin: 'unhandledRejection' 
        });
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}

/**
 * Set up user activity tracking endpoint
 * @param {Object} app - Express application instance
 */
function setupUserActivityEndpoint(app) {
    if (!isEnabled()) {
        return;
    }

    const userMetrics = collectors.getUserActivityMetrics();

    // Function to update user count gauges
    function updateUserGauges() {
        const counts = new Map();
        
        for (const [sessionId, userData] of userStates.entries()) {
            const key = `${userData.db}:${userData.username}`;
            if (!counts.has(key)) {
                counts.set(key, { 
                    db: userData.db, 
                    username: userData.username, 
                    active: 0
                });
            }
            
            const userCounts = counts.get(key);
            
            // Only count active users (visible and recently active)
            if (userData.state === 'active') {
                userCounts.active++;
            }
        }
        
        // Reset gauge and set new values
        userMetrics.activeUsers.reset();
        
        for (const [key, userCounts] of counts.entries()) {
            const labels = { db: userCounts.db, username: userCounts.username };
            userMetrics.activeUsers.set(labels, userCounts.active);
        }
    }

    // Endpoint for tracking user activity (compatible with sendBeacon)
    app.post('/api/metrics/user-activity', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
        try {
            let data;

            
            
            // Handle different payload types
            if (Buffer.isBuffer(req.body)) {
                // Body parsed as raw buffer (from express.raw)
                try {
                    data = JSON.parse(req.body.toString());
                } catch (e) {
                    console.error('Failed to parse buffer as JSON:', e);
                    console.error('Buffer content:', req.body.toString());
                    return res.status(400).json({ error: 'Invalid JSON in buffer' });
                }
            } else if (typeof req.body === 'string') {
                // Body parsed as string
                try {
                    data = JSON.parse(req.body);
                } catch (e) {
                    console.error('Failed to parse string as JSON:', e);
                    console.error('String content:', req.body);
                    return res.status(400).json({ error: 'Invalid JSON string' });
                }
            } else if (typeof req.body === 'object' && req.body !== null) {
                // Body already parsed as object
                data = req.body;
            } else {
                console.error('Invalid request body type:', typeof req.body);
                console.error('Request body value:', req.body);
                console.error('Request headers:', req.headers);
                return res.status(400).json({ error: 'Invalid payload format' });
            }

            //console.log('User activity data received:', data);

            const { 
                event_type, 
                db, 
                session_id, 
                session_duration,
                timestamp,
                username
            } = data;

            const userAgent = req.get('User-Agent') || 'unknown';
            const dbName = db || 'unknown';
            const eventType = event_type || 'unknown';
            const userName = username || 'anonymous';

            // Track the activity event
            userMetrics.activityCounter.inc({ 
                event_type: eventType, 
                db: dbName, 
                user_agent: userAgent,
                username: userName
            });

            // Update user state tracking
            if (session_id) {
                const now = Date.now();
                
                switch (eventType) {
                    case 'session_start':
                    case 'visibility_visible':
                    case 'user_active':
                        userStates.set(session_id, {
                            db: dbName,
                            state: 'active',
                            lastSeen: now,
                            username: userName
                        });
                        break;
                        
                    case 'user_loitering':
                        userStates.set(session_id, {
                            db: dbName,
                            state: 'loitering', 
                            lastSeen: now,
                            username: userName
                        });
                        break;
                        
                    case 'visibility_hidden':
                        userStates.set(session_id, {
                            db: dbName,
                            state: 'hidden',
                            lastSeen: now,
                            username: userName
                        });
                        break;
                        
                    case 'session_end':
                        userStates.delete(session_id);
                        if (session_duration) {
                            userMetrics.sessionDuration.observe(
                                { db: dbName, user_agent: userAgent, username: userName }, 
                                session_duration
                            );
                        }
                        break;
                }
                
                // Update gauges
                updateUserGauges();
            }

            // Send minimal response for sendBeacon compatibility
            res.status(204).end();
            
        } catch (error) {
            //console.error('Error processing user activity:', error);
            //console.error('Request body:', req.body);
            //console.error('Request headers:', req.headers);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Clean up stale sessions every 5 minutes
    setInterval(() => {
        const now = Date.now();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes
        
        for (const [sessionId, userData] of userStates.entries()) {
            if (now - userData.lastSeen > staleThreshold) {
                userStates.delete(sessionId);
            }
        }
        
        updateUserGauges();
    }, 5 * 60 * 1000);
}

/**
 * Set up socket.io error metrics
 * @param {Object} io - Socket.io server instance
 * @param {string} namespace - Socket namespace (optional)
 */
function setupSocketErrorMetrics(io, namespace = 'default') {
    if (!isEnabled()) {
        return;
    }

    const errorMetrics = collectors.getErrorMetrics();

    io.on('connection', (socket) => {
        socket.on('error', (error) => {
            errorMetrics.socketErrors.inc({ 
                event: 'connection_error', 
                namespace: namespace 
            });
            console.error('Socket.io connection error:', error);
        });

        socket.on('disconnect', (reason) => {
            if (reason === 'transport error' || reason === 'ping timeout') {
                errorMetrics.socketErrors.inc({ 
                    event: 'disconnect_error', 
                    namespace: namespace 
                });
                console.error('Socket.io disconnect error:', reason);
            }
        });
    });

    io.on('error', (error) => {
        errorMetrics.socketErrors.inc({ 
            event: 'server_error', 
            namespace: namespace 
        });
        console.error('Socket.io server error:', error);
    });
}

/**
 * Check if metrics are enabled
 * @returns {boolean} - Whether metrics are enabled
 */
function isEnabled() {
    return config?.metrics?.enabled === true;
}

module.exports = {
    initializeMetrics,
    startMetricsServer,
    setupSocketErrorMetrics,
    isEnabled,
    getSqlMetrics: collectors.getSqlMetrics,
    getWmsMetrics: collectors.getWmsMetrics,
    getPrintMetrics: collectors.getPrintMetrics,
    getErrorMetrics: collectors.getErrorMetrics,
    getUserActivityMetrics: collectors.getUserActivityMetrics
};