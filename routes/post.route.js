const express = require("express");
const router = express.Router();
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  savePost,
  unsavePost,
  getSavedPosts,
} = require("../controller/post.controller.js");
const { Authenticate } = require("../middleware/VerifyJWT.js");

// Create a new post
router.post("/", Authenticate, createPost);

// Get all posts
router.get("/", Authenticate, getAllPosts);

// Get a single post by ID
router.get("/:id", Authenticate, getPostById);

// Update a post by ID
router.put("/:id", Authenticate, updatePost);
router.post("/saved", Authenticate, getSavedPosts); // Delete a post by ID

router.post("/save/:postId", Authenticate, savePost);
router.delete("/unsave/:postId", Authenticate, unsavePost);
router.delete("/:id", Authenticate, deletePost);

module.exports = router;
