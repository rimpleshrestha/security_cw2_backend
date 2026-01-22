const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String, // optional: store user's IP
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
module.exports = ActivityLog;
