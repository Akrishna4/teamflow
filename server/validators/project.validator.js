const { body } = require("express-validator");

/**
 * Helper: validates that an array contains only valid MongoDB ObjectIds.
 */
const isMongoIdArray = (field) =>
  body(field)
    .optional()
    .isArray().withMessage(`${field} must be an array.`)
    .custom((ids) => {
      const isValid = ids.every((id) => /^[a-fA-F0-9]{24}$/.test(id));
      if (!isValid) throw new Error(`One or more ${field} IDs are invalid.`);
      return true;
    });

/**
 * Rules for POST /api/projects
 */
exports.createProjectRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Project name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Project name must be between 2 and 100 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),

  isMongoIdArray("members"),
];

/**
 * Rules for PUT /api/projects/:id
 */
exports.updateProjectRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Project name must be between 2 and 100 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),

  isMongoIdArray("members"),
];
