const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../model/user.model");
const { encryptPassword } = require("../utils/bcrypt");
const app = require("../index");

let token;
let userId;
let uniqueEmail;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/skinmuse_test"
  );
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({}); // Clean users before each test
  uniqueEmail = `testuser_${Date.now()}@example.com`; // Always unique email
  const hashedPass = await encryptPassword("testpass123");
  const user = await User.create({
    email: uniqueEmail,
    password: hashedPass,
  });
  userId = user._id;
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret");
});

describe("User Controller Tests", () => {
  it("should fail to signup when any required field is missing", async () => {
    const res = await request(app).post("/api/signup").send({
      email: "",
      password: "pass",
      confirm_password: "pass",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("All fields are required");
  });

  it("should fail to signup when passwords don't match", async () => {
    const res = await request(app)
      .post("/api/signup")
      .send({
        email: `newuser_${Date.now()}@example.com`,
        password: "pass1",
        confirm_password: "pass2",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Passwords don't match");
  });

  it("should signup successfully with valid details", async () => {
    const res = await request(app)
      .post("/api/signup")
      .send({
        email: `newuser_${Date.now()}@example.com`,
        password: "password123",
        confirm_password: "password123",
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User Created Successfully");
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should fail login with invalid credentials", async () => {
    const res = await request(app).post("/api/login").send({
      email: uniqueEmail,
      password: "wrongpassword",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("should login successfully with correct email and password", async () => {
    const res = await request(app).post("/api/login").send({
      email: uniqueEmail,
      password: "testpass123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Login Successful");
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should fail to change password when new passwords don't match", async () => {
    const res = await request(app).put("/api/change-password").send({
      email: uniqueEmail,
      new_password: "newpass123",
      confirm_password: "differentpass",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("New passwords don't match");
  });

  it("should fail to change password if user does not exist", async () => {
    const res = await request(app).put("/api/change-password").send({
      email: "nonexistent@example.com",
      new_password: "newpass123",
      confirm_password: "newpass123",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User not found");
  });

  it("should change password successfully", async () => {
    const res = await request(app).put("/api/change-password").send({
      email: uniqueEmail,
      new_password: "newpassword123",
      confirm_password: "newpassword123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Password changed successfully");
  });

  it("should fail to update username without authorization", async () => {
    const res = await request(app)
      .put("/api/update-details")
      .send({ name: "NewName" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should update username successfully", async () => {
    const res = await request(app)
      .put("/api/update-details")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ri" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User name updated successfully");
    expect(res.body.user.name).toBe("Ri");
  });

 
  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/api/unknownroute");
    expect(res.statusCode).toBe(404);
  });

  it("should not allow duplicate email during signup", async () => {
    const res = await request(app).post("/api/signup").send({
      email: uniqueEmail,
      password: "password123",
      confirm_password: "password123",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email is Taken");
  });

  it("should fail to update username with empty name", async () => {
    const res = await request(app)
      .put("/api/update-details")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Name is required");
  });

  it("should fail to update profile image without file upload", async () => {
    const res = await request(app)
      .put("/api/update-profile-image")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No file uploaded");
  });

  it("should fail to update profile image without auth token", async () => {
    const res = await request(app)
      .put("/api/update-profile-image")
      .attach("pfp", Buffer.from("fake-image"), "test.png");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should delete user successfully", async () => {
    const res = await request(app)
      .delete("/api/delete-user")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User deleted successfully");
  });

  it("should fail to delete user without authorization", async () => {
    const res = await request(app).delete("/api/delete-user");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should return 401 for invalid token when updating username", async () => {
    const res = await request(app)
      .put("/api/update-details")
      .set("Authorization", "Bearer invalid.token")
      .send({ name: "InvalidToken" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should not update username for non-existent user", async () => {
    const invalidToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET || "secret"
    );
    const res = await request(app)
      .put("/api/update-details")
      .set("Authorization", `Bearer ${invalidToken}`)
      .send({ name: "GhostUser" });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should fail to change password when fields are empty", async () => {
    const res = await request(app).put("/api/change-password").send({
      email: "",
      new_password: "",
      confirm_password: "",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("All fields are required");
  });


  
});
