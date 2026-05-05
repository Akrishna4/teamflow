const Project = require("../models/Project");
const User = require("../models/User");

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks");
    res.status(200).json({ projects });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks");
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.status(200).json({ project });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const project = await Project.create({
      name,
      description,
      members: members || [],
      createdBy: req.user._id,
    });

    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { $push: { projects: project._id } }
      );
    }

    res.status(201).json({ project });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("members", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ project });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
