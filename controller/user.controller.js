const User = require("../model/user.model.js");
const { comparePassword, encryptPassword } = require("../utils/bcrypt.js");
const { uploadImageToCloudinary } = require("../utils/cloudinary.js");
const {
  generateJWTToken,
  generateRefreshToken,
  cookiesOptions,
} = require("../utils/jwt.js");

const signupController = async (req, res) => {
  try {
    console.log(req.body);
    const { email, password, confirm_password } = req.body;
    console.log(email, password, confirm_password);

    if (
      [email, password, confirm_password].some((field) => field.trim() == "")
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords don't match" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email is Taken" });
    }

    const encryptedPassword = await encryptPassword(password);
    const user = await User.create({
      email,
      password: encryptedPassword,
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Server Error During Creating a new user" });
    }

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    res
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .cookie("accessToken", accessToken, cookiesOptions)
      .status(201)
      .json({
        message: "User Created Successfully",
        accessToken: accessToken,
      });
  } catch (error) {
    console.log("error during signup", error);
    res.status(500).json({ message: "Internal Server Error During Signup" });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if ([email, password].some((field) => !field || field.trim() === "")) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    return res
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .cookie("accessToken", accessToken, cookiesOptions)
      .status(200)
      .json({
        message: "Login Successful",
        accessToken: accessToken,
        userRole: user.role,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
      });
  } catch (error) {
    console.log("error during login", error);
    res.status(500).json({ message: "Internal Server Error During Login" });
  }
};

const changePasswordController = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;
    console.log(email, new_password, confirm_password);
    if (
      [email, new_password, confirm_password].some(
        (field) => field.trim() == ""
      )
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "New passwords don't match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const encryptedNewPassword = await encryptPassword(new_password);
    user.password = encryptedNewPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("error during password change", error);
    res
      .status(500)
      .json({ message: "Internal Server Error During Password Change" });
  }
};

const deleteUserController = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ _id: req.user });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("error during user deletion", error);
    res
      .status(500)
      .json({ message: "Internal Server Error During User Deletion" });
  }
};

const updateUserNameController = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user },
      { name },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User name updated successfully",
      user,
    });
  } catch (error) {
    console.log("error during updating user name", error);
    res
      .status(500)
      .json({ message: "Internal Server Error During User Name Update" });
  }
};
const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log("File received:", req.file);
    const imageUrl = await uploadImageToCloudinary(req.file.path);
    if (!imageUrl) {
      return res.status(500).json({ message: "Failed to upload image" });
    }
    console.log("Image URL:", imageUrl);
    const user = await User.findByIdAndUpdate(
      req.user,
      { avatar: imageUrl.url },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    console.log("error during updating profile image", error);
    res
      .status(500)
      .json({ message: "Internal Server Error During Profile Image Update" });
  }
};
module.exports = {
  signupController,
  loginController,
  changePasswordController,
  deleteUserController,
  updateUserNameController,
  updateProfileImage,
};
