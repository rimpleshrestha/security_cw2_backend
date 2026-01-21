const UserRating = require("../model/userRatingModel.js");

// Save or update rating
exports.saveRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    const userId = req.user.id;
    const updated = await UserRating.findOneAndUpdate(
      { userId },
      { rating },
      { new: true, upsert: true }
    );

    res.json({ message: "Rating saved", rating: updated.rating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user rating
exports.getRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const rating = await UserRating.findOne({ userId });
    res.json({ rating: rating ? rating.rating : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
