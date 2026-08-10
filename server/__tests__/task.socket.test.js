const TaskSocket = require("../services/task/task.socket");
const EventService = require("../services/socket/event.service");
const RoomService = require("../services/socket/room.service");
const EVENTS = require("../constants/socketEvents");

jest.mock("../services/socket/event.service");
jest.mock("../services/socket/room.service");

describe("TaskSocket", () => {
  const io = {};

  beforeEach(() => {
    jest.clearAllMocks();

    RoomService.getProjectRoom.mockImplementation(
      (id) => `project:${id}`
    );

    RoomService.getUserRoom.mockImplementation(
      (id) => `user:${id}`
    );
  });

  describe("emitCreated", () => {
    it("emits to project room and assigned users", () => {
      const task = {
        _id: "task-1",
        project: { _id: "project-1" },
        assignedTo: [
          { _id: "user-1" },
          "user-2",
        ],
      };

      TaskSocket.emitCreated(io, task);

      expect(RoomService.getProjectRoom).toHaveBeenCalledWith(
        "project-1"
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "project:project-1",
        EVENTS.TASK_CREATED,
        task
      );

      expect(RoomService.getUserRoom).toHaveBeenCalledWith("user-1");
      expect(RoomService.getUserRoom).toHaveBeenCalledWith("user-2");

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-1",
        EVENTS.TASK_CREATED,
        task
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-2",
        EVENTS.TASK_CREATED,
        task
      );
    });

    it("emits using a raw project id", () => {
      const task = {
        project: "project-1",
        assignedTo: [],
      };

      TaskSocket.emitCreated(io, task);

      expect(RoomService.getProjectRoom).toHaveBeenCalledWith(
        "project-1"
      );
    });

    it("does not emit to a project room when project is missing", () => {
      const task = {
        assignedTo: [],
      };

      TaskSocket.emitCreated(io, task);

      expect(RoomService.getProjectRoom).not.toHaveBeenCalled();
      expect(EventService.emitToRoom).not.toHaveBeenCalled();
    });

    it("handles a task without assigned users", () => {
      const task = {
        project: "project-1",
      };

      TaskSocket.emitCreated(io, task);

      expect(EventService.emitToRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe("emitUpdated", () => {
    it("emits update to project and assigned users", () => {
      const task = {
        project: "project-1",
        assignedTo: [{ _id: "user-1" }],
      };

      TaskSocket.emitUpdated(io, task);

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "project:project-1",
        EVENTS.TASK_UPDATED,
        task
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-1",
        EVENTS.TASK_UPDATED,
        task
      );
    });

    it("does not emit to project when project is missing", () => {
      const task = {
        assignedTo: ["user-1"],
      };

      TaskSocket.emitUpdated(io, task);

      expect(RoomService.getProjectRoom).not.toHaveBeenCalled();

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-1",
        EVENTS.TASK_UPDATED,
        task
      );
    });
  });

  describe("emitDeleted", () => {
    it("emits deletion to project and assigned users", () => {
      TaskSocket.emitDeleted(
        io,
        "task-1",
        "project-1",
        ["user-1", { _id: "user-2" }]
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "project:project-1",
        EVENTS.TASK_DELETED,
        "task-1"
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-1",
        EVENTS.TASK_DELETED,
        "task-1"
      );

      expect(EventService.emitToRoom).toHaveBeenCalledWith(
        io,
        "user:user-2",
        EVENTS.TASK_DELETED,
        "task-1"
      );
    });

    it("does not emit to a project room when project id is missing", () => {
      TaskSocket.emitDeleted(
        io,
        "task-1",
        null,
        []
      );

      expect(EventService.emitToRoom).not.toHaveBeenCalled();
    });

    it("handles the default empty assigned user list", () => {
      TaskSocket.emitDeleted(
        io,
        "task-1",
        "project-1"
      );

      expect(EventService.emitToRoom).toHaveBeenCalledTimes(1);
    });
  });
});