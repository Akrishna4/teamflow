const Task = require("../../models/Task");
const { NotFoundError } = require("../../utils/errors");

class TaskService {
  static async getAll() {
    return Task.find()
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("labels");
  }

  static async getByUser(userId) {
    return Task.find({ assignedTo: { $in: [userId] } })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("labels");
  }

  static async getByProject(projectId, filters = {}, sortOption = '-createdAt') {
    const query = { project: projectId };

    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }
    if (filters.priority && filters.priority.length > 0) {
      query.priority = { $in: filters.priority };
    }
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      query.assignedTo = { $in: filters.assignedTo };
    }
    if (filters.labels && filters.labels.length > 0) {
      query.labels = { $in: filters.labels };
    }
    if (filters.createdBy && filters.createdBy.length > 0) {
      query.createdBy = { $in: filters.createdBy };
    }
    if (filters.dueDate === 'overdue') {
      query.dueDate = { $lt: new Date(), $ne: null };
    } else if (filters.dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.dueDate = { $gte: today, $lt: tomorrow };
    } else if (filters.dueDate === 'upcoming') {
      query.dueDate = { $gte: new Date() };
    }

    // Determine sort object based on string option
    let sortObj = { createdAt: -1 }; // default
    if (sortOption === 'dueDate_asc') sortObj = { dueDate: 1, createdAt: -1 };
    else if (sortOption === 'dueDate_desc') sortObj = { dueDate: -1, createdAt: -1 };
    else if (sortOption === 'priority_desc') sortObj = { priority: -1, createdAt: -1 }; // Needs mapping if Priority is Enum string
    else if (sortOption === '-createdAt') sortObj = { createdAt: -1 };
    else if (sortOption === 'createdAt') sortObj = { createdAt: 1 };

    return Task.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("labels")
      .sort(sortObj);
  }

  static async getById(id) {
    return Task.findById(id)
      .populate("project", "name description")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("labels");
  }

  static async create(data) {
    const task = await Task.create(data);
    return Task.findById(task._id)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("labels");
  }

  static async update(id, updateData) {
    const task = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("labels");

    if (!task) throw new NotFoundError("Task not found.");
    return task;
  }

  static async updateStatus(id, status) {
    const task = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("labels");

    if (!task) throw new NotFoundError("Task not found.");
    return task;
  }

  static async delete(id) {
    const task = await Task.findByIdAndDelete(id);
    if (!task) throw new NotFoundError("Task not found.");
    return task;
  }

  static async deleteMany(taskIds) {
    return Task.deleteMany({ _id: { $in: taskIds } });
  }

  static async duplicate(id, userId) {
    const task = await this.getById(id);
    if (!task) throw new NotFoundError("Task not found.");

    const cloneData = {
      title: `${task.title} (Copy)`,
      description: task.description,
      status: "To Do",
      priority: task.priority,
      project: task.project._id,
      assignedTo: task.assignedTo.map((u) => u._id),
      labels: task.labels ? task.labels.map((l) => l._id) : [],
      createdBy: userId,
      // intentionally reset dueDate
    };

    return this.create(cloneData);
  }
}

module.exports = TaskService;
