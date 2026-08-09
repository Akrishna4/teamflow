const express = require("express");
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");
const { protect, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createProjectRules,
  updateProjectRules,
} = require("../validators/project.validator");

const router = express.Router();

// All project routes require authentication
router.use(protect);

router
  .route("/")
  .get(getAllProjects)
  .post(authorize("Admin"), createProjectRules, validate, createProject);

router
  .route("/:id")
  .get(getProject)
  .put(authorize("Admin"), updateProjectRules, validate, updateProject)
  .delete(authorize("Admin"), deleteProject);

module.exports = router;
