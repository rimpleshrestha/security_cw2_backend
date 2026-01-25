const express = require("express");
const connectDB = require("./config/server");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const https = require("https");
const fs = require("fs");

dotenv.config();
const app = express();
connectDB();

// ================== SECURITY MIDDLEWARE ==================
app.use(helmet());

// Content Security Policy
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

// ================== CORS (Vite Frontend) ==================
app.use(
  cors({
    origin: ["http://localhost:5173", "https://localhost:5173","*"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ================== ROUTES (ALIGNED WITH CONTROLLER) ==================

// 1. User Routes (Login, Register, Profile)
app.use("/api", require("./routes/user.route.js"));

// 2. Post Routes (The Product Page calls /api/post)
app.use("/api/post", require("./routes/post.route.js"));

// 3. Comment Routes
app.use("/api/comments", require("./routes/comment.route.js"));

// ================== START SERVER (HTTP MODE) ==================
const PORT = process.env.PORT || 3000;

// Setting useSSL to false to fix the SSL_PROTOCOL_ERROR
const useSSL = false;

if (useSSL) {
  try {
    const sslOptions = {
      key: fs.readFileSync("./config/cert/server.key"),
      cert: fs.readFileSync("./config/cert/server.crt"),
    };
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`[SECURE] https://localhost:${PORT}`);
    });
  } catch (err) {
    app.listen(PORT, () => console.log(`[FALLBACK] http://localhost:${PORT}`));
  }
} else {
  app.listen(PORT, () => {
    console.log(`[SERVER] Running at http://localhost:${PORT}`);
    console.log(
      `[INFO] Post routes active at http://localhost:${PORT}/api/post`,
    );
  });
}
