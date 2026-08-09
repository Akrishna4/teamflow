const Task = require("../../models/Task");
const Project = require("../../models/Project");
const User = require("../../models/User");
const { logger } = require("../../modules/shared/logger");

class DemoSeederService {
  /**
   * Automatically seeds realistic software engineering tasks for onboarding.
   * Designed to be idempotent and run asynchronously post-login/registration.
   */
  static async seedDemoTasksForUser(userId) {
    try {
      logger.info({ userId }, "[DemoSeeder] Seeder started");
      
      // 1. Atomic verification and lock: Mark onboardingSeeded as true ONLY if it was false.
      const user = await User.findOneAndUpdate(
        { _id: userId, onboardingSeeded: false },
        { $set: { onboardingSeeded: true } },
        { returnDocument: "after" }
      );
      
      // If user is null, it means onboardingSeeded was already true (or user not found).
      if (!user) {
        logger.info({ userId }, "[DemoSeeder] Atomic lock failed: already seeded or user not found");
        return false;
      }
      
      logger.info({ userId }, "[DemoSeeder] Atomic lock acquired");
      
      // Just to be absolutely safe (e.g. if the flag was missing for an old user), 
      // we still verify if the user has ZERO tasks.
      const taskCount = await Task.countDocuments({ assignedTo: userId });
      logger.info({ userId, taskCount }, "[DemoSeeder] Existing task count");
      if (taskCount > 0) {
        logger.info({ userId }, "[DemoSeeder] User already has tasks, skipping");
        return false; // User already has tasks, skip seeding.
      }

      // 2. Find an existing project they belong to, or create the "TeamFlow Onboarding" project.
      let project = await Project.findOne({ members: userId });
      if (!project) {
        // Fallback: search for a project they created
        project = await Project.findOne({ createdBy: userId });
      }

      if (project) {
        logger.info({ userId, projectId: project._id }, "[DemoSeeder] Project found");
      } else {
        // Create an onboarding project
        project = await Project.create({
          name: "TeamFlow Onboarding",
          description: "A sandbox project created to help you explore TeamFlow's features.",
          members: [userId],
          createdBy: userId,
        });
        logger.info({ userId, projectId: project._id }, "[DemoSeeder] Project created");
      }

      const projectId = project._id;
      
      // Calculate realistic due dates relative to today
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(today); nextMonth.setMonth(nextMonth.getMonth() + 1);

      logger.info({ userId, projectId }, "[DemoSeeder] Preparing demo tasks");
      // 3. Define 16 Realistic Tasks
      const demoTasks = [
        // Welcome / Onboarding (To Do)
        {
          title: "Welcome to TeamFlow 🎉",
          description: "Complete these demo tasks to explore TeamFlow.\n\n• Update a task\n• Complete a task\n• Add comments\n• Upload attachments\n• Try search and filters\n• Explore the dashboard",
          status: "To Do",
          priority: "High",
          dueDate: tomorrow,
          estimatedEffort: 1,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        // To Do
        {
          title: "Optimize MongoDB aggregation pipeline",
          description: "The current dashboard `$facet` query is causing high memory usage on the Atlas cluster. Refactor it into parallel `.find()` cursors.",
          status: "To Do",
          priority: "High",
          dueDate: tomorrow,
          estimatedEffort: 4,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Implement refresh token rotation",
          description: "Current JWT strategy needs improved security. Implement refresh tokens stored in HTTP-only cookies with rotation on reuse.",
          status: "To Do",
          priority: "High",
          dueDate: nextWeek,
          estimatedEffort: 6,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Build responsive dashboard UI",
          description: "The dashboard looks broken on mobile. Convert the grid layout to Flexbox/CSS Grid to support smaller viewports (Tailwind).",
          status: "To Do",
          priority: "Medium",
          dueDate: nextWeek,
          estimatedEffort: 3,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Add Redis caching for user profiles",
          description: "To reduce DB load on initial renders, cache the `/api/users/me` endpoint using Redis.",
          status: "To Do",
          priority: "Medium",
          dueDate: nextMonth,
          estimatedEffort: 5,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Increase Jest test coverage above 90%",
          description: "Several edge cases in the notification service lack coverage. Write unit tests to push coverage past the 90% threshold.",
          status: "To Do",
          priority: "Low",
          dueDate: nextMonth,
          estimatedEffort: 8,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },

        // In Progress
        {
          title: "Fix JWT authentication bug",
          description: "Tokens are expiring prematurely causing unexpected user logouts. Investigate the `expiresIn` config on the server.",
          status: "In Progress",
          priority: "High",
          dueDate: tomorrow, // Soon
          estimatedEffort: 2,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Create reusable modal component",
          description: "We have 4 different modal implementations. Unify them into a single polymorphic React component.",
          status: "In Progress",
          priority: "Medium",
          dueDate: nextWeek,
          estimatedEffort: 4,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Dockerize backend application",
          description: "Create a multi-stage Dockerfile for the Express API and a docker-compose.yml for local development including Mongo.",
          status: "In Progress",
          priority: "Medium",
          dueDate: nextWeek,
          estimatedEffort: 5,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Integrate WebSocket notifications",
          description: "Bind the frontend toast system to the new Socket.IO events for real-time task updates.",
          status: "In Progress",
          priority: "Low",
          dueDate: nextMonth,
          estimatedEffort: 3,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Add loading skeletons",
          description: "Replace the raw text 'Loading...' with animated skeleton loaders in the task lists.",
          status: "In Progress",
          priority: "Low",
          dueDate: nextMonth,
          estimatedEffort: 2,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },

        // Done
        {
          title: "Configure GitHub Actions CI",
          description: "Setup the pipeline to run ESLint, Vitest, and Jest on every pull request to main.",
          status: "Done",
          priority: "High",
          dueDate: yesterday,
          estimatedEffort: 3,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Fix Socket.IO memory leak",
          description: "Clients were not unsubscribing from project rooms upon dismount. Memory leak resolved in `Tasks.jsx` cleanup function.",
          status: "Done",
          priority: "High",
          dueDate: yesterday,
          estimatedEffort: 2,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Add health check endpoint",
          description: "Expose `/api/health` returning DB connection status and uptime for Kubernetes readiness probes.",
          status: "Done",
          priority: "Medium",
          dueDate: yesterday,
          estimatedEffort: 1,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Implement dark mode",
          description: "Introduced Tailwind `dark:` variants across the app layout. Added toggle context.",
          status: "Done",
          priority: "Medium",
          dueDate: yesterday,
          estimatedEffort: 4,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
        {
          title: "Improve API response time",
          description: "Added pagination to the users list API which brought the response time down from 2s to 50ms.",
          status: "Done",
          priority: "Low",
          dueDate: yesterday,
          estimatedEffort: 3,
          project: projectId,
          assignedTo: [userId],
          createdBy: userId,
        },
      ];

      logger.info({ userId, count: demoTasks.length }, "[DemoSeeder] Task.insertMany started");
      // 4. Perform bulk insertion
      await Task.insertMany(demoTasks);
      logger.info({ userId }, "[DemoSeeder] Task.insertMany completed");
      
      logger.info({ userId }, "[DemoSeeder] Seeder completed successfully");
      return true;
    } catch (error) {
      logger.error({ err: error, userId }, "[DemoSeeder] Demo seeding failed");
      throw error; // Re-throw so .catch() in the controller can log the background failure
    }
  }
}

module.exports = DemoSeederService;
