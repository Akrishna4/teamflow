const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Done"],
      default: "To Do",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    dueDate: {
      type: Date,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    labels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Label",
    }],
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    estimatedEffort: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for Dashboard and Search
taskSchema.index({ assignedTo: 1, status: 1, updatedAt: -1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Task", taskSchema);
