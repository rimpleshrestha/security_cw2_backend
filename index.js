const express = require("express");
const connectDB = require("./config/server");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Load .env.test if NODE_ENV is test, else load .env
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const app = express();

// Connect to MongoDB
connectDB();

// ------------------ SECURITY MIDDLEWARE ------------------

// Enable Helmet for general security headers
app.use(helmet());

// Add Content Security Policy (CSP) to prevent XSS
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }),
);

// Force HTTPS with HSTS (if using HTTPS)
app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  }),
);

// Referrer policy for privacy
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));

// ------------------ CORS CONFIG ------------------
// Allow frontend to access backend
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true, // allow cookies to be sent
  }),
);

// ------------------ LOGIN RATE LIMIT ------------------
// Limit login attempts to 5 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per window
  handler: (req, res) => {
    res.status(429).json({
      message:
        "Too many login attempts from this IP. Please try again after 15 minutes.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter only to login route
app.use("/api/login", loginLimiter);

// ---------------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("uploads")); // Serve static files from uploads directory
app.use(cookieParser());

// ------------------ ROUTES ------------------
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
