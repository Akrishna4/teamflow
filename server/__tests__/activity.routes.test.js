const request = require("supertest");
const createTestApp = require("./helpers/createTestApp");

const ActivityService = require("../services/activity/activity.service");

const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  authHeader,
} = require("./helpers/testHelpers");

describe("Activity Routes", () => {
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

  describe("GET /api/v1/activity", () => {
    it("returns activity timeline with default pagination", async () => {
      const timeline = [
        {
          _id: "activity-1",
          action: "task.created",
          entityModel: "Task",
          entityId: "task-1",
        },
      ];

      jest
        .spyOn(ActivityService, "getTimeline")
        .mockResolvedValue(timeline);

      const res = await request(app)
        .get("/api/v1/activity")
        .set("Authorization", authHeader(token));

      expect(res.status).toBe(200);

      expect(ActivityService.getTimeline).toHaveBeenCalledWith(
        {},
        1,
        20
      );

      expect(res.body.data).toEqual(timeline);
    });

    it("applies all supported query filters", async () => {
      jest
        .spyOn(ActivityService, "getTimeline")
        .mockResolvedValue([]);

      const res = await request(app)
        .get(
          "/api/v1/activity?entityModel=Task&entityId=task-123&action=task.created&page=2&limit=10"
        )
        .set("Authorization", authHeader(token));

      expect(res.status).toBe(200);

      expect(ActivityService.getTimeline).toHaveBeenCalledWith(
        {
          entityModel: "Task",
          entityId: "task-123",
          action: "task.created",
        },
        2,
        10
      );
    });

    it("applies individual query filters correctly", async () => {
      jest
        .spyOn(ActivityService, "getTimeline")
        .mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/activity?entityModel=Task")
        .set("Authorization", authHeader(token));

      expect(res.status).toBe(200);

      expect(ActivityService.getTimeline).toHaveBeenCalledWith(
        {
          entityModel: "Task",
        },
        1,
        20
      );
    });

    it("uses fallback pagination for invalid pagination values", async () => {
      jest
        .spyOn(ActivityService, "getTimeline")
        .mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/activity?page=invalid&limit=invalid")
        .set("Authorization", authHeader(token));

      expect(res.status).toBe(200);

      expect(ActivityService.getTimeline).toHaveBeenCalledWith(
        {},
        1,
        20
      );
    });

    it("returns 401 without authentication", async () => {
      const res = await request(app).get("/api/v1/activity");

      expect(res.status).toBe(401);
    });

    it("passes service errors to the error handler", async () => {
      jest
        .spyOn(ActivityService, "getTimeline")
        .mockRejectedValue(new Error("Database failure"));

      const res = await request(app)
        .get("/api/v1/activity")
        .set("Authorization", authHeader(token));

      expect(res.status).toBe(500);
    });
  });
});