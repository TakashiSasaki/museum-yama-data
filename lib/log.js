/**
 * Standardized logging utility.
 */

function info(...args) {
    console.log('[INFO]', ...args);
}

function warn(...args) {
    console.warn('\x1b[33m[WARN]\x1b[0m', ...args);
}

function error(...args) {
    console.error('\x1b[31m[ERROR]\x1b[0m', ...args);
}

module.exports = {
    info,
    warn,
    error
};
