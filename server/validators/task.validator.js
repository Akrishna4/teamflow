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
 * Rules for POST /api/tasks
 */
exports.createTaskRules = [
  body("title")
    .trim()
    .notEmpty().withMessage("Task title is required.")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters."),

  body("project")
    .notEmpty().withMessage("A project is required.")
    .isMongoId().withMessage("Invalid project ID."),

  isMongoIdArray("assignedTo"),

  body("status")
    .optional()
    .isIn(["To Do", "In Progress", "Done"])
    .withMessage("Status must be one of: To Do, In Progress, Done."),

  body("priority")
    .optional()
    .isIn(["Low", "Medium", "High"])
    .withMessage("Priority must be one of: Low, Medium, High."),

  body("dueDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage("Due date must be a valid ISO 8601 date.")
    .toDate(),
];

/**
 * Rules for PUT /api/tasks/:id
 */
exports.updateTaskRules = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters."),

  body("project")
    .optional()
    .isMongoId().withMessage("Invalid project ID."),

  isMongoIdArray("assignedTo"),

  body("status")
    .optional()
    .isIn(["To Do", "In Progress", "Done"])
    .withMessage("Status must be one of: To Do, In Progress, Done."),

  body("priority")
    .optional()
    .isIn(["Low", "Medium", "High"])
    .withMessage("Priority must be one of: Low, Medium, High."),

  body("dueDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage("Due date must be a valid ISO 8601 date.")
    .toDate(),
];
