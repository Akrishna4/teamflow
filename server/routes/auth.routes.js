const express = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { registerRules, loginRules } = require("../validators/auth.validator");

const router = express.Router();

// Rate limiting is applied at the server level for all /api/auth routes.
// Validators run before controllers and short-circuit with 422 on failure.
router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.get("/me", protect, getMe);

module.exports = router;
