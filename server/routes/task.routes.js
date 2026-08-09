const express = require("express");
const {
  getAllTasks,
  getTask,
  getProjectTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getMyTasks,
  getMyDashboard,
  duplicateTask,
} = require("../controllers/task.controller");
const { protect, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createTaskRules,
  updateTaskRules,
} = require("../validators/task.validator");

const router = express.Router({ mergeParams: true });

// All task routes require authentication
router.use(protect);

// Specific paths before parameterized routes
router.get("/my/dashboard", getMyDashboard);
router.get("/my-tasks", getMyTasks);
router.get("/project/:projectId", getProjectTasks);

router
  .route("/")
  .get(getAllTasks)
  .post(authorize("Admin"), createTaskRules, validate, createTask);

router
  .route("/:id")
  .get(getTask)
  .put(authorize("Admin"), updateTaskRules, validate, updateTask)
  .delete(authorize("Admin"), deleteTask);

router.post("/:id/duplicate", authorize("Admin"), duplicateTask);

router.put("/:id/status", updateTaskStatus);

module.exports = router;
