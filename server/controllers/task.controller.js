const TaskService = require("../services/task/task.service");
const TaskSocket = require("../services/task/task.socket");
const NotificationService = require("../services/notification/notification.service");
const NotificationSocket = require("../services/notification/notification.socket");
const CascadeService = require("../services/cascade/cascade.service");
const ActivityService = require("../services/activity/activity.service");
const EVENTS = require("../constants/socketEvents");

exports.getAllTasks = async (req, res, next) => {
  try {
    const tasks = await TaskService.getAll();
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await TaskService.getByUser(req.user._id);
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

const TaskDashboardService = require("../services/dashboard/taskDashboard.service");

exports.getMyDashboard = async (req, res, next) => {
  try {
    const dashboardData = await TaskDashboardService.getDashboard(req.user._id, req.query);
    res.status(200).json(dashboardData);
  } catch (error) {
    next(error);
  }
};

exports.getProjectTasks = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status.split(',');
    if (req.query.priority) filters.priority = req.query.priority.split(',');
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo.split(',');
    if (req.query.labels) filters.labels = req.query.labels.split(',');
    if (req.query.createdBy) filters.createdBy = req.query.createdBy.split(',');
    if (req.query.dueDate) filters.dueDate = req.query.dueDate;

    const sortOption = req.query.sort || '-createdAt';

    const tasks = await TaskService.getByProject(req.params.projectId, filters, sortOption);
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await TaskService.getById(req.params.id);
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const task = await TaskService.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Notify all assignees who are not the creator
    const otherAssignees = task.assignedTo.filter(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    for (const assignee of otherAssignees) {
      const notification = await NotificationService.create({
        user: assignee._id,
        message: `You have been assigned a new task: "${task.title}"`,
        task: task._id,
      });
      NotificationSocket.emitCreated(req.io, notification);
    }

    TaskSocket.emitCreated(req.io, task);
    ActivityService.log({
      action: EVENTS.TASK_CREATED,
      entityModel: "Task",
      entityId: task._id,
      user: req.user._id,
      metadata: { title: task.title, project: task.project._id },
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await TaskService.update(req.params.id, req.body);

    TaskSocket.emitUpdated(req.io, task);
    ActivityService.log({
      action: EVENTS.TASK_UPDATED,
      entityModel: "Task",
      entityId: task._id,
      user: req.user._id,
      metadata: { updates: Object.keys(req.body) },
    });

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const VALID_STATUSES = ["To Do", "In Progress", "Done"];
    const status = req.body.status;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "status must be one of: To Do, In Progress, Done." });
    }
    const task = await TaskService.updateStatus(req.params.id, status);

    TaskSocket.emitUpdated(req.io, task);
    ActivityService.log({
      action: EVENTS.TASK_UPDATED,
      entityModel: "Task",
      entityId: task._id,
      user: req.user._id,
      metadata: { updates: ["status"] },
    });

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await CascadeService.deleteTaskCascade(req.params.id);

    TaskSocket.emitDeleted(req.io, req.params.id, task.project._id || task.project, task.assignedTo);
    ActivityService.log({
      action: EVENTS.TASK_DELETED,
      entityModel: "Task",
      entityId: req.params.id,
      user: req.user._id,
      metadata: { title: task.title },
    });

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    next(error);
  }
};

exports.duplicateTask = async (req, res, next) => {
  try {
    const clonedTask = await TaskService.duplicate(req.params.id, req.user._id);

    TaskSocket.emitCreated(req.io, clonedTask);
    ActivityService.log({
      action: EVENTS.TASK_CREATED,
      entityModel: "Task",
      entityId: clonedTask._id,
      user: req.user._id,
      metadata: { duplicatedFrom: req.params.id },
    });

    res.status(201).json({ task: clonedTask });
  } catch (error) {
    next(error);
  }
};
