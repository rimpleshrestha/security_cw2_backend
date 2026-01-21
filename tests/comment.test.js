const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../model/user.model");
const Post = require("../model/post.model");
const Comment = require("../model/comment.model");
const { encryptPassword } = require("../utils/bcrypt");
const app = require("../index");

let token;
let userId;
let postId;
let commentId;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/skinmuse_test"
  );
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});

  const hashedPass = await encryptPassword("testpass123");
  const user = await User.create({
    email: "testuser@example.com",
    password: hashedPass,
  });
  userId = user._id;
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret");

  // Create a post to comment on
  const post = await Post.create({
    title: "Test Post",
    description: "Test description",
    image: "test-image.jpg",
    skin_type: "oily",
    user: userId,
  });
  postId = post._id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await mongoose.connection.close();
});

describe("Comment Controller Tests", () => {
  it("should create a comment for a post", async () => {
    const res = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "This is a test comment" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.comment).toBe("This is a test comment");
    commentId = res.body._id;
  });

  it("should get all comments for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/comments")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should get a comment by ID", async () => {
    const res = await request(app)
      .get(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id", commentId);
  });

  it("should update a comment by ID", async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "Updated comment" });
    expect(res.statusCode).toBe(200);
    expect(res.body.comment).toBe("Updated comment");
  });

  it("should delete a comment by ID", async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Comment deleted successfully");
  });

  it("should fail to create comment without authorization", async () => {
    const res = await request(app)
      .post(`/api/comments/${postId}`)
      .send({ comment: "Unauthorized comment" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should fail to create comment with empty body", async () => {
    const res = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(500); // because validation fails internally
    expect(res.body.message).toBe("Server error while creating comment");
  });

  it("should return 404 for getting non-existent comment", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/comments/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found");
  });

  it("should return 404 for updating non-existent comment", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/comments/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "No comment here" });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found or not owned by user");
  });

  it("should return 404 for deleting non-existent comment", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/comments/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found or not owned by user");
  });

  it("should get comments by postId successfully", async () => {
    // First create comment
    const created = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "Post specific comment" });
    expect(created.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/comments/post/${postId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should fail to get comments by postId without authorization", async () => {
    const res = await request(app).get(`/api/comments/post/${postId}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should prevent updating comment owned by another user", async () => {
    // Create comment with existing user
    const created = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "Owned by original user" });
    const commentId = created.body._id;

    // create second user
    const otherUser = await User.create({
      email: `otheruser_${Date.now()}@example.com`,
      password: await encryptPassword("pass123"),
    });
    const otherToken = jwt.sign(
      { id: otherUser._id },
      process.env.JWT_SECRET || "secret"
    );

    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ comment: "Attempt unauthorized update" });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found or not owned by user");
  });

  it("should prevent deleting comment owned by another user", async () => {
    // Create comment with original user
    const created = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comment: "Delete by wrong user" });
    const commentId = created.body._id;

    // create another user
    const anotherUser = await User.create({
      email: `anotheruser_${Date.now()}@example.com`,
      password: await encryptPassword("pass123"),
    });
    const anotherToken = jwt.sign(
      { id: anotherUser._id },
      process.env.JWT_SECRET || "secret"
    );

    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${anotherToken}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found or not owned by user");
  });

  it("should return empty array if no comments exist for user", async () => {
    // new user with no comments
    const newUser = await User.create({
      email: `nocomments_${Date.now()}@example.com`,
      password: await encryptPassword("pass123"),
    });
    const newToken = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET || "secret"
    );

    const res = await request(app)
      .get("/api/comments")
      .set("Authorization", `Bearer ${newToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

});
