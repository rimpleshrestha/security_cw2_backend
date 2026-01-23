const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

module.exports = { generateOTP, hashOTP };
