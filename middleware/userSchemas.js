const Joi = require("joi");

// Block $ and {} to prevent NoSQL injection
const safeString = Joi.string().pattern(/^[^${}]*$/, "no $ or {}");

// Signup schema
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: safeString.min(6).required(),
  confirm_password: safeString.min(6).required(),
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: safeString.min(6).required(),
  captchaValue: Joi.string().optional(),
});

// OTP verification schema
const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: safeString.length(6).required(),
});

// Change password schema
const changePasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  new_password: safeString.min(6).required(),
  confirm_password: safeString.min(6).required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  otpSchema,
  changePasswordSchema,
};
