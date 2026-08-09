const EventService = require("../socket/event.service");
const RoomService = require("../socket/room.service");
const EVENTS = require("../../constants/socketEvents");

class ProjectSocket {
  static emitCreated(io, project) {
    // New projects are emitted globally so everyone sees them in the Projects list
    EventService.emitGlobal(io, EVENTS.PROJECT_CREATED, project);
  }

  static emitUpdated(io, project) {
    // Only users viewing the project need real-time updates for it
    EventService.emitToRoom(
      io,
      RoomService.getProjectRoom(project._id),
      EVENTS.PROJECT_UPDATED,
      project
    );
  }

  static emitDeleted(io, projectId) {
    // Needs to go to the project room (to kick viewers out)
    // AND globally (to remove it from the Projects list page)
    EventService.emitGlobal(io, EVENTS.PROJECT_DELETED, projectId);
  }
}

module.exports = ProjectSocket;
