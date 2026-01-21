const express = require("express");
const router = express.Router();
const { Authenticate } = require("../middleware/VerifyJWT");
const {
  saveRating,
  getRating,
} = require("../controller/userRating.controller"); // <-- fixed path

router.post("/rating", Authenticate, saveRating);
router.get("/rating", Authenticate, getRating);

module.exports = router;
