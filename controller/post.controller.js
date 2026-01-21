const Post = require("../model/post.model.js");
const User = require("../model/user.model.js");

async function createPost(req, res) {
  try {
    const { title, description, image, skin_type } = req.body;
    const userId = req.user;
    const newPost = new Post({
      title,
      description,
      image,
      user: userId,
      skin_type,
    });
    const saved = await newPost.save();
    return res.status(201).json({
      message: "Post created successfully",
      post: saved,
    });
  } catch (err) {
    console.error("Error creating post:", err);
    return res
      .status(500)
      .json({ message: "Server error while creating post" });
  }
}

async function getAllPosts(req, res) {
  try {
    const userId = req.user;
    console.log("User ID from token:", userId);

    const user = await User.findById(userId).select("savedPosts");
    const savedSet = new Set(user?.savedPosts.map((id) => id.toString()));

    const { type } = req.query;
    const query = type ? { skin_type: { $regex: type, $options: "i" } } : {};

    const posts = await Post.find(query).lean(); // lean returns plain objects
    const postsWithFlag = posts.map((post) => ({
      ...post,
      isSaved: savedSet.has(post._id.toString()),
    }));

    return res.json({
      message: "Posts fetched successfully",
      posts: postsWithFlag,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching posts" });
  }
}

async function getPostById(req, res) {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.json({
      message: "Post fetched successfully",
      post,
    });
  } catch (err) {
    console.error("Error fetching post:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching post" });
  }
}
async function getSavedPosts(req, res) {
  try {
    const userId = req.user;
    console.log("Fetching saved posts for user:");
    const user = await User.findById(userId)
      .populate("savedPosts") // This gives full post data
      .exec();

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      message: "Saved posts fetched",
      savedPosts: user.savedPosts,
    });
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching saved posts" });
  }
}

async function savePost(req, res) {
  try {
    const userId = req.user; // Assuming middleware sets req.user
    const postId = req.params.postId;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Avoid saving duplicates
    if (user.savedPosts.includes(postId)) {
      return res.status(400).json({ message: "Post already saved" });
    }

    user.savedPosts.push(postId);
    await user.save();

    return res.json({
      message: "Post saved successfully",
      savedPosts: user.savedPosts,
    });
  } catch (err) {
    console.error("Error saving post:", err);
    return res.status(500).json({ message: "Server error while saving post" });
  }
}
async function unsavePost(req, res) {
  try {
    const userId = req.user;
    const postId = req.params.postId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Filter out the postId
    user.savedPosts = user.savedPosts.filter(
      (savedId) => savedId.toString() !== postId
    );
    await user.save();

    return res.json({
      message: "Post unsaved successfully",
      savedPosts: user.savedPosts,
    });
  } catch (err) {
    console.error("Error unsaving post:", err);
    return res
      .status(500)
      .json({ message: "Server error while unsaving post" });
  }
}

async function updatePost(req, res) {
  try {
    const userId = req.user;
    const { title, description, image, skin_type } = req.body;
    const updated = await Post.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { title, description, image, skin_type },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res
        .status(404)
        .json({ message: "Post not found or not owned by user" });
    }
    return res.json({
      message: "Post updated successfully",
      post: updated,
    });
  } catch (err) {
    console.error("Error updating post:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating post" });
  }
}

async function deletePost(req, res) {
  try {
    const userId = req.user;
    const deleted = await Post.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Post not found or not owned by user" });
    }
    return res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    return res
      .status(500)
      .json({ message: "Server error while deleting post" });
  }
}

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  savePost,
  unsavePost,
  getSavedPosts,
};
