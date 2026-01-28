// routes/user.route.js
const express = require("express");
const router = express.Router();

const {
  loginController,
  signupController,
  logoutController,
  updateUserNameController,
  changePasswordController,
  deleteUserController,
  updateProfileImage,
  verifyOtpController,
  requestPasswordResetController, // ✅ new
  resetPasswordController, // ✅ new
} = require("../controller/user.controller.js");

const {
  getAllActivityLogs,
} = require("../controller/activityLog.controller.js");

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

// ================= AUTH ROUTES =================
router.post("/signup", validate(signupSchema), signupController);
router.post("/login", loginLimiter, validate(loginSchema), loginController);
router.post("/verify-otp", validate(otpSchema), verifyOtpController);
router.post("/logout", Authenticate, logoutController);

// ================= PASSWORD RESET =================
router.post(
  "/request-password-reset",

  requestPasswordResetController,
);
router.post(
  "/reset-password",

  resetPasswordController,
);

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

// ================= ADMIN ROUTES =================
// Test admin access
router.get("/admin-only", Authenticate, AuthorizeAdmin, (req, res) => {
  res.status(200).json({ message: "Welcome, Admin! You have access." });
});

// Activity logs (Admin only)
router.get("/activity-logs", Authenticate, AuthorizeAdmin, getAllActivityLogs);

module.exports = router;
