/**
 * Wrapper for emitting Socket.IO events to ensure we use standardized
 * room names and avoid passing req.io deeply into services.
 */
class EventService {
  /**
   * Inject the global IO instance (set once at startup or passed dynamically).
   * For Express controllers calling services, they can pass req.io.
   */
  static emitToRoom(io, room, eventName, payload) {
    if (!io) return;
    io.to(room).emit(eventName, payload);
  }

  static emitGlobal(io, eventName, payload) {
    if (!io) return;
    io.emit(eventName, payload);
  }
}

module.exports = EventService;
