const express = require("express");
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // All project routes require authentication

router
  .route("/")
  .get(getAllProjects)
  .post(authorize("Admin"), createProject); // Only Admin can create projects

router
  .route("/:id")
  .get(getProject)
  .put(authorize("Admin"), updateProject)
  .delete(authorize("Admin"), deleteProject);

module.exports = router;
