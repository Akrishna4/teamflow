const EventEmitter = require('events');

/**
 * EventBus acts as a central hub for cross-domain events.
 * It prevents tight coupling between services (e.g. TaskService doesn't need to import SocketService or ActivityService).
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    // Set a higher max listeners limit to accommodate many domain subscribers
    this.setMaxListeners(50);
  }

  /**
   * Publish an event to the bus.
   * @param {string} event - The event name (e.g., 'task.created')
   * @param {object} payload - The event payload (e.g., { task, actorId })
   */
  publish(event, payload) {
    this.emit(event, payload);
  }

  /**
   * Subscribe to an event on the bus.
   * @param {string} event - The event name
   * @param {function} listener - The callback function
   */
  subscribe(event, listener) {
    this.on(event, listener);
  }
}

// Export a singleton instance
module.exports = new EventBus();
