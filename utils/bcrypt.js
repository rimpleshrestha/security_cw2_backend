const bcrypt = require("bcrypt");

const encryptPassword = async (password) => {
  const saltRounds = Number(process.env.SALT) || 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = { encryptPassword, comparePassword };
