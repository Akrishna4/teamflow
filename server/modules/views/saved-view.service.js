const SavedView = require('./saved-view.model');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

class SavedViewService {
  static async getByProjectAndUser(projectId, userId) {
    return SavedView.find({ project: projectId, user: userId }).sort({ createdAt: -1 });
  }

  static async create(data) {
    // If setting as default, unset others for this user/project
    if (data.isDefault) {
      await SavedView.updateMany({ project: data.project, user: data.user }, { isDefault: false });
    }
    return SavedView.create(data);
  }

  static async update(id, userId, updates) {
    const view = await SavedView.findById(id);
    if (!view) throw new NotFoundError('Saved view not found');
    if (view.user.toString() !== userId.toString()) throw new ForbiddenError('Not authorized');

    if (updates.isDefault) {
      await SavedView.updateMany({ project: view.project, user: userId }, { isDefault: false });
    }

    Object.assign(view, updates);
    await view.save();
    return view;
  }

  static async delete(id, userId) {
    const view = await SavedView.findById(id);
    if (!view) throw new NotFoundError('Saved view not found');
    if (view.user.toString() !== userId.toString()) throw new ForbiddenError('Not authorized');

    await view.deleteOne();
    return { success: true };
  }
}

module.exports = SavedViewService;
