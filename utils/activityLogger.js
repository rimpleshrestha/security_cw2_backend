const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

const logActivity = async (userId, action) => {
  try {
    await ActivityLog.create({ userId, action });
  } catch (err) {
    console.log("Failed to log activity:", err);
  }
};

module.exports = logActivity;
