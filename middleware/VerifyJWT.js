const jwt = require("jsonwebtoken");
const User = require("../model/user.model.js");

async function Authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Unauthorized: Token expired" });
      }
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    // attach only user ID (as assignment expects)
    req.user = decodedToken.id;

    next();
  } catch (error) {
    console.log("Error in authentication:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error during authentication" });
  }
}

module.exports = { Authenticate };
