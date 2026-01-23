require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔁 CHANGE PATH IF NEEDED
const User = require("./model/user.model"); // <-- check folder name: model or models

const BASE_URL = "http://localhost:3000"; // ✅ YOUR SERVER RUNS ON 3000

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB for OTP fetch");
}

async function getOtpFromDB(email) {
  const user = await User.findOne({ email });
  if (!user || !user.otpHash) {
    throw new Error("❌ No OTP found in DB");
  }

  console.log("🔐 OTP hash found, cracking...");

  // brute-force 6 digit OTP
  for (let i = 0; i <= 999999; i++) {
    const otp = i.toString().padStart(6, "0");
    const match = await bcrypt.compare(otp, user.otpHash);
    if (match) {
      console.log("✅ OTP cracked:", otp);
      return otp;
    }
  }

  throw new Error("❌ Failed to crack OTP");
}

async function testJWT() {
  try {
    await connectDB();

    console.log("==== STEP 1: LOGIN ====");
    const loginResp = await axios.post(`${BASE_URL}/api/login`, {
      email: "queen@gmail.com",
      password: "Queen@13",
    });

    console.log("✅ Login Response:", loginResp.data);

    console.log("==== STEP 2: GET OTP FROM DB ====");
    const otp = await getOtpFromDB("queen@gmail.com");

    console.log("==== STEP 3: VERIFY OTP ====");
    const otpResp = await axios.post(`${BASE_URL}/api/verify-otp`, {
      email: "queen@gmail.com",
      otp: otp,
    });

    console.log("✅ OTP Verify Response:", otpResp.data);

    const accessToken = otpResp.data.accessToken;
    console.log("🔑 Access Token:", accessToken);

    console.log("==== STEP 4: CALL PROTECTED ROUTE (CHANGE PASSWORD) ====");
    const protectedResp = await axios.put(
      `${BASE_URL}/api/change-password`,
      {
        email: "queen@gmail.com",
        new_password: "Queenie@13",
        confirm_password: "Queenie@13",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log("✅ Protected Route Response:", protectedResp.data);

    console.log("🎉 ALL TESTS PASSED");
    process.exit(0);
  } catch (err) {
    if (err.response) {
      console.log("❌ Error Status:", err.response.status);
      console.log("❌ Error Data:", err.response.data);
    } else {
      console.log("❌ Error:", err.message || err);
    }
    process.exit(1);
  }
}

testJWT();
