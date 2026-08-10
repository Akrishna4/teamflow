const ActivityService = require("../services/activity/activity.service");
const Activity = require("../models/Activity");
const EventBus = require("../modules/shared/event-bus");
const { logger } = require("../modules/shared/logger");

describe("ActivityService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("log", () => {
    it("creates and publishes a history event for a Task activity", async () => {
      const activity = {
        _id: "activity-123",
      };

      const populatedActivity = {
        _id: "activity-123",
        action: "TASK_CREATED",
        entityModel: "Task",
        entityId: "task-123",
      };

      const data = {
        action: "TASK_CREATED",
        entityModel: "Task",
        entityId: "task-123",
        user: "user-123",
        projectId: "project-123",
        metadata: {
          title: "Test Task",
        },
      };

      jest.spyOn(Activity, "create").mockResolvedValue(activity);

      const leanMock = jest.fn().mockResolvedValue(populatedActivity);
      const populateMock = jest.fn().mockReturnValue({
        lean: leanMock,
      });

      jest.spyOn(Activity, "findById").mockReturnValue({
        populate: populateMock,
      });

      jest.spyOn(EventBus, "publish").mockImplementation(() => {});

      await ActivityService.log(data);

      expect(Activity.create).toHaveBeenCalledWith(data);

      expect(Activity.findById).toHaveBeenCalledWith("activity-123");

      expect(populateMock).toHaveBeenCalledWith(
        "user",
        "name email avatar"
      );

      expect(EventBus.publish).toHaveBeenCalledWith(
        "history.created",
        {
          projectId: "project-123",
          taskId: "task-123",
          payload: populatedActivity,
        }
      );
    });

    it("publishes null taskId for a non-Task activity", async () => {
      const activity = {
        _id: "activity-456",
      };

      const populatedActivity = {
        _id: "activity-456",
        entityModel: "Project",
      };

      const data = {
        action: "PROJECT_UPDATED",
        entityModel: "Project",
        entityId: "project-123",
        user: "user-123",
        projectId: "project-123",
        metadata: {},
      };

      jest.spyOn(Activity, "create").mockResolvedValue(activity);

      const leanMock = jest.fn().mockResolvedValue(populatedActivity);
      const populateMock = jest.fn().mockReturnValue({
        lean: leanMock,
      });

      jest.spyOn(Activity, "findById").mockReturnValue({
        populate: populateMock,
      });

      jest.spyOn(EventBus, "publish").mockImplementation(() => {});

      await ActivityService.log(data);

      expect(EventBus.publish).toHaveBeenCalledWith(
        "history.created",
        {
          projectId: "project-123",
          taskId: null,
          payload: populatedActivity,
        }
      );
    });

    it("handles errors without throwing", async () => {
      const error = new Error("Database error");

      jest.spyOn(Activity, "create").mockRejectedValue(error);

      const loggerSpy = jest
        .spyOn(logger, "error")
        .mockImplementation(() => {});

      await expect(
        ActivityService.log({
          action: "TASK_CREATED",
          entityModel: "Task",
          entityId: "task-123",
          user: "user-123",
        })
      ).resolves.toBeUndefined();

      expect(loggerSpy).toHaveBeenCalledWith(
        { err: error },
        "Failed to write activity log"
      );
    });
  });

  describe("getTimeline", () => {
    it("returns paginated activity timeline", async () => {
      const activities = [
        {
          _id: "activity-1",
          action: "TASK_CREATED",
        },
      ];

      const leanMock = jest.fn().mockResolvedValue(activities);

      const limitMock = jest.fn().mockReturnValue({
        lean: leanMock,
      });

      const skipMock = jest.fn().mockReturnValue({
        limit: limitMock,
      });

      const sortMock = jest.fn().mockReturnValue({
        skip: skipMock,
      });

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      jest.spyOn(Activity, "find").mockReturnValue({
        populate: populateMock,
      });

      const filters = {
        projectId: "project-123",
      };

      const result = await ActivityService.getTimeline(
        filters,
        2,
        10
      );

      expect(Activity.find).toHaveBeenCalledWith(filters);

      expect(populateMock).toHaveBeenCalledWith(
        "user",
        "name email avatar"
      );

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(skipMock).toHaveBeenCalledWith(10);

      expect(limitMock).toHaveBeenCalledWith(10);

      expect(result).toEqual(activities);
    });

    it("uses the default page and limit", async () => {
      const leanMock = jest.fn().mockResolvedValue([]);

      const limitMock = jest.fn().mockReturnValue({
        lean: leanMock,
      });

      const skipMock = jest.fn().mockReturnValue({
        limit: limitMock,
      });

      const sortMock = jest.fn().mockReturnValue({
        skip: skipMock,
      });

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      jest.spyOn(Activity, "find").mockReturnValue({
        populate: populateMock,
      });

      await ActivityService.getTimeline({ user: "user-123" });

      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(20);
    });
  });
});