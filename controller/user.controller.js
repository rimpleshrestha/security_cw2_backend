const User = require("../model/user.model.js");
const { comparePassword, encryptPassword } = require("../utils/bcrypt.js");
const { uploadImageToCloudinary } = require("../utils/cloudinary.js");
const {
  generateJWTToken,
  generateRefreshToken,
  cookiesOptions,
} = require("../utils/jwt.js");
const logActivity = require("../utils/activityLogger.js");

// Password regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

// --- SIGNUP ---
const signupController = async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;

    if ([email, password, confirm_password].some((f) => f.trim() === ""))
      return res.status(400).json({ message: "All fields are required" });

    if (password !== confirm_password)
      return res.status(400).json({ message: "Passwords don't match" });

    if (!passwordRegex.test(password))
      return res.status(400).json({
        message:
          "Password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.",
      });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Email is Taken" });

    const encryptedPassword = await encryptPassword(password);

    const user = await User.create({ email, password: encryptedPassword });
    if (!user)
      return res.status(400).json({ message: "Server Error Creating User" });

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    await logActivity(user._id, "Signup success");

    return res
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .cookie("accessToken", accessToken, cookiesOptions)
      .status(201)
      .json({ message: "User Created Successfully", accessToken });
  } catch (error) {
    console.log("error during signup", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Signup" });
  }
};

// --- LOGIN ---
const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if ([email, password].some((f) => !f || f.trim() === ""))
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email });
    if (!user) {
      await logActivity(null, `Login failed for email: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      await logActivity(user._id, "Login failed");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    await logActivity(user._id, "Login success");

    return res
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .cookie("accessToken", accessToken, cookiesOptions)
      .status(200)
      .json({
        message: "Login Successful",
        accessToken,
        userRole: user.role,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
      });
  } catch (error) {
    console.log("error during login", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Login" });
  }
};

// --- CHANGE PASSWORD ---
const changePasswordController = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    if ([email, new_password, confirm_password].some((f) => f.trim() === ""))
      return res.status(400).json({ message: "All fields are required" });

    if (new_password !== confirm_password)
      return res.status(400).json({ message: "New passwords don't match" });

    if (!passwordRegex.test(new_password))
      return res.status(400).json({
        message:
          "New password must be at least 6 characters, include an uppercase letter, a lowercase letter, and a number.",
      });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = await encryptPassword(new_password);
    await user.save();

    await logActivity(user._id, "Password change");

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("error during password change", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Password Change" });
  }
};

// --- DELETE USER ---
const deleteUserController = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ _id: req.user });
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    await logActivity(req.user, "User deleted");

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("error during user deletion", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During User Deletion" });
  }
};

// --- UPDATE NAME ---
const updateUserNameController = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "")
      return res.status(400).json({ message: "Name is required" });

    const user = await User.findOneAndUpdate(
      { _id: req.user },
      { name },
      { new: true, runValidators: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res
      .status(200)
      .json({ message: "User name updated successfully", user });
  } catch (error) {
    console.log("error during updating user name", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During User Name Update" });
  }
};

// --- UPDATE PROFILE IMAGE ---
const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = await uploadImageToCloudinary(req.file.path);
    if (!imageUrl)
      return res.status(500).json({ message: "Failed to upload image" });

    const user = await User.findByIdAndUpdate(
      req.user,
      { avatar: imageUrl.url },
      { new: true, runValidators: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res
      .status(200)
      .json({ message: "Profile image updated successfully", user });
  } catch (error) {
    console.log("error during updating profile image", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Profile Image Update" });
  }
};

// --- EXPORT ALL CONTROLLERS ---
module.exports = {
  signupController,
  loginController,
  changePasswordController,
  deleteUserController,
  updateUserNameController,
  updateProfileImage,
};
