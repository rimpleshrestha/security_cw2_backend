const express = require("express");
const {
  loginController,
  signupController,
  logoutController, // new
  updateUserNameController,
  changePasswordController,
  deleteUserController,
  updateProfileImage,
} = require("../controller/user.controller.js");
const { Authenticate } = require("../middleware/VerifyJWT.js");
const { AuthorizeAdmin } = require("../middleware/AuthorizeAdmin.js");
const upload = require("../utils/upload.js");
const { loginLimiter } = require("../utils/ratelimiter.js");

const router = express.Router();

// --- AUTH ROUTES ---
router.post("/signup", signupController);
router.post("/login", loginLimiter, loginController);
router.post("/logout", Authenticate, logoutController); // logout route

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

// --- ADMIN-ONLY ROUTE (Task 6) ---
router.get("/admin-only", Authenticate, AuthorizeAdmin, (req, res) => {
  res.status(200).json({ message: "Welcome, Admin! You have access." });
});

module.exports = router;
