const mongoose = require('mongoose');

const savedViewSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  filters: {
    status: [String],
    priority: [String],
    assignedTo: [mongoose.Schema.Types.ObjectId],
    labels: [mongoose.Schema.Types.ObjectId],
    createdBy: [mongoose.Schema.Types.ObjectId],
    dueDate: String,
  },
  sort: {
    type: String,
    default: '-createdAt'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure users only see their own saved views per project
savedViewSchema.index({ project: 1, user: 1 });

module.exports = mongoose.model('SavedView', savedViewSchema);
