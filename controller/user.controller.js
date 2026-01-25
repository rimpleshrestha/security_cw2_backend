const User = require("../model/user.model.js");
const bcrypt = require("bcryptjs");
const axios = require("axios"); // ✅ for reCAPTCHA verification
const qs = require("qs"); // ✅ for proper form-urlencoded CAPTCHA POST
const { comparePassword, encryptPassword } = require("../utils/bcrypt.js");
const { uploadImageToCloudinary } = require("../utils/cloudinary.js");
const {
  generateJWTToken,
  generateRefreshToken,
  cookiesOptions,
} = require("../utils/jwt.js");
const logActivity = require("../utils/activityLogger.js");
const logSecurityEvent = require("../utils/securityLogger.js");
const { generateOTP, hashOTP } = require("../utils/otp.js");
const sendEmail = require("../utils/sendEmail.js");

// Password regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// -------------------- SIGNUP --------------------
const signupController = async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;

    if ([email, password, confirm_password].some((f) => f.trim() === "")) {
      logSecurityEvent("SIGNUP_FAILED", "Empty fields during signup", {
        ip: req.ip,
      });
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirm_password)
      return res.status(400).json({ message: "Passwords don't match" });

    if (!passwordRegex.test(password))
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include uppercase, lowercase and number",
      });

    const userExists = await User.findOne({ email });
    if (userExists) {
      logSecurityEvent("SIGNUP_FAILED", "Email already exists", {
        email,
        ip: req.ip,
      });
      return res.status(400).json({ message: "Email is Taken" });
    }

    const encryptedPassword = await encryptPassword(password);

    const user = await User.create({
      email,
      password: encryptedPassword,
    });

    await logActivity(user._id, "Signup success");

    logSecurityEvent("SIGNUP_SUCCESS", "User registered successfully", {
      userId: user._id,
      email,
      ip: req.ip,
    });

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

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

// -------------------- LOGIN (MFA STEP 1) with CAPTCHA FIX --------------------
const loginController = async (req, res) => {
  try {
    const { email, password, captchaValue } = req.body;

    if ([email, password].some((f) => !f || f.trim() === "")) {
      logSecurityEvent("LOGIN_FAILED", "Empty login fields", { ip: req.ip });
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1. VALIDATE USER CREDENTIALS FIRST
    const user = await User.findOne({ email });
    if (!user) {
      logSecurityEvent("LOGIN_FAILED", "Invalid email", { email, ip: req.ip });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logSecurityEvent("LOGIN_FAILED", "Incorrect password", {
        userId: user._id,
        ip: req.ip,
      });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2. CAPTCHA VERIFICATION LOGIC
    const isResendRequest = user.otpHash && user.otpExpiresAt > new Date();

    // Only verify ReCAPTCHA if it is a fresh login (not a resend)
    if (!isResendRequest) {
      if (!captchaValue) {
        return res.status(400).json({ message: "Captcha is required" });
      }

      const secretKey = process.env.RECAPTCHA_SECRET_KEY;

      const captchaResponse = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        qs.stringify({
          secret: secretKey,
          response: captchaValue,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!captchaResponse.data.success) {
        logSecurityEvent("LOGIN_FAILED", "Invalid captcha", {
          email,
          ip: req.ip,
          errorCodes: captchaResponse.data["error-codes"],
        });
        return res.status(400).json({ message: "Captcha validation failed" });
      }
    }

    // 3. GENERATE OTP (Runs for both initial login and resends)
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    user.otpHash = otpHash;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
    user.isOtpVerified = false;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your Login Verification Code",
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    });

    const logMsg = isResendRequest
      ? "OTP resent for login"
      : "OTP sent for login";
    await logActivity(user._id, logMsg);

    logSecurityEvent(isResendRequest ? "OTP_RESENT" : "OTP_SENT", logMsg, {
      userId: user._id,
      ip: req.ip,
    });

    return res.status(200).json({
      message: "OTP sent to registered email. Verify to continue.",
      mfaRequired: true,
    });
  } catch (error) {
    console.log("error during login", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Login" });
  }
};

// -------------------- VERIFY OTP (MFA STEP 2) --------------------
const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user || !user.otpHash) {
      logSecurityEvent("OTP_FAILED", "OTP verification failed", {
        email,
        ip: req.ip,
      });
      return res.status(400).json({ message: "OTP verification failed" });
    }

    if (user.otpExpiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const isOtpValid = await bcrypt.compare(otp, user.otpHash);
    if (!isOtpValid) {
      logSecurityEvent("OTP_FAILED", "Invalid OTP entered", {
        userId: user._id,
        ip: req.ip,
      });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isOtpVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const accessToken = generateJWTToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    await logActivity(user._id, "OTP verified, login completed");

    logSecurityEvent("LOGIN_SUCCESS", "User logged in with MFA", {
      userId: user._id,
      ip: req.ip,
    });

    return res
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .cookie("accessToken", accessToken, cookiesOptions)
      .status(200)
      .json({
        message: "Login successful",
        accessToken,
        userRole: user.role,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
      });
  } catch (error) {
    console.log("error during OTP verification", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During OTP Verification" });
  }
};

// -------------------- OTHER CONTROLLERS --------------------
const logoutController = async (req, res) => {
  try {
    await logActivity(req.user, "Logout");

    logSecurityEvent("LOGOUT", "User logged out", {
      userId: req.user,
      ip: req.ip,
    });

    return res
      .clearCookie("refreshToken")
      .clearCookie("accessToken")
      .status(200)
      .json({ message: "Logout successful" });
  } catch (error) {
    console.log("error during logout", error);
    res.status(500).json({ message: "Internal Server Error During Logout" });
  }
};

const changePasswordController = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    if ([email, new_password, confirm_password].some((f) => f.trim() === ""))
      return res.status(400).json({ message: "All fields are required" });

    if (new_password !== confirm_password)
      return res.status(400).json({ message: "New passwords don't match" });

    if (!passwordRegex.test(new_password))
      return res.status(400).json({ message: "Weak password" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = await encryptPassword(new_password);
    await user.save();

    await logActivity(user._id, "Password change");

    logSecurityEvent("PASSWORD_CHANGE", "User changed password", {
      userId: user._id,
      ip: req.ip,
    });

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("error during password change", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During Password Change" });
  }
};

const deleteUserController = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ _id: req.user });
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    await logActivity(req.user, "User deleted");

    logSecurityEvent("ACCOUNT_DELETED", "User account deleted", {
      userId: req.user,
      ip: req.ip,
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("error during user deletion", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error During User Deletion" });
  }
};

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

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    console.log(req.file)
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

module.exports = {
  signupController,
  loginController,
  verifyOtpController,
  logoutController,
  changePasswordController,
  deleteUserController,
  updateUserNameController,
  updateProfileImage,
};
