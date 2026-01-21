const jwt = require("jsonwebtoken");
const generateJWTToken = (body) => {
  const token = jwt.sign(body, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "24h",
  });
  return token;
};

const generateRefreshToken = (body) => {
  const token = jwt.sign(body, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "30d",
  });
  return token;
};
const cookiesOptions = {
  // httpOnly: true,
  // secure: true,
  // sameSite: "none",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
module.exports = { generateJWTToken, generateRefreshToken, cookiesOptions };
