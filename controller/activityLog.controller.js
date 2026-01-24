// controller/activityLog.controller.js
const ActivityLog = require("../model/activityLog.model.js");

// Fetch all activity logs (Admin only)
const getAllActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate("userId", "email role")
      .sort({ timestamp: -1 });

    res.status(200).json({
      message: "Activity logs fetched successfully",
      logs,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
};

// ✅ Named export
module.exports = { getAllActivityLogs };
