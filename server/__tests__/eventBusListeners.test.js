const EventBus = require("../modules/shared/event-bus");
const ActivityService = require("../services/activity/activity.service");
const RoomService = require("../services/socket/room.service");

jest.mock("../modules/shared/event-bus", () => ({
  subscribe: jest.fn(),
}));

jest.mock("../services/activity/activity.service", () => ({
  log: jest.fn(),
}));

jest.mock("../services/socket/room.service", () => ({
  getProjectRoom: jest.fn(),
}));

const setupEventBusListeners = require("../modules/shared/event-bus.listeners");

describe("EventBus Listeners", () => {
  let io;
  let roomEmit;

  beforeEach(() => {
    jest.clearAllMocks();

    roomEmit = jest.fn();

    io = {
      to: jest.fn().mockReturnValue({
        emit: roomEmit,
      }),
    };
  });

  it("registers listeners for all domain events", () => {
    setupEventBusListeners(io);

    expect(EventBus.subscribe).toHaveBeenCalledTimes(15);

    const registeredEvents = EventBus.subscribe.mock.calls.map(
      ([eventName]) => eventName
    );

    expect(registeredEvents).toEqual([
      "comment.created",
      "comment.updated",
      "comment.deleted",
      "checklist.created",
      "checklist.updated",
      "checklist.deleted",
      "checklist_item.created",
      "checklist_item.updated",
      "checklist_item.deleted",
      "label.created",
      "label.updated",
      "label.deleted",
      "attachment.uploaded",
      "attachment.deleted",
      "history.created",
    ]);
  });

  it("broadcasts an event to the project room", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.created"
    )[1];

    RoomService.getProjectRoom.mockReturnValue("project:123");

    const data = {
      projectId: "project-123",
      taskId: "task-123",
      actor: "user-123",
      payload: {
        _id: "comment-123",
        text: "Hello",
      },
      changes: {
        text: {
          from: "Hi",
          to: "Hello",
        },
      },
    };

    await handler(data);

    expect(RoomService.getProjectRoom).toHaveBeenCalledWith("project-123");
    expect(io.to).toHaveBeenCalledWith("project:123");
    expect(roomEmit).toHaveBeenCalledWith("comment.created", data.payload);
  });

  it("logs activity when actor and taskId are present", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "task.created"
    );

    // task.created isn't registered, so use a registered event.
    const commentHandler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.created"
    )[1];

    const data = {
      projectId: "project-123",
      taskId: "task-123",
      actor: "user-123",
      payload: {
        _id: "comment-123",
      },
      changes: {
        text: {
          from: "Old",
          to: "New",
        },
      },
    };

    await commentHandler(data);

    expect(ActivityService.log).toHaveBeenCalledWith({
      action: "comment.created",
      entityModel: "Task",
      entityId: "task-123",
      user: "user-123",
      projectId: "project-123",
      metadata: data.changes,
    });
  });

  it("does not broadcast when projectId is missing", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.created"
    )[1];

    await handler({
      actor: "user-123",
      taskId: "task-123",
      payload: {
        _id: "comment-123",
      },
    });

    expect(io.to).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();

    expect(ActivityService.log).toHaveBeenCalled();
  });

  it("does not log history.created activity to prevent an event loop", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "history.created"
    )[1];

    const data = {
      projectId: "project-123",
      taskId: "task-123",
      actor: "user-123",
      payload: {
        _id: "history-123",
      },
    };

    await handler(data);

    expect(ActivityService.log).not.toHaveBeenCalled();
    expect(io.to).toHaveBeenCalled();
    expect(roomEmit).toHaveBeenCalledWith(
      "history.created",
      data.payload
    );
  });

  it("does not log activity when actor is missing", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.created"
    )[1];

    await handler({
      projectId: "project-123",
      taskId: "task-123",
      payload: {},
    });

    expect(ActivityService.log).not.toHaveBeenCalled();
  });

  it("does not log activity when taskId is missing", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.created"
    )[1];

    await handler({
      projectId: "project-123",
      actor: "user-123",
      payload: {},
    });

    expect(ActivityService.log).not.toHaveBeenCalled();
  });

  it("uses an empty object when changes are not provided", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.updated"
    )[1];

    await handler({
      projectId: "project-123",
      taskId: "task-123",
      actor: "user-123",
      payload: {},
    });

    expect(ActivityService.log).toHaveBeenCalledWith({
      action: "comment.updated",
      entityModel: "Task",
      entityId: "task-123",
      user: "user-123",
      projectId: "project-123",
      metadata: {},
    });
  });

  it("catches errors thrown while handling an event", async () => {
    setupEventBusListeners(io);

    const handler = EventBus.subscribe.mock.calls.find(
      ([eventName]) => eventName === "comment.deleted"
    )[1];

    const error = new Error("Socket failure");
    RoomService.getProjectRoom.mockImplementation(() => {
      throw error;
    });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      handler({
        projectId: "project-123",
        taskId: "task-123",
        actor: "user-123",
        payload: {},
      })
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[EventBus] Error handling comment.deleted:",
      error
    );

    consoleErrorSpy.mockRestore();
  });
});