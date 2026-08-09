const Task = require("../../models/Task");

class TaskDashboardService {
  /**
   * Builds the base MongoDB query from filters.
   */
  static _buildBaseQuery(userId, filters) {
    const query = { assignedTo: userId };

    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    
    if (filters.priority && filters.priority.length > 0) {
      query.priority = { $in: Array.isArray(filters.priority) ? filters.priority : filters.priority.split(',') };
    }
    
    if (filters.project) {
      query.project = filters.project;
    }
    
    if (filters.label && filters.label.length > 0) {
      query.labels = { $in: Array.isArray(filters.label) ? filters.label : filters.label.split(',') };
    }
    
    return query;
  }

  /**
   * Determines the sort object based on the option.
   */
  static _buildSort(sortOption, isSearch) {
    let sortObj = { updatedAt: -1 }; // default
    if (isSearch) sortObj = { score: { $meta: "textScore" } };

    if (sortOption === 'Oldest') sortObj = { createdAt: 1 };
    else if (sortOption === 'Newest') sortObj = { createdAt: -1 };
    else if (sortOption === 'Priority') sortObj = { priority: -1, updatedAt: -1 };
    else if (sortOption === 'Due Date') sortObj = { dueDate: 1, updatedAt: -1 };
    else if (sortOption === 'Alphabetical') sortObj = { title: 1 };

    return sortObj;
  }

  /**
   * Helper to execute a paginated query for a specific category.
   */
  static async _getCategoryTasks(baseQuery, categoryFilter, sortObj, skip, limit) {
    const query = { ...baseQuery, ...categoryFilter };
    
    // Request limit + 1 to easily determine hasMore
    const tasks = await Task.find(query)
      .select("_id title description status priority dueDate estimatedEffort project labels assignedTo createdBy createdAt updatedAt")
      .sort(sortObj)
      .skip(skip)
      .limit(limit + 1)
      .populate("project", "name")
      .populate("labels", "name color")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .lean();

    const hasMore = tasks.length > limit;
    if (hasMore) tasks.pop(); // Remove the extra item

    return { tasks, hasMore };
  }

  static async getDashboard(userId, options = {}) {
    const limit = parseInt(options.limit) || 20;
    const page = parseInt(options.page) || 1;
    const skip = (page - 1) * limit;

    const baseQuery = this._buildBaseQuery(userId, options);
    const sortObj = this._buildSort(options.sort, !!options.search);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filters for each category based on business rules
    const assignedFilter = { status: "To Do" };
    const pendingFilter = { status: "In Progress" };
    const completedFilter = { status: "Done" };
    const overdueFilter = { 
      dueDate: { $lt: today }, 
      status: { $ne: "Done" } 
    };

    // If client requested a specific status tab filter, we only fetch that one efficiently, 
    // but the summary counts should probably still reflect everything? 
    // The prompt says "GET /api/tasks/my/dashboard" returning summary, groups, hasMore.
    // To make it fully optimal, we fetch summary counts in parallel with the data groups.
    
    const countPromises = [
      Task.countDocuments({ ...baseQuery, ...assignedFilter }),
      Task.countDocuments({ ...baseQuery, ...pendingFilter }),
      Task.countDocuments({ ...baseQuery, ...overdueFilter }),
      Task.countDocuments({ ...baseQuery, ...completedFilter }),
    ];

    // Parallel fetch of tasks
    const taskPromises = [
      this._getCategoryTasks(baseQuery, assignedFilter, sortObj, skip, limit),
      this._getCategoryTasks(baseQuery, pendingFilter, sortObj, skip, limit),
      this._getCategoryTasks(baseQuery, overdueFilter, sortObj, skip, limit),
      this._getCategoryTasks(baseQuery, completedFilter, sortObj, skip, limit),
    ];

    const [
      assignedCount, pendingCount, overdueCount, completedCount,
      assignedData, pendingData, overdueData, completedData
    ] = await Promise.all([...countPromises, ...taskPromises]);

    return {
      summary: {
        assigned: assignedCount,
        pending: pendingCount,
        overdue: overdueCount,
        completed: completedCount,
      },
      groups: {
        assigned: assignedData.tasks,
        pending: pendingData.tasks,
        overdue: overdueData.tasks,
        completed: completedData.tasks,
      },
      hasMore: {
        assigned: assignedData.hasMore,
        pending: pendingData.hasMore,
        overdue: overdueData.hasMore,
        completed: completedData.hasMore,
      }
    };
  }
}

module.exports = TaskDashboardService;
