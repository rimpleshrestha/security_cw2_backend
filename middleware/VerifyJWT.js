const jwt = require("jsonwebtoken");

function Authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log(token);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    console.log(decodedToken);
    req.user = decodedToken?.id;
    next();
  } catch (error) {
    console.log("error in authentication", error);
    res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { Authenticate };
