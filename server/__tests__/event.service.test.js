const EventService = require("../services/socket/event.service");

describe("EventService", () => {
  describe("emitToRoom", () => {
    it("does nothing when io is not provided", () => {
      expect(() =>
        EventService.emitToRoom(null, "room-1", "task.created", { id: 1 })
      ).not.toThrow();
    });

    it("emits an event to the specified room", () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      const io = { to };

      const payload = { id: 1 };

      EventService.emitToRoom(
        io,
        "project:123",
        "task.created",
        payload
      );

      expect(to).toHaveBeenCalledWith("project:123");
      expect(emit).toHaveBeenCalledWith("task.created", payload);
    });
  });

  describe("emitGlobal", () => {
    it("does nothing when io is not provided", () => {
      expect(() =>
        EventService.emitGlobal(null, "notification.created", { id: 1 })
      ).not.toThrow();
    });

    it("emits an event globally", () => {
      const emit = jest.fn();
      const io = { emit };

      const payload = { id: 1 };

      EventService.emitGlobal(
        io,
        "notification.created",
        payload
      );

      expect(emit).toHaveBeenCalledWith(
        "notification.created",
        payload
      );
    });
  });
});