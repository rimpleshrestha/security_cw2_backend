const express = require("express");
const connectDB = require("./config/server");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Load .env.test if NODE_ENV is test, else load .env
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("uploads")); // Serve static files from uploads directory

app.use(cookieParser());

const userRouter = require("./routes/user.route.js");
const postRouter = require("./routes/post.route.js");
const commentRouter = require("./routes/comment.route.js");
const userRatingRoutes = require("./routes/userRating.route.js");


app.use("/api", userRouter);
app.use("/api/post", postRouter);
app.use("/api/comments", commentRouter);
app.use("/api/user", userRatingRoutes);


// Export app for testing
module.exports = app;

// Start server only if file is run directly
if (require.main === module) {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
  });
}
