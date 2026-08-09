const { validationResult } = require("express-validator");

/**
 * Reads express-validator's validation results from req.
 * If any failures exist, responds with 422 Unprocessable Entity
 * and a structured array of field-level errors.
 * Otherwise calls next() to continue the handler chain.
 *
 * Usage: place this after your validator rule arrays in the route:
 *   router.post("/", [...rules], validate, controller)
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};
