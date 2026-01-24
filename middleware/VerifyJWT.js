const jwt = require("jsonwebtoken");

async function Authenticate(req, res, next) {
  try {
    // 1️⃣ Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify token
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });

      // Attach user ID to request (used across app)
      req.user = decodedToken.id;

      next();
    } catch (err) {
      // 3️⃣ Handle specific JWT errors
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Unauthorized: Token expired. Please log in again.",
        });
      }

      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Unauthorized: Invalid token",
        });
      }

      return res.status(401).json({
        message: "Unauthorized: Authentication failed",
      });
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      message: "Internal server error during authentication",
    });
  }
}

module.exports = { Authenticate };
