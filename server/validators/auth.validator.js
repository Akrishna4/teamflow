const { body } = require("express-validator");

/**
 * Rules for POST /api/auth/register
 * Note: the 'role' field is intentionally NOT accepted here.
 * All registrations default to "Member" in the controller.
 * Role elevation must be done by an Admin through a dedicated endpoint.
 */
exports.registerRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
];

/**
 * Rules for POST /api/auth/login
 */
exports.loginRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),
];
