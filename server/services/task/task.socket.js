const EventService = require("../socket/event.service");
const RoomService = require("../socket/room.service");
const EVENTS = require("../../constants/socketEvents");

class TaskSocket {
  static _emitToAssignees(io, task, eventName, payload) {
    if (task.assignedTo && Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach((user) => {
        const userId = user._id || user;
        EventService.emitToRoom(io, RoomService.getUserRoom(userId), eventName, payload);
      });
    }
  }

  static emitCreated(io, task) {
    if (task.project) {
      EventService.emitToRoom(
        io,
        RoomService.getProjectRoom(task.project._id || task.project),
        EVENTS.TASK_CREATED,
        task
      );
    }
    this._emitToAssignees(io, task, EVENTS.TASK_CREATED, task);
  }

  static emitUpdated(io, task) {
    if (task.project) {
      EventService.emitToRoom(
        io,
        RoomService.getProjectRoom(task.project._id || task.project),
        EVENTS.TASK_UPDATED,
        task
      );
    }
    this._emitToAssignees(io, task, EVENTS.TASK_UPDATED, task);
  }

  static emitDeleted(io, taskId, projectId, assignedTo = []) {
    if (projectId) {
      EventService.emitToRoom(
        io,
        RoomService.getProjectRoom(projectId),
        EVENTS.TASK_DELETED,
        taskId
      );
    }
    const mockTask = { assignedTo };
    this._emitToAssignees(io, mockTask, EVENTS.TASK_DELETED, taskId);
  }
}

module.exports = TaskSocket;
