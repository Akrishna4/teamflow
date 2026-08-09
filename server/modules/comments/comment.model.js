const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Index analysis:
 * 1. { task, parentComment, createdAt } — covers the primary query:
 *    "fetch paginated top-level comments (parentComment=null) for a task, oldest first"
 *    Also covers reply lookup: { task, parentComment: <id> }
 *
 * 2. { parentComment, createdAt } — covers cascade delete lookup:
 *    Comment.find({ parentComment: commentId }) when deleting a thread
 */
commentSchema.index({ task: 1, parentComment: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
