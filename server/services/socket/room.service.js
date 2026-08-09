/**
 * Manages Socket.IO room names for namespacing events to specific projects or users.
 */
class RoomService {
  static getProjectRoom(projectId) {
    return `project:${projectId}`;
  }

  static getUserRoom(userId) {
    return `user:${userId}`;
  }
}

module.exports = RoomService;
