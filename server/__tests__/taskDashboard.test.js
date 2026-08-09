const mongoose = require("mongoose");
const TaskDashboardService = require("../services/dashboard/taskDashboard.service");
const DemoSeederService = require("../services/seeder/demoSeeder.service");
const Task = require("../models/Task");
const User = require("../models/User");
const Project = require("../models/Project");

describe("Dashboard and Seeder Services", () => {
  let user;

  beforeAll(async () => {
    // Setup test DB connection
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/teamflow_test");
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});

    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "Member"
    });
  });

  describe("DemoSeederService", () => {
    it("should seed tasks if user has 0 tasks", async () => {
      const result = await DemoSeederService.seedDemoTasksForUser(user._id);
      expect(result).toBe(true);

      const tasks = await Task.find({ assignedTo: user._id });
      expect(tasks.length).toBe(16); // 16 tasks seeded
    });

    it("should NOT seed tasks if user already has tasks", async () => {
      await Task.create({
        title: "Existing Task",
        status: "To Do",
        assignedTo: [user._id],
        createdBy: user._id,
        project: new mongoose.Types.ObjectId()
      });

      const result = await DemoSeederService.seedDemoTasksForUser(user._id);
      expect(result).toBe(false);

      const tasks = await Task.find({ assignedTo: user._id });
      expect(tasks.length).toBe(1); // Still 1 task
    });
  });

  describe("TaskDashboardService", () => {
    it("should correctly group tasks by status and overdue", async () => {
      await DemoSeederService.seedDemoTasksForUser(user._id);

      const dashboard = await TaskDashboardService.getDashboard(user._id, { limit: 10 });
      
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.assigned).toBeGreaterThan(0);
      expect(dashboard.summary.pending).toBeGreaterThan(0);
      expect(dashboard.summary.completed).toBeGreaterThan(0);

      // Verify that groups arrays match the summary counts
      expect(dashboard.groups.assigned.length).toBe(dashboard.summary.assigned);
    });
  });
});
