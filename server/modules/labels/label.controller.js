const LabelService = require('./label.service');
const ResponseHandler = require('../shared/response.handler');

class LabelController {
  /** GET /api/v1/projects/:projectId/labels */
  static async getProjectLabels(req, res, next) {
    try {
      const labels = await LabelService.getByProject(req.params.projectId);
      return ResponseHandler.success(res, labels, 'Labels retrieved');
    } catch (err) { next(err); }
  }

  /** POST /api/v1/projects/:projectId/labels */
  static async createLabel(req, res, next) {
    try {
      const { name, color } = req.body;
      const label = await LabelService.createLabel(
        req.params.projectId, name, color, { _id: req.user._id, role: req.user.role }
      );
      return ResponseHandler.success(res, label, 'Label created', 201);
    } catch (err) { next(err); }
  }

  /** PUT /api/v1/labels/:labelId */
  static async updateLabel(req, res, next) {
    try {
      const { name, color, projectId } = req.body;
      const label = await LabelService.updateLabel(
        req.params.labelId,
        { name, color },
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, label, 'Label updated');
    } catch (err) { next(err); }
  }

  /** DELETE /api/v1/labels/:labelId?projectId=xxx */
  static async deleteLabel(req, res, next) {
    try {
      const projectId = req.query.projectId;
      const result = await LabelService.deleteLabel(
        req.params.labelId,
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, result, 'Label deleted');
    } catch (err) { next(err); }
  }

  /** POST /api/v1/tasks/:taskId/labels/:labelId */
  static async assignToTask(req, res, next) {
    try {
      const projectId = req.body.projectId;
      const task = await LabelService.assignToTask(
        req.params.taskId,
        req.params.labelId,
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, task, 'Label assigned');
    } catch (err) { next(err); }
  }

  /** DELETE /api/v1/tasks/:taskId/labels/:labelId?projectId=xxx */
  static async removeFromTask(req, res, next) {
    try {
      const projectId = req.query.projectId;
      const task = await LabelService.removeFromTask(
        req.params.taskId,
        req.params.labelId,
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, task, 'Label removed');
    } catch (err) { next(err); }
  }
}

module.exports = LabelController;
