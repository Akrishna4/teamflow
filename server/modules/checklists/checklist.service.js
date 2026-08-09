const Checklist = require('./checklist.model');
const ChecklistItem = require('./checklist-item.model');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const EventBus = require('../shared/event-bus');

class ChecklistService {
  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Fetch a single checklist with its items (enriched with progress).
   */
  static async _enrichChecklist(checklist) {
    const items = await ChecklistItem.find({ checklist: checklist._id })
      .populate('completedBy', 'name')
      .sort({ order: 1 })
      .lean();

    const total = items.length;
    const done = items.filter((i) => i.completed).length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    return { ...checklist, items, progress, total, done };
  }

  // ── Checklist CRUD ───────────────────────────────────────────────────────

  /**
   * Get all checklists for a task with items and progress.
   */
  static async getByTask(taskId) {
    const checklists = await Checklist.find({ task: taskId })
      .sort({ order: 1 })
      .lean();

    return Promise.all(checklists.map((cl) => ChecklistService._enrichChecklist(cl)));
  }

  /**
   * Create a new checklist for a task.
   */
  static async createChecklist(taskId, title, userId, projectId) {
    // Set order to end of list
    const count = await Checklist.countDocuments({ task: taskId });

    const checklist = await Checklist.create({
      task: taskId,
      title,
      order: count,
    });

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist.created', {
      entity: 'checklist',
      action: 'created',
      actor: userId,
      taskId,
      projectId,
      payload: enriched,
      changes: null,
    });

    return enriched;
  }

  /**
   * Update checklist title.
   */
  static async updateChecklist(checklistId, title, userId, projectId) {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) throw new NotFoundError('Checklist not found');

    const old = checklist.title;
    checklist.title = title;
    await checklist.save();

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist.updated', {
      entity: 'checklist',
      action: 'updated',
      actor: userId,
      taskId: checklist.task,
      projectId,
      payload: enriched,
      changes: { title: { from: old, to: title } },
    });

    return enriched;
  }

  /**
   * Delete a checklist and all its items (cascade).
   */
  static async deleteChecklist(checklistId, userId, projectId) {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) throw new NotFoundError('Checklist not found');

    await ChecklistItem.deleteMany({ checklist: checklistId });
    await Checklist.findByIdAndDelete(checklistId);

    EventBus.publish('checklist.deleted', {
      entity: 'checklist',
      action: 'deleted',
      actor: userId,
      taskId: checklist.task,
      projectId,
      payload: { _id: checklistId, task: checklist.task },
      changes: null,
    });

    return { _id: checklistId };
  }

  // ── Item CRUD ────────────────────────────────────────────────────────────

  /**
   * Add an item to a checklist.
   */
  static async createItem(checklistId, title, userId, projectId) {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) throw new NotFoundError('Checklist not found');

    const count = await ChecklistItem.countDocuments({ checklist: checklistId });

    const item = await ChecklistItem.create({
      checklist: checklistId,
      title,
      order: count,
    });

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist_item.created', {
      entity: 'checklist_item',
      action: 'created',
      actor: userId,
      taskId: checklist.task,
      projectId,
      payload: enriched, // send full enriched checklist so client can replace the whole thing
      changes: null,
    });

    return { item: item.toObject(), checklist: enriched };
  }

  /**
   * Update item title or completed state.
   * Any project member can complete items. Only admin can rename.
   */
  static async updateItem(itemId, updates, user, projectId) {
    const item = await ChecklistItem.findById(itemId);
    if (!item) throw new NotFoundError('Checklist item not found');

    const checklist = await Checklist.findById(item.checklist);
    if (!checklist) throw new NotFoundError('Parent checklist not found');

    const changes = {};

    // Title update — admin only
    if (updates.title !== undefined) {
      if (user.role !== 'Admin') throw new ForbiddenError('Only admins can rename checklist items');
      changes.title = { from: item.title, to: updates.title };
      item.title = updates.title;
    }

    // Toggle completion — any project member
    if (updates.completed !== undefined) {
      changes.completed = { from: item.completed, to: updates.completed };
      item.completed = updates.completed;
      item.completedBy = updates.completed ? user._id : null;
      item.completedAt = updates.completed ? new Date() : null;
    }

    await item.save();

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist_item.updated', {
      entity: 'checklist_item',
      action: 'updated',
      actor: user._id,
      taskId: checklist.task,
      projectId,
      payload: enriched,
      changes,
    });

    return enriched;
  }

  /**
   * Delete an item from a checklist.
   */
  static async deleteItem(itemId, userId, projectId) {
    const item = await ChecklistItem.findById(itemId);
    if (!item) throw new NotFoundError('Checklist item not found');

    const checklist = await Checklist.findById(item.checklist);
    if (!checklist) throw new NotFoundError('Parent checklist not found');

    await ChecklistItem.findByIdAndDelete(itemId);

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist_item.deleted', {
      entity: 'checklist_item',
      action: 'deleted',
      actor: userId,
      taskId: checklist.task,
      projectId,
      payload: enriched,
      changes: null,
    });

    return enriched;
  }

  /**
   * Reorder items within a checklist.
   * Accepts an array of { _id, order } to bulk-update positions.
   */
  static async reorderItems(checklistId, orderedIds, userId, projectId) {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) throw new NotFoundError('Checklist not found');

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: { filter: { _id: id, checklist: checklistId }, update: { order: index } },
    }));
    await ChecklistItem.bulkWrite(bulkOps);

    const enriched = await ChecklistService._enrichChecklist(checklist.toObject());

    EventBus.publish('checklist_item.updated', {
      entity: 'checklist_item',
      action: 'reordered',
      actor: userId,
      taskId: checklist.task,
      projectId,
      payload: enriched,
      changes: null,
    });

    return enriched;
  }
}

module.exports = ChecklistService;
