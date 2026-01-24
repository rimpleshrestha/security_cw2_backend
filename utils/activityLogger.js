const mongoose = require("mongoose");

// Activity log schema
const ActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    ipAddress: { type: String }, // added IP address
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);

// Utility function to log activity
// Accepts optional ipAddress
const logActivity = async (userId, action, ipAddress = null) => {
  try {
    await ActivityLog.create({ userId, action, ipAddress });
  } catch (err) {
    console.log("Failed to log activity:", err);
  }
};

module.exports = logActivity;
