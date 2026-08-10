const request = require("supertest");
const createTestApp = require("./helpers/createTestApp");

const NotificationService = require("../services/notification/notification.service");
const Notification = require("../models/Notification");
const ActivityService = require("../services/activity/activity.service");

const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  authHeader,
} = require("./helpers/testHelpers");

describe("NotificationService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("creates a notification", async () => {
      const notification = {
        user: "507f1f77bcf86cd799439011",
        message: "Test notification",
        isRead: false,
      };

      const createdNotification = {
        _id: "notification-id",
        ...notification,
      };

      jest
        .spyOn(Notification, "create")
        .mockResolvedValue(createdNotification);

      const result = await NotificationService.create(notification);

      expect(Notification.create).toHaveBeenCalledWith(notification);
      expect(result).toEqual(createdNotification);
    });
  });

  describe("getByUser", () => {
    it("returns notifications for a user with the requested limit", async () => {
      const notifications = [
        { _id: "1", message: "Notification 1" },
        { _id: "2", message: "Notification 2" },
      ];

      const limitMock = jest.fn().mockResolvedValue(notifications);
      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock,
      });

      jest.spyOn(Notification, "find").mockReturnValue({
        sort: sortMock,
      });

      const result = await NotificationService.getByUser("user-id", 10);

      expect(Notification.find).toHaveBeenCalledWith({
        user: "user-id",
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(notifications);
    });

    it("uses the default limit of 50", async () => {
      const limitMock = jest.fn().mockResolvedValue([]);
      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock,
      });

      jest.spyOn(Notification, "find").mockReturnValue({
        sort: sortMock,
      });

      await NotificationService.getByUser("user-id");

      expect(limitMock).toHaveBeenCalledWith(50);
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read for the specified user", async () => {
      const updatedNotification = {
        _id: "notification-id",
        user: "user-id",
        isRead: true,
      };

      jest
        .spyOn(Notification, "findOneAndUpdate")
        .mockResolvedValue(updatedNotification);

      const result = await NotificationService.markAsRead(
        "notification-id",
        "user-id"
      );

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "notification-id",
          user: "user-id",
        },
        {
          isRead: true,
        },
        {
          returnDocument: "after",
        }
      );

      expect(result).toEqual(updatedNotification);
    });

    it("returns null when the notification does not belong to the user", async () => {
      jest
        .spyOn(Notification, "findOneAndUpdate")
        .mockResolvedValue(null);

      const result = await NotificationService.markAsRead(
        "notification-id",
        "wrong-user"
      );

      expect(result).toBeNull();
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications for a user as read", async () => {
      const updateResult = {
        matchedCount: 3,
        modifiedCount: 3,
      };

      jest
        .spyOn(Notification, "updateMany")
        .mockResolvedValue(updateResult);

      const result = await NotificationService.markAllAsRead("user-id");

      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          user: "user-id",
          isRead: false,
        },
        {
          isRead: true,
        }
      );

      expect(result).toEqual(updateResult);
    });
  });

  describe("deleteByTasks", () => {
    it("deletes notifications associated with the specified tasks", async () => {
      const deleteResult = {
        deletedCount: 4,
      };

      jest
        .spyOn(Notification, "deleteMany")
        .mockResolvedValue(deleteResult);

      const taskIds = ["task-1", "task-2"];

      const result = await NotificationService.deleteByTasks(taskIds);

      expect(Notification.deleteMany).toHaveBeenCalledWith({
        task: {
          $in: taskIds,
        },
      });

      expect(result).toEqual(deleteResult);
    });

    it("handles an empty task list", async () => {
      jest
        .spyOn(Notification, "deleteMany")
        .mockResolvedValue({
          deletedCount: 0,
        });

      const result = await NotificationService.deleteByTasks([]);

      expect(Notification.deleteMany).toHaveBeenCalledWith({
        task: {
          $in: [],
        },
      });

      expect(result.deletedCount).toBe(0);
    });
  });

  describe("NotificationController", () => {
    let app;
    let user;
    let token;

    beforeAll(async () => {
        await connectTestDB();
        app = createTestApp();
    });

    beforeEach(async () => {
        await clearTestDB();

        const result = await createTestUser();
        user = result.user;
        token = result.token;
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("GET /api/notifications", () => {
        it("returns notifications for the authenticated user", async () => {
            const notifications = [
                {
                _id: "notification-1",
                user: user._id,
                message: "You have a new task",
                isRead: false,
                },
            ];

            jest
                .spyOn(NotificationService, "getByUser")
                .mockResolvedValue(notifications);

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", authHeader(token));

            expect(res.status).toBe(200);
            expect(res.body.notifications).toEqual(
                JSON.parse(JSON.stringify(notifications))
            );
            expect(NotificationService.getByUser).toHaveBeenCalledWith(
                user._id
            );
        });

        it("returns 401 without authentication", async () => {
        const res = await request(app).get("/api/notifications");

        expect(res.status).toBe(401);
        });
    });

    describe("PUT /api/notifications/:id/read", () => {
        it("marks a notification as read", async () => {
            const notification = {
                _id: "notification-1",
                user: user._id,
                message: "You have a new task",
                isRead: true,
            };

            jest
                .spyOn(NotificationService, "markAsRead")
                .mockResolvedValue(notification);

            jest
                .spyOn(ActivityService, "log")
                .mockImplementation(() => {});

            const res = await request(app)
                .put("/api/notifications/notification-1/read")
                .set("Authorization", authHeader(token));

            expect(res.status).toBe(200);
            expect(res.body.notification).toEqual(
                JSON.parse(JSON.stringify(notification))
            );

            expect(NotificationService.markAsRead).toHaveBeenCalledWith(
                "notification-1",
                user._id
            );

            expect(ActivityService.log).toHaveBeenCalled();
        });

        it("returns 404 when notification does not exist", async () => {
            jest
                .spyOn(NotificationService, "markAsRead")
                .mockResolvedValue(null);

            const res = await request(app)
                .put("/api/notifications/notification-1/read")
                .set("Authorization", authHeader(token));

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Notification not found");
        });
    });

    describe("PUT /api/notifications/mark-all-read", () => {
        it("marks all notifications as read", async () => {
            jest
                .spyOn(NotificationService, "markAllAsRead")
                .mockResolvedValue({
                matchedCount: 3,
                modifiedCount: 3,
                });

            const res = await request(app)
                .put("/api/notifications/mark-all-read")
                .set("Authorization", authHeader(token));

            expect(res.status).toBe(200);

            expect(res.body.message).toBe(
                "All notifications marked as read."
            );

            expect(NotificationService.markAllAsRead).toHaveBeenCalledWith(
                user._id
            );
        });
    });
    });
});