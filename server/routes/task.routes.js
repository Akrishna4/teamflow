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
} = require("../controllers/task.controller");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

router.use(protect); // All task routes require authentication

router.get("/my-tasks", getMyTasks);
router.get("/project/:projectId", getProjectTasks);

router
  .route("/")
  .get(getAllTasks)
  .post(authorize("Admin"), createTask);

router
  .route("/:id")
  .get(getTask)
  .put(authorize("Admin"), updateTask)
  .delete(authorize("Admin"), deleteTask);

router.put("/:id/status", authorize("Admin"), updateTaskStatus);

module.exports = router;
