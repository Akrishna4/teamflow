const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Index: fetch all checklists for a task ordered by display order.
 */
checklistSchema.index({ task: 1, order: 1 });

module.exports = mongoose.model('Checklist', checklistSchema);
