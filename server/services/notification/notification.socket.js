const EventService = require("../socket/event.service");
const RoomService = require("../socket/room.service");
const EVENTS = require("../../constants/socketEvents");

class NotificationSocket {
  static emitCreated(io, notification) {
    EventService.emitToRoom(
      io,
      RoomService.getUserRoom(notification.user),
      EVENTS.NOTIFICATION_CREATED,
      notification
    );
  }
}

module.exports = NotificationSocket;
