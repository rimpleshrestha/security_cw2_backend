const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Post = require("../model/post.model");
const User = require("../model/user.model");
const { encryptPassword } = require("../utils/bcrypt");
const app = require("../index");

let token;
let userId;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/skinmuse_test"
  );
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});

  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const hashedPass = await encryptPassword("testpass123");
  const user = await User.create({
    email: uniqueEmail,
    password: hashedPass,
  });
  userId = user._id;
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret");
});

describe("Post Controller Tests", () => {
  it("should create a post successfully", async () => {
    const res = await request(app)
      .post("/api/post")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Post",
        description: "Test post description",
        image: "http://example.com/image.jpg",
        skin_type: "Oily",
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Post created successfully");
    expect(res.body.post.title).toBe("Test Post");
  });

  it("should fail to create a post without title", async () => {
    const res = await request(app)
      .post("/api/post")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "",
        description: "No title post",
        image: "http://example.com/image.jpg",
        skin_type: "Oily",
      });
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server error while creating post");
  });

  // ** FIXED: added auth header **
  it("should fetch all posts", async () => {
    const res = await request(app)
      .get("/api/post")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Posts fetched successfully");
    expect(Array.isArray(res.body.posts)).toBe(true);
  });

  // ** FIXED: added auth header **
  it("should get a post by ID", async () => {
    const post = await Post.create({
      title: "Single Post",
      description: "Single post desc",
      image: "http://example.com/image2.jpg",
      skin_type: "Dry",
      user: userId,
    });

    const res = await request(app)
      .get(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Post fetched successfully");
    expect(res.body.post.title).toBe("Single Post");
  });

  // ** FIXED: added auth header **
  it("should return 404 when post ID does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/post/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("should update a post successfully", async () => {
    const post = await Post.create({
      title: "Update Me",
      description: "Update desc",
      image: "http://example.com/image3.jpg",
      skin_type: "Normal",
      user: userId,
    });

    const res = await request(app)
      .put(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Title",
        description: "Updated description",
        image: "http://example.com/image-updated.jpg",
        skin_type: "Combination",
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Post updated successfully");
    expect(res.body.post.title).toBe("Updated Title");
  });

  it("should return 404 when updating a post not owned by user", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const post = await Post.create({
      title: "Other User Post",
      description: "Other user desc",
      image: "http://example.com/image4.jpg",
      skin_type: "Dry",
      user: otherUserId,
    });

    const res = await request(app)
      .put(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Illegal Update",
        description: "Trying to update other user's post",
        image: "http://example.com/image-illegal.jpg",
        skin_type: "Oily",
      });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Post not found or not owned by user");
  });

  it("should delete a post successfully", async () => {
    const post = await Post.create({
      title: "Delete Me",
      description: "Delete desc",
      image: "http://example.com/image5.jpg",
      skin_type: "Normal",
      user: userId,
    });

    const res = await request(app)
      .delete(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Post deleted successfully");
  });

  it("should return 404 when deleting post not owned by user", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const post = await Post.create({
      title: "Other User Delete",
      description: "Other user desc",
      image: "http://example.com/image6.jpg",
      skin_type: "Dry",
      user: otherUserId,
    });

    const res = await request(app)
      .delete(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Post not found or not owned by user");
  });

  it("should return 401 when no auth token is provided on create", async () => {
    const res = await request(app).post("/api/post").send({
      title: "No Auth",
      description: "No auth desc",
      image: "http://example.com/image7.jpg",
      skin_type: "Oily",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should fail to create a post without required fields", async () => {
    const res = await request(app)
      .post("/api/post")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Incomplete Post",
        // missing description, image, skin_type
      });
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server error while creating post");
  });

  it("should fetch posts filtered by skin_type query", async () => {
    await Post.create([
      {
        title: "Oily Skin Post",
        description: "Description 1",
        image: "image1.jpg",
        skin_type: "Oily",
        user: userId,
      },
      {
        title: "Dry Skin Post",
        description: "Description 2",
        image: "image2.jpg",
        skin_type: "Dry",
        user: userId,
      },
    ]);

    const res = await request(app)
      .get("/api/post")
      .query({ type: "Oily" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(
      res.body.posts.every((post) =>
        post.skin_type.toLowerCase().includes("oily")
      )
    ).toBe(true);
  });

  it("should save a post for the authenticated user", async () => {
    const post = await Post.create({
      title: "Save this post",
      description: "Desc",
      image: "image.jpg",
      skin_type: "Normal",
      user: userId,
    });

    const res = await request(app)
      .post(`/api/post/save/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Post saved successfully");
    expect(res.body.savedPosts).toContainEqual(post._id.toString());
  });

  it("should not save a non-existent post", async () => {
    const fakePostId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/post/save/${fakePostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("should unsave a saved post successfully", async () => {
    const post = await Post.create({
      title: "Unsave this post",
      description: "Desc",
      image: "image.jpg",
      skin_type: "Normal",
      user: userId,
    });

    // Save post first
    await request(app)
      .post(`/api/post/save/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    // Now unsave it
    const res = await request(app)
      .delete(`/api/post/unsave/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Post unsaved successfully");
    expect(res.body.savedPosts).not.toContainEqual(post._id.toString());
  });
});
