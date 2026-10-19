/**
 * Shared helpers for scenario modules
 */

function makeLog(level, service, message, code) {
  return {
    timestamp: new Date(),
    level,
    service,
    message,
    code: code || null,
  };
}

module.exports = { makeLog };
