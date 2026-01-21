const mongoose = require("mongoose");

const userRatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
});

module.exports = mongoose.model("UserRating", userRatingSchema);
