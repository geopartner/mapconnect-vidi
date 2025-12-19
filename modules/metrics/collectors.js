/*
 * @author     Rene Borella <rgb@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

const Prometheus = require('prom-client');

// SQL Query Metrics
let sqlQueryCounter, sqlQueryDuration, sqlResponseSize;

// WMS Request Metrics
let wmsRequestCounter, wmsRequestDuration, wmsResponseSize;

// Print Request Metrics
let printCounter, printDurationHistogram;

// Error Metrics
let uncaughtExceptionsCounter, socketErrorsCounter;

// User Activity Metrics
let userActivityCounter, userSessionDuration, activeUsersGauge;

// Set common bucket sizes for histograms
const millisecondsBuckets = [100, 500, 1000, 2000, 5000, 10000, 30000, 60000, 120000, 240000];
const bytesBuckets = [1000, 10000, 100000, 1000000, 10000000, 100000000];
const sessionDurationBuckets = [60000, 300000, 900000, 1800000, 3600000, 7200000, 14400000, 28800000]; // 1min to 8hrs

/**
 * Initialize all Prometheus metrics collectors
 */
function initializeCollectors() {
    // SQL Query Metrics
    sqlQueryCounter = new Prometheus.Counter({
        name: 'vidi_controllers_gc2_sql_queries_total',
        help: 'Total number of SQL queries processed',
        labelNames: ['db', 'format', 'status']
    });

    sqlQueryDuration = new Prometheus.Histogram({
        name: 'vidi_controllers_gc2_sql_query_duration_milliseconds',
        help: 'Duration of SQL queries in milliseconds',
        labelNames: ['db', 'format'],
        buckets: millisecondsBuckets
    });

    sqlResponseSize = new Prometheus.Histogram({
        name: 'vidi_controllers_gc2_sql_response_size_bytes',
        help: 'Size of SQL query responses in bytes',
        labelNames: ['db', 'format'],
        buckets: bytesBuckets
    });

    // WMS Request Metrics
    wmsRequestCounter = new Prometheus.Counter({
        name: 'vidi_controllers_gc2_wms_requests_total',
        help: 'Total number of WMS requests processed',
        labelNames: ['db', 'request_type', 'status']
    });

    wmsRequestDuration = new Prometheus.Histogram({
        name: 'vidi_controllers_gc2_wms_request_duration_milliseconds',
        help: 'Duration of WMS requests in milliseconds',
        labelNames: ['db', 'request_type'],
        buckets: millisecondsBuckets
    });

    wmsResponseSize = new Prometheus.Histogram({
        name: 'vidi_controllers_gc2_wms_response_size_bytes',
        help: 'Size of WMS responses in bytes',
        labelNames: ['db', 'request_type'],
        buckets: bytesBuckets
    });

    // Print Request Metrics
    printCounter = new Prometheus.Counter({
        name: 'vidi_controllers_print_print_requests_total',
        help: 'Total number of print requests processed',
        labelNames: ['scale', 'format', 'status', 'template', 'db']
    });

    printDurationHistogram = new Prometheus.Histogram({
        name: 'vidi_controllers_print_duration_milliseconds',
        help: 'Duration of print operations in milliseconds',
        labelNames: ['format', 'template', 'db', 'scale'],
        buckets: millisecondsBuckets
    });

    // Error Metrics
    uncaughtExceptionsCounter = new Prometheus.Counter({
        name: 'vidi_uncaught_exceptions_total',
        help: 'Total number of uncaught exceptions',
        labelNames: ['type', 'origin']
    });

    socketErrorsCounter = new Prometheus.Counter({
        name: 'vidi_socket_errors_total',
        help: 'Total number of socket.io errors',
        labelNames: ['event', 'namespace']
    });

    // User Activity Metrics
    userActivityCounter = new Prometheus.Counter({
        name: 'vidi_user_activity_events_total',
        help: 'Total number of user activity events',
        labelNames: ['event_type', 'db', 'user_agent', 'username']
    });

    userSessionDuration = new Prometheus.Histogram({
        name: 'vidi_user_session_duration_milliseconds',
        help: 'Duration of user sessions in milliseconds',
        labelNames: ['db', 'user_agent', 'username'],
        buckets: sessionDurationBuckets
    });

    activeUsersGauge = new Prometheus.Gauge({
        name: 'vidi_active_users_current',
        help: 'Current number of actively interacting users',
        labelNames: ['db', 'username']
    });
}

/**
 * Get SQL metrics collectors
 * @returns {Object} SQL metrics objects
 */
function getSqlMetrics() {
    return {
        counter: sqlQueryCounter,
        duration: sqlQueryDuration,
        responseSize: sqlResponseSize
    };
}

/**
 * Get WMS metrics collectors
 * @returns {Object} WMS metrics objects
 */
function getWmsMetrics() {
    return {
        counter: wmsRequestCounter,
        duration: wmsRequestDuration,
        responseSize: wmsResponseSize
    };
}

/**
 * Get Print metrics collectors
 * @returns {Object} Print metrics objects
 */
function getPrintMetrics() {
    return {
        counter: printCounter,
        duration: printDurationHistogram
    };
}

/**
 * Get Error metrics collectors
 * @returns {Object} Error metrics objects
 */
function getErrorMetrics() {
    return {
        uncaughtExceptions: uncaughtExceptionsCounter,
        socketErrors: socketErrorsCounter
    };
}

/**
 * Get User Activity metrics collectors
 * @returns {Object} User Activity metrics objects
 */
function getUserActivityMetrics() {
    return {
        activityCounter: userActivityCounter,
        sessionDuration: userSessionDuration,
        activeUsers: activeUsersGauge
    };
}

module.exports = {
    initializeCollectors,
    getSqlMetrics,
    getWmsMetrics,
    getPrintMetrics,
    getErrorMetrics,
    getUserActivityMetrics
};