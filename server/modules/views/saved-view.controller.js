const SavedViewService = require('./saved-view.service');
const ResponseHandler = require('../shared/response.handler');

class SavedViewController {
  static async getViews(req, res, next) {
    try {
      const views = await SavedViewService.getByProjectAndUser(req.query.projectId, req.user._id);
      return ResponseHandler.success(res, views, 'Saved views retrieved');
    } catch (err) { next(err); }
  }

  static async createView(req, res, next) {
    try {
      const data = {
        ...req.body,
        user: req.user._id,
      };
      const view = await SavedViewService.create(data);
      return ResponseHandler.success(res, view, 'Saved view created', 201);
    } catch (err) { next(err); }
  }

  static async updateView(req, res, next) {
    try {
      const view = await SavedViewService.update(req.params.id, req.user._id, req.body);
      return ResponseHandler.success(res, view, 'Saved view updated');
    } catch (err) { next(err); }
  }

  static async deleteView(req, res, next) {
    try {
      await SavedViewService.delete(req.params.id, req.user._id);
      return ResponseHandler.success(res, null, 'Saved view deleted');
    } catch (err) { next(err); }
  }
}

module.exports = SavedViewController;
