const Activity = require("../../models/Activity");
const { logger } = require("../../modules/shared/logger");

/**
 * Handles activity logging completely asynchronously.
 * Methods here should NOT be awaited in the main CRUD flow
 * to ensure non-blocking performance.
 */
class ActivityService {
  /**
   * Logs an activity.
   * @param {Object} data - { action, entityModel, entityId, user, metadata }
   */
  static async log(data) {
    try {
      const activity = await Activity.create(data);
      const populated = await Activity.findById(activity._id)
        .populate('user', 'name email avatar')
        .lean();
      
      const EventBus = require('../../modules/shared/event-bus');
      // Fire history event back to EventBus
      EventBus.publish('history.created', {
        projectId: data.projectId,
        taskId: data.entityModel === 'Task' ? data.entityId : null,
        payload: populated
      });
    } catch (err) {
      logger.error({ err }, "Failed to write activity log");
    }
  }

  /**
   * Retrieves paginated activity timeline.
   */
  static async getTimeline(filters, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return Activity.find(filters)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }
}

module.exports = ActivityService;
