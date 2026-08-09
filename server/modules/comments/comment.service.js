const Comment = require('./comment.model');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const EventBus = require('../shared/event-bus');

class CommentService {
  /**
   * Fetch paginated comments for a task.
   * Top-level comments (parentComment = null) are returned with their direct replies embedded.
   */
  static async getCommentsByTask(taskId, page = 1, limit = 20) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      Comment.find({ task: taskId, parentComment: null })
        .populate('author', 'name email role')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments({ task: taskId, parentComment: null }),
    ]);

    // Attach replies to each top-level comment in a single query
    const topLevelIds = comments.map((c) => c._id);
    const replies = await Comment.find({ parentComment: { $in: topLevelIds } })
      .populate('author', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by parentComment id
    const replyMap = {};
    replies.forEach((r) => {
      const key = r.parentComment.toString();
      if (!replyMap[key]) replyMap[key] = [];
      replyMap[key].push(r);
    });

    const threaded = comments.map((c) => ({
      ...c,
      replies: replyMap[c._id.toString()] || [],
    }));

    return {
      comments: threaded,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Create a new comment (top-level or reply).
   */
  static async createComment({ task, author, content, parentComment }, projectId) {
    // Validate parent exists if provided
    if (parentComment) {
      const parent = await Comment.findById(parentComment).lean();
      if (!parent) throw new NotFoundError('Parent comment not found');
      if (parent.parentComment) {
        // Prevent deeper nesting than 1 level — keep it Slack/Linear-style
        throw new ForbiddenError('Cannot reply to a reply. Only one level of threading is supported.');
      }
    }

    const comment = await Comment.create({ task, author, content, parentComment: parentComment || null });

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email role')
      .lean();

    EventBus.publish('comment.created', {
      entity: 'comment',
      action: 'created',
      actor: author,
      taskId: task,
      projectId,
      payload: populated,
      changes: null,
    });

    return populated;
  }

  /**
   * Update a comment's content. Only the author may edit.
   */
  static async updateComment(commentId, content, user, projectId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    if (comment.author.toString() !== user._id.toString()) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    const oldContent = comment.content;
    comment.content = content;
    comment.edited = true;
    await comment.save();

    const populated = await Comment.findById(commentId)
      .populate('author', 'name email role')
      .lean();

    EventBus.publish('comment.updated', {
      entity: 'comment',
      action: 'updated',
      actor: user._id,
      taskId: comment.task,
      projectId,
      payload: populated,
      changes: { content: { from: oldContent, to: content } },
    });

    return populated;
  }

  /**
   * Delete a comment. Admin can delete any; member can delete their own.
   * Cascades to delete child replies.
   */
  static async deleteComment(commentId, user, projectId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    if (user.role !== 'Admin' && comment.author.toString() !== user._id.toString()) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    const taskId = comment.task;

    await Comment.deleteMany({ parentComment: commentId }); // cascade replies
    await Comment.findByIdAndDelete(commentId);

    EventBus.publish('comment.deleted', {
      entity: 'comment',
      action: 'deleted',
      actor: user._id,
      taskId,
      projectId,
      payload: { _id: commentId, task: taskId },
      changes: null,
    });

    return { _id: commentId, task: taskId };
  }
}

module.exports = CommentService;
