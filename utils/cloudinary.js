const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: "dtj0yjeni",
  api_key: "316351566772248",
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = async (localFilePath, publicId = null) => {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      public_id: publicId || path.parse(localFilePath).name,
    });

    fs.unlink(localFilePath, (err) => {
      if (err) console.error("Failed to delete local image:", err);
    });

    return result;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw error;
  }
};

module.exports = { uploadImageToCloudinary };
