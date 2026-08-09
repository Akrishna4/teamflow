const ChecklistService = require('./checklist.service');
const ResponseHandler = require('../shared/response.handler');

class ChecklistController {
  /** GET /api/v1/tasks/:taskId/checklists */
  static async getChecklists(req, res, next) {
    try {
      const checklists = await ChecklistService.getByTask(req.params.taskId);
      return ResponseHandler.success(res, checklists, 'Checklists retrieved');
    } catch (err) { next(err); }
  }

  /** POST /api/v1/tasks/:taskId/checklists */
  static async createChecklist(req, res, next) {
    try {
      const { title, projectId } = req.body;
      const checklist = await ChecklistService.createChecklist(
        req.params.taskId, title, req.user._id, projectId
      );
      return ResponseHandler.success(res, checklist, 'Checklist created', 201);
    } catch (err) { next(err); }
  }

  /** PUT /api/v1/checklists/:checklistId */
  static async updateChecklist(req, res, next) {
    try {
      const { title, projectId } = req.body;
      const checklist = await ChecklistService.updateChecklist(
        req.params.checklistId, title, req.user._id, projectId
      );
      return ResponseHandler.success(res, checklist, 'Checklist updated');
    } catch (err) { next(err); }
  }

  /** DELETE /api/v1/checklists/:checklistId?projectId=xxx */
  static async deleteChecklist(req, res, next) {
    try {
      const projectId = req.query.projectId;
      const result = await ChecklistService.deleteChecklist(
        req.params.checklistId, req.user._id, projectId
      );
      return ResponseHandler.success(res, result, 'Checklist deleted');
    } catch (err) { next(err); }
  }

  /** POST /api/v1/checklists/:checklistId/items */
  static async createItem(req, res, next) {
    try {
      const { title, projectId } = req.body;
      const result = await ChecklistService.createItem(
        req.params.checklistId, title, req.user._id, projectId
      );
      return ResponseHandler.success(res, result, 'Item added', 201);
    } catch (err) { next(err); }
  }

  /** PUT /api/v1/checklist-items/:itemId */
  static async updateItem(req, res, next) {
    try {
      const { title, completed, projectId } = req.body;
      const checklist = await ChecklistService.updateItem(
        req.params.itemId,
        { title, completed },
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, checklist, 'Item updated');
    } catch (err) { next(err); }
  }

  /** DELETE /api/v1/checklist-items/:itemId?projectId=xxx */
  static async deleteItem(req, res, next) {
    try {
      const projectId = req.query.projectId;
      const checklist = await ChecklistService.deleteItem(
        req.params.itemId, req.user._id, projectId
      );
      return ResponseHandler.success(res, checklist, 'Item deleted');
    } catch (err) { next(err); }
  }

  /** PUT /api/v1/checklists/:checklistId/reorder */
  static async reorderItems(req, res, next) {
    try {
      const { orderedIds, projectId } = req.body;
      const checklist = await ChecklistService.reorderItems(
        req.params.checklistId, orderedIds, req.user._id, projectId
      );
      return ResponseHandler.success(res, checklist, 'Items reordered');
    } catch (err) { next(err); }
  }
}

module.exports = ChecklistController;
