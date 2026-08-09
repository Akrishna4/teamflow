const EventBus = require('./event-bus');
const ActivityService = require('../../services/activity/activity.service');
const RoomService = require('../../services/socket/room.service');

/**
 * Central wiring: EventBus → Socket.IO + Activity logging.
 * Called once at server startup with the io instance.
 *
 * Adding a new event type: subscribe it here, no other file needs changing.
 */
module.exports = function setupEventBusListeners(io) {
  const DOMAIN_EVENTS = [
    // Comments
    'comment.created',
    'comment.updated',
    'comment.deleted',
    // Checklists
    'checklist.created',
    'checklist.updated',
    'checklist.deleted',
    'checklist_item.created',
    'checklist_item.updated',
    'checklist_item.deleted',
    // Labels
    'label.created',
    'label.updated',
    'label.deleted',
    // Attachments
    'attachment.uploaded',
    'attachment.deleted',
    // History
    'history.created',
  ];

  DOMAIN_EVENTS.forEach((eventName) => {
    EventBus.subscribe(eventName, async (data) => {
      try {
        // 1. Broadcast to the project room only
        if (data.projectId) {
          io.to(RoomService.getProjectRoom(data.projectId)).emit(eventName, data.payload);
        }

        // 2. Fire-and-forget activity log
        // (Do not log 'history.created' to prevent infinite loop)
        if (data.actor && data.taskId && eventName !== 'history.created') {
          ActivityService.log({
            action: eventName,
            entityModel: 'Task',
            entityId: data.taskId,
            user: data.actor,
            projectId: data.projectId,
            metadata: data.changes || {},
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error handling ${eventName}:`, err);
      }
    });
  });
};
