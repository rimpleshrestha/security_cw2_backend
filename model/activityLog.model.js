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

// Safe model export to prevent OverwriteModelError
module.exports =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
