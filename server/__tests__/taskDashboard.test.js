const mongoose = require("mongoose");
const TaskDashboardService = require("../services/dashboard/taskDashboard.service");
const DemoSeederService = require("../services/seeder/demoSeeder.service");
const Task = require("../models/Task");
const User = require("../models/User");
const Project = require("../models/Project");
require("../modules/labels/label.model");
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} = require("./helpers/testHelpers");

describe("Dashboard and Seeder Services", () => {
  let user;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "Member",
    });
  });

  describe("DemoSeederService", () => {
    it("should seed tasks if user has 0 tasks", async () => {
      const result = await DemoSeederService.seedDemoTasksForUser(user._id);

      expect(result).toBe(true);

      const tasks = await Task.find({ assignedTo: user._id });
      expect(tasks.length).toBe(16);
    });

    it("should NOT seed tasks if user already has tasks", async () => {
      await Task.create({
        title: "Existing Task",
        status: "To Do",
        assignedTo: [user._id],
        createdBy: user._id,
        project: new mongoose.Types.ObjectId(),
      });

      const result = await DemoSeederService.seedDemoTasksForUser(user._id);
      expect(result).toBe(false);

      const tasks = await Task.find({ assignedTo: user._id });
      expect(tasks.length).toBe(1);
    });
  });

  describe("TaskDashboardService", () => {
    it("should correctly group tasks by status and overdue", async () => {
      await DemoSeederService.seedDemoTasksForUser(user._id);
      const dashboard = await TaskDashboardService.getDashboard(user._id, {
        limit: 10,
      });
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.assigned).toBeGreaterThan(0);
      expect(dashboard.summary.pending).toBeGreaterThan(0);
      expect(dashboard.summary.completed).toBeGreaterThan(0);
      expect(dashboard.groups.assigned.length).toBe(
        dashboard.summary.assigned
      );
    });
  });

    describe("_buildBaseQuery", () => {
    it("adds search filter", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        search: "dashboard",
      });

      expect(query).toEqual({
        assignedTo: "user-1",
        $text: { $search: "dashboard" },
      });
    });

    it("adds priority filter from an array", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        priority: ["High", "Medium"],
      });

      expect(query.priority).toEqual({
        $in: ["High", "Medium"],
      });
    });

    it("adds priority filter from a comma-separated string", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        priority: "High,Low",
      });

      expect(query.priority).toEqual({
        $in: ["High", "Low"],
      });
    });

    it("adds project filter", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        project: "project-123",
      });

      expect(query.project).toBe("project-123");
    });

    it("adds label filter from an array", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        label: ["label-1", "label-2"],
      });

      expect(query.labels).toEqual({
        $in: ["label-1", "label-2"],
      });
    });

    it("adds label filter from a comma-separated string", () => {
      const query = TaskDashboardService._buildBaseQuery("user-1", {
        label: "label-1,label-2",
      });

      expect(query.labels).toEqual({
        $in: ["label-1", "label-2"],
      });
    });
  });

  describe("_buildSort", () => {
    it.each([
      ["Oldest", { createdAt: 1 }],
      ["Newest", { createdAt: -1 }],
      ["Priority", { priority: -1, updatedAt: -1 }],
      ["Due Date", { dueDate: 1, updatedAt: -1 }],
      ["Alphabetical", { title: 1 }],
    ])("returns the correct sort for %s", (sortOption, expected) => {
      expect(
        TaskDashboardService._buildSort(sortOption, false)
      ).toEqual(expected);
    });

    it("uses text score sorting when searching", () => {
      expect(
        TaskDashboardService._buildSort(undefined, true)
      ).toEqual({
        score: { $meta: "textScore" },
      });
    });
  });

  describe("_getCategoryTasks", () => {
    it("sets hasMore to true and removes the extra task", async () => {
      const tasks = [
        { _id: "task-1" },
        { _id: "task-2" },
        { _id: "task-3" },
      ];

      const leanMock = jest.fn().mockResolvedValue(tasks);

      const populateCreatedByMock = jest.fn().mockReturnValue({
        lean: leanMock,
      });

      const populateAssignedToMock = jest.fn().mockReturnValue({
        populate: populateCreatedByMock,
      });

      const populateLabelsMock = jest.fn().mockReturnValue({
        populate: populateAssignedToMock,
      });

      const populateProjectMock = jest.fn().mockReturnValue({
        populate: populateLabelsMock,
      });

      const limitMock = jest.fn().mockReturnValue({
        populate: populateProjectMock,
      });

      const skipMock = jest.fn().mockReturnValue({
        limit: limitMock,
      });

      const sortMock = jest.fn().mockReturnValue({
        skip: skipMock,
      });

      const selectMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      jest.spyOn(Task, "find").mockReturnValue({
        select: selectMock,
      });

      const result = await TaskDashboardService._getCategoryTasks(
        { assignedTo: "user-1" },
        { status: "To Do" },
        { updatedAt: -1 },
        0,
        2
      );

      expect(result.hasMore).toBe(true);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]._id).toBe("task-1");
      expect(result.tasks[1]._id).toBe("task-2");
      expect(Task.find).toHaveBeenCalledWith({
        assignedTo: "user-1",
        status: "To Do",
      });
    });
  });
});
