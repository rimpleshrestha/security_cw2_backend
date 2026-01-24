const express = require("express");
const {
  loginController,
  signupController,
  logoutController,
  updateUserNameController,
  changePasswordController,
  deleteUserController,
  updateProfileImage,
  verifyOtpController,
} = require("../controller/user.controller.js");

const { Authenticate } = require("../middleware/VerifyJWT.js");
const { AuthorizeAdmin } = require("../middleware/AuthorizeAdmin.js");
const validate = require("../middleware/validate");
const {
  signupSchema,
  loginSchema,
  otpSchema,
  changePasswordSchema,
} = require("../middleware/userSchemas");

const upload = require("../utils/upload.js");
const { loginLimiter } = require("../utils/ratelimiter.js");

const router = express.Router();

// ================= AUTH ROUTES =================

router.post("/signup", validate(signupSchema), signupController);

router.post("/login", loginLimiter, validate(loginSchema), loginController);

router.post("/verify-otp", validate(otpSchema), verifyOtpController);

router.post("/logout", Authenticate, logoutController);

// ================= USER ROUTES =================

router.put(
  "/change-password",
  Authenticate,
  validate(changePasswordSchema),
  changePasswordController,
);

router.put("/update-details", Authenticate, updateUserNameController);

router.put(
  "/update-profile-image",
  Authenticate,
  upload.single("pfp"),
  updateProfileImage,
);

router.delete("/delete-user", Authenticate, deleteUserController);

// ================= ADMIN ROUTE =================

router.get("/admin-only", Authenticate, AuthorizeAdmin, (req, res) => {
  res.status(200).json({
    message: "Welcome, Admin! You have access.",
  });
});

module.exports = router;
