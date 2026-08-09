const CommentService = require('./comment.service');
const ResponseHandler = require('../shared/response.handler');

class CommentController {
  /**
   * GET /api/v1/tasks/:taskId/comments
   * Returns paginated, threaded comments for a task.
   */
  static async getComments(req, res, next) {
    try {
      const { taskId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const { comments, meta } = await CommentService.getCommentsByTask(taskId, page, limit);
      return ResponseHandler.success(res, comments, 'Comments retrieved', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/tasks/:taskId/comments
   * Creates a new comment (top-level or reply).
   */
  static async createComment(req, res, next) {
    try {
      const { taskId } = req.params;
      const { content, parentComment, projectId } = req.body;

      const comment = await CommentService.createComment(
        { task: taskId, author: req.user._id, content, parentComment },
        projectId
      );

      return ResponseHandler.success(res, comment, 'Comment added', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/comments/:commentId
   * Update the content of an existing comment (author only).
   */
  static async updateComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { content, projectId } = req.body;

      const comment = await CommentService.updateComment(
        commentId,
        content,
        { _id: req.user._id, role: req.user.role },
        projectId
      );

      return ResponseHandler.success(res, comment, 'Comment updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/comments/:commentId?projectId=xxx
   * Deletes a comment. Admin can delete any; member can delete their own.
   */
  static async deleteComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { projectId } = req.query;

      const result = await CommentService.deleteComment(
        commentId,
        { _id: req.user._id, role: req.user.role },
        projectId
      );

      return ResponseHandler.success(res, result, 'Comment deleted');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CommentController;
