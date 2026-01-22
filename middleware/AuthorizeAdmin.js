const User = require("../model/user.model.js");

async function AuthorizeAdmin(req, res, next) {
  try {
    const userId = req.user;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    next();
  } catch (error) {
    console.log("Error in admin authorization", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { AuthorizeAdmin };
