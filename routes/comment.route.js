// routes/commentRoutes.js
const {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  getCommentsByPost, // <- this must be imported
} = require("../controller/comment.controller.js");
const { Authenticate } = require("../middleware/VerifyJWT.js");

const express = require("express");
const router = express.Router();

// Create comment for a post
router.post("/:postId", Authenticate, createComment);

// Get all comments for authenticated user
router.get("/", Authenticate, getAllComments);

// Get a single comment by ID
router.get("/:id", Authenticate, getCommentById);

// Update a comment by ID
router.put("/:id", Authenticate, updateComment);

// Delete a comment by ID
router.delete("/:id", Authenticate, deleteComment);

// Get all comments for a specific post by postId
router.get("/post/:postId", Authenticate, getCommentsByPost); // <- this is critical

module.exports = router;
