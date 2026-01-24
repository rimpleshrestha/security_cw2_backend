const Joi = require("joi");

// Middleware factory
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ message: messages.join(", ") });
  }
  next();
};

module.exports = validate;
