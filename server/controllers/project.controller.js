const ProjectService = require("../services/project/project.service");
const ProjectSocket = require("../services/project/project.socket");
const CascadeService = require("../services/cascade/cascade.service");
const ActivityService = require("../services/activity/activity.service");
const EVENTS = require("../constants/socketEvents");

/**
 * GET /api/projects
 */
exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = await ProjectService.getAll();
    res.status(200).json({ projects });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 */
exports.getProject = async (req, res, next) => {
  try {
    const project = await ProjectService.getById(req.params.id);
    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects  [Admin only]
 */
exports.createProject = async (req, res, next) => {
  try {
    const project = await ProjectService.create(req.body, req.user._id);

    ProjectSocket.emitCreated(req.io, project);
    ActivityService.log({
      action: EVENTS.PROJECT_CREATED,
      entityModel: "Project",
      entityId: project._id,
      user: req.user._id,
      metadata: { name: project.name },
    });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id  [Admin only]
 */
exports.updateProject = async (req, res, next) => {
  try {
    const project = await ProjectService.update(req.params.id, req.body);

    ProjectSocket.emitUpdated(req.io, project);
    ActivityService.log({
      action: EVENTS.PROJECT_UPDATED,
      entityModel: "Project",
      entityId: project._id,
      user: req.user._id,
      metadata: { updates: Object.keys(req.body) },
    });

    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id  [Admin only]
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await CascadeService.deleteProjectCascade(req.params.id);

    ProjectSocket.emitDeleted(req.io, req.params.id);
    ActivityService.log({
      action: EVENTS.PROJECT_DELETED,
      entityModel: "Project",
      entityId: req.params.id, // ID is preserved in log even after deletion
      user: req.user._id,
      metadata: { name: project.name },
    });

    res.status(200).json({
      message: "Project and all associated tasks deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
