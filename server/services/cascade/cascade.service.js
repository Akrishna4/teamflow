const ProjectService = require("../project/project.service");
const TaskService = require("../task/task.service");
const NotificationService = require("../notification/notification.service");
const User = require("../../models/User");

/**
 * Orchestrator for complex cascade deletion operations.
 * This prevents circular dependencies between entity services.
 */
class CascadeService {
  /**
   * Safely deletes a project and all associated data.
   */
  static async deleteProjectCascade(projectId) {
    const project = await ProjectService.getById(projectId);
    const tasks = await TaskService.getByProject(projectId);
    const taskIds = tasks.map((t) => t._id);

    // 1. Cascade: Delete all Notifications tied to these tasks
    if (taskIds.length > 0) {
      await NotificationService.deleteByTasks(taskIds);
    }

    // 2. Cascade: Delete the tasks themselves
    if (taskIds.length > 0) {
      await TaskService.deleteMany(taskIds);
    }

    // 3. Cascade: Remove project references from User documents
    if (project.members && project.members.length > 0) {
      const memberIds = project.members.map((m) => m._id);
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $pull: { projects: project._id } }
      );
    }

    // 4. Finally, delete the project
    await ProjectService.delete(projectId);

    return project;
  }

  /**
   * Safely deletes a task and all associated data.
   */
  static async deleteTaskCascade(taskId) {
    const task = await TaskService.getById(taskId);
    
    // 1. Cascade: Delete notifications tied to this task
    await NotificationService.deleteByTasks([taskId]);

    // 2. Delete the task itself
    await TaskService.delete(taskId);

    return task;
  }
}

module.exports = CascadeService;
