const express = require("express");
const connectDB = require("./config/server");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const https = require("https"); // Added for HTTPS
const fs = require("fs"); // Added to read SSL files

// Load env
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const app = express();

// Connect DB
connectDB();

// ================== SECURITY MIDDLEWARE ==================

// Helmet for security headers
app.use(helmet());

// Content Security Policy (XSS protection)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [], // Automatically upgrades HTTP to HTTPS
    },
  }),
);

// HSTS (forces HTTPS in production)
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }),
);

// Referrer policy
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));

// ================== CORS ==================
app.use(
  cors({
    origin: "http://localhost:5173", // In production, this would be https://
    credentials: true,
  }),
);

// ================== RATE LIMIT (LOGIN ONLY) ==================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/login", loginLimiter);

// ================== BODY PARSERS ==================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ================== NoSQL INJECTION PROTECTION (CUSTOM) ==================
const sanitize = (obj) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith("$") || key.includes(".")) {
        console.log(`[SECURITY] Deleting malicious key: ${key}`);
        delete obj[key];
      } else if (obj[key] instanceof Object) {
        sanitize(obj[key]);
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// ================== OTHER MIDDLEWARE ==================
app.use(express.static("uploads"));
app.use(cookieParser());

// ================== ROUTES ==================
const userRouter = require("./routes/user.route.js");
const postRouter = require("./routes/post.route.js");
const commentRouter = require("./routes/comment.route.js");
const userRatingRoutes = require("./routes/userRating.route.js");

app.use("/api", userRouter);
app.use("/api/post", postRouter);
app.use("/api/comments", commentRouter);
app.use("/api/user", userRatingRoutes);

// ================== EXPORT FOR TESTING ==================
module.exports = app;

// ================== START SECURE SERVER ==================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  try {
    // These files are generated via OpenSSL as part of the CSR process
    const sslOptions = {
      key: fs.readFileSync("./config/cert/server.key"),
      cert: fs.readFileSync("./config/cert/server.crt"),
    };

    // Create HTTPS server instead of standard app.listen
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(
        `[SECURE] MakeupMuse Server running on https://localhost:${PORT}`,
      );
    });
  } catch (err) {
    console.error(
      "SSL Certificate error: Secure server could not start.",
      err.message,
    );
    // Fallback for local dev if certs are missing
    app.listen(PORT, () => {
      console.log(`[WARNING] Running on HTTP port ${PORT} (SSL files missing)`);
    });
  }
}
