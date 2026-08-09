const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, 'Invalid hex color code'],
    },
  },
  { timestamps: true }
);

/**
 * 1. Ensure label names are unique within a project.
 * 2. Optimize fetching all labels for a project.
 */
labelSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);
