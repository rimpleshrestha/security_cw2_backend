const express = require("express");
const {
  loginController,
  signupController,
  updateUserNameController,
  changePasswordController,
  deleteUserController,
  updateProfileImage,
} = require("../controller/user.controller.js");
const { Authenticate } = require("../middleware/VerifyJWT.js");
const upload = require("../utils/upload.js");
const { loginLimiter } = require("../utils/rateLimiter.js"); // added rate limiter

const router = express.Router();

// --- AUTH ROUTES ---
router.post("/signup", signupController);
router.post("/login", loginLimiter, loginController); // apply login limiter here

// --- USER ROUTES ---
router.put("/change-password", Authenticate, changePasswordController);
router.put("/update-details", Authenticate, updateUserNameController);
router.put(
  "/update-profile-image",
  upload.single("pfp"),
  Authenticate,
  updateProfileImage,
);
router.delete("/delete-user", Authenticate, deleteUserController);

module.exports = router;
