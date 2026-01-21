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

const router = express.Router();

router.post("/signup", signupController);
router.post("/login", loginController);
router.put("/change-password", changePasswordController);
router.put("/update-details", Authenticate, updateUserNameController);
router.put(
  "/update-profile-image",
  upload.single("pfp"),
  Authenticate,
  updateProfileImage
);
router.delete("/delete-user", Authenticate, deleteUserController);

module.exports = router;
