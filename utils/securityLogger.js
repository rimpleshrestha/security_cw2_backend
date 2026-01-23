const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../logs/security.log");

function logSecurityEvent(type, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    meta,
  };

  fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n", (err) => {
    if (err) console.error("Security log error:", err);
  });
}

module.exports = logSecurityEvent;
