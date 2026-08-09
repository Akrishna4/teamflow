const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Checklist',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Indexes:
 * 1. { checklist, order } — primary query: fetch items for a checklist in display order
 * 2. { checklist, completed } — for progress aggregation
 */
checklistItemSchema.index({ checklist: 1, order: 1 });
checklistItemSchema.index({ checklist: 1, completed: 1 });

module.exports = mongoose.model('ChecklistItem', checklistItemSchema);
