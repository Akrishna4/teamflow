const Project = require('../../models/Project');
const Task = require('../../models/Task');
const Comment = require('../comments/comment.model');
const Label = require('../labels/label.model');

class SearchService {
  /**
   * Search globally across Projects, Tasks, Comments, and Labels.
   * Ensures users only see results they have permission to view.
   */
  static async globalSearch(query, user, page = 1, limit = 10) {
    if (!query || query.trim().length === 0) {
      return { projects: [], tasks: [], comments: [], labels: [] };
    }

    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i'); // Case-insensitive
    const skip = (page - 1) * limit;

    // 1. Get accessible projects
    let allowedProjectsQuery = {};
    if (user.role !== 'Admin') {
      allowedProjectsQuery = { members: user._id };
    }
    
    // Find IDs of allowed projects for subsequent queries
    const allowedProjects = await Project.find(allowedProjectsQuery).select('_id');
    const allowedProjectIds = allowedProjects.map(p => p._id);

    // 2. Search Projects
    const projectSearchQuery = {
      ...allowedProjectsQuery,
      $or: [
        { name: regex },
        { description: regex }
      ]
    };
    const projectsPromise = Project.find(projectSearchQuery)
      .select('name description createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    // 3. Search Tasks
    const taskSearchQuery = {
      project: { $in: allowedProjectIds },
      $or: [
        { title: regex },
        { description: regex }
      ]
    };
    const tasksPromise = Task.find(taskSearchQuery)
      .select('title description status priority project')
      .populate('project', 'name')
      .skip(skip)
      .limit(limit)
      .lean();

    // 4. Search Labels
    const labelSearchQuery = {
      project: { $in: allowedProjectIds },
      name: regex
    };
    const labelsPromise = Label.find(labelSearchQuery)
      .populate('project', 'name')
      .skip(skip)
      .limit(limit)
      .lean();

    // 5. Search Comments
    // To search comments efficiently while respecting project permissions,
    // we need to find tasks belonging to allowed projects first, or use an aggregate.
    // Given the constraints, we'll fetch matching comments and then filter by allowed tasks,
    // or fetch allowed task IDs first.
    // Fetching all allowed task IDs might be too large if a project has many tasks.
    // So we use an aggregation pipeline for comments.
    const commentsPromise = Comment.aggregate([
      { $match: { content: regex } },
      { $sort: { createdAt: -1 } },
      { $limit: skip + limit * 5 }, // Fetch a buffer to account for permission filtering
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $match: {
          'taskInfo.project': { $in: allowedProjectIds }
        }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      {
        $project: {
          content: 1,
          createdAt: 1,
          task: {
            _id: '$taskInfo._id',
            title: '$taskInfo.title',
            project: '$taskInfo.project'
          },
          author: {
            _id: '$authorInfo._id',
            name: '$authorInfo.name'
          }
        }
      }
    ]);

    // Execute all queries in parallel
    const [projects, tasks, labels, comments] = await Promise.all([
      projectsPromise,
      tasksPromise,
      labelsPromise,
      commentsPromise
    ]);

    return {
      projects,
      tasks,
      labels,
      comments
    };
  }
}

module.exports = SearchService;
