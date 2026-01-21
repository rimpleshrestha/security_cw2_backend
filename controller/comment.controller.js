const Comment = require("../model/comment.model.js");

async function createComment(req, res) {
  try {
    const { comment } = req.body;
    const postId = req.params.postId;
    const userId = req.user;
    const newComment = new Comment({ comment, post: postId, user: userId });
    const saved = await newComment.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating comment:", err);
    return res
      .status(500)
      .json({ message: "Server error while creating comment" });
  }
}

// Get all comments for the authenticated user
async function getAllComments(req, res) {
  try {
    const userId = req.user;
    const comments = await Comment.find({ user: userId })
      .populate("user", "name email")
      .populate("post", "title");
    return res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching comments" });
  }
}

// Get a single comment by ID
async function getCommentById(req, res) {
  try {
    const userId = req.user;
    const comment = await Comment.findOne({ _id: req.params.id, user: userId })
      .populate("user", "name email")
      .populate("post", "title");
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    return res.json(comment);
  } catch (err) {
    console.error("Error fetching comment:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching comment" });
  }
}

// Update a comment by ID
async function updateComment(req, res) {
  try {
    const userId = req.user;
    const { comment } = req.body;
    const updated = await Comment.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { comment },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res
        .status(404)
        .json({ message: "Comment not found or not owned by user" });
    }
    return res.json(updated);
  } catch (err) {
    console.error("Error updating comment:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating comment" });
  }
}

// Delete a comment by ID
async function deleteComment(req, res) {
  try {
    const userId = req.user;
    const deleted = await Comment.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Comment not found or not owned by user" });
    }
    return res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return res
      .status(500)
      .json({ message: "Server error while deleting comment" });
  }
}

// New function to get comments by post ID
async function getCommentsByPost(req, res) {
  try {
    const postId = req.params.postId;
    // Populate with 'name' to get the user’s actual name
    const comments = await Comment.find({ post: postId }).populate(
      "user",
      "name"
    );
    return res.json(comments);
  } catch (err) {
    console.error("Error fetching comments by post:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching comments" });
  }
}

module.exports = {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  getCommentsByPost,
};
