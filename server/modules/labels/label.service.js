const Label = require('./label.model');
const Task = require('../../models/Task');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../utils/errors');
const EventBus = require('../shared/event-bus');

class LabelService {
  /**
   * Get all labels for a project.
   */
  static async getByProject(projectId) {
    return Label.find({ project: projectId }).sort({ name: 1 }).lean();
  }

  /**
   * Create a new label (Admin only).
   */
  static async createLabel(projectId, name, color, user) {
    if (user.role !== 'Admin') throw new ForbiddenError('Only admins can create labels');

    try {
      const normalizedColor = color.toLowerCase();
      const label = await Label.create({ project: projectId, name, color: normalizedColor });
      
      const payload = label.toObject();
      EventBus.publish('label.created', {
        entity: 'label',
        action: 'created',
        actor: user._id,
        taskId: null,
        projectId,
        payload,
        changes: null,
      });

      return payload;
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError(`Label '${name}' already exists in this project`);
      }
      throw err;
    }
  }

  /**
   * Update an existing label (Admin only).
   */
  static async updateLabel(labelId, updates, user, projectId) {
    if (user.role !== 'Admin') throw new ForbiddenError('Only admins can edit labels');

    const label = await Label.findById(labelId);
    if (!label) throw new NotFoundError('Label not found');

    const changes = {};
    if (updates.name && updates.name !== label.name) {
      changes.name = { from: label.name, to: updates.name };
      label.name = updates.name;
    }
    if (updates.color && updates.color.toLowerCase() !== label.color) {
      const newColor = updates.color.toLowerCase();
      changes.color = { from: label.color, to: newColor };
      label.color = newColor;
    }

    try {
      await label.save();
      const payload = label.toObject();

      if (Object.keys(changes).length > 0) {
        EventBus.publish('label.updated', {
          entity: 'label',
          action: 'updated',
          actor: user._id,
          taskId: null,
          projectId,
          payload,
          changes,
        });
      }

      return payload;
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError(`Label '${updates.name}' already exists in this project`);
      }
      throw err;
    }
  }

  /**
   * Delete a label (Admin only).
   * Also removes this label from all tasks that use it.
   */
  static async deleteLabel(labelId, user, projectId) {
    if (user.role !== 'Admin') throw new ForbiddenError('Only admins can delete labels');

    const label = await Label.findById(labelId);
    if (!label) throw new NotFoundError('Label not found');

    // Remove label reference from all tasks
    await Task.updateMany(
      { project: projectId, labels: labelId },
      { $pull: { labels: labelId } }
    );

    await Label.findByIdAndDelete(labelId);

    EventBus.publish('label.deleted', {
      entity: 'label',
      action: 'deleted',
      actor: user._id,
      taskId: null,
      projectId,
      payload: { _id: labelId },
      changes: null,
    });

    return { _id: labelId };
  }

  // ─── Task-Label Assignment ───────────────────────────────────────────────

  /**
   * Assign a label to a task (Any member).
   */
  static async assignToTask(taskId, labelId, user, projectId) {
    const label = await Label.findOne({ _id: labelId, project: projectId });
    if (!label) throw new NotFoundError('Label not found in this project');

    const task = await Task.findOneAndUpdate(
      { _id: taskId, project: projectId },
      { $addToSet: { labels: labelId } },
      { returnDocument: "after" }
    ).populate('labels').populate('assignedTo', 'name email role').populate('createdBy', 'name');

    if (!task) throw new NotFoundError('Task not found');

    EventBus.publish('task.updated', {
      entity: 'task',
      action: 'updated',
      actor: user._id,
      taskId,
      projectId,
      payload: task.toObject(),
      changes: { labels: 'Label assigned' },
    });

    return task.toObject();
  }

  /**
   * Remove a label from a task (Any member).
   */
  static async removeFromTask(taskId, labelId, user, projectId) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, project: projectId },
      { $pull: { labels: labelId } },
      { returnDocument: "after" }
    ).populate('labels').populate('assignedTo', 'name email role').populate('createdBy', 'name');

    if (!task) throw new NotFoundError('Task not found');

    EventBus.publish('task.updated', {
      entity: 'task',
      action: 'updated',
      actor: user._id,
      taskId,
      projectId,
      payload: task.toObject(),
      changes: { labels: 'Label removed' },
    });

    return task.toObject();
  }
}

module.exports = LabelService;
