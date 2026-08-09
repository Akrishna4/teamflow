const Project = require("../../models/Project");
const User = require("../../models/User");
const { NotFoundError } = require("../../utils/errors");

class ProjectService {
  static async getAll() {
    return Project.find()
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks");
  }

  static async getById(id) {
    const project = await Project.findById(id)
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks");
    if (!project) throw new NotFoundError("Project not found.");
    return project;
  }

  static async create(data, userId) {
    const { name, description, members } = data;

    const project = await Project.create({
      name,
      description,
      members: members || [],
      createdBy: userId,
    });

    // Sync User.projects
    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { $addToSet: { projects: project._id } }
      );
    }

    return Project.findById(project._id)
      .populate("members", "name email role")
      .populate("createdBy", "name email");
  }

  static async update(id, updateData) {
    const project = await Project.findById(id);
    if (!project) throw new NotFoundError("Project not found.");

    // Compute diff and sync User.projects if members are updated
    if (updateData.members !== undefined) {
      const oldMemberIds = project.members.map((m) => m.toString());
      const newMemberIds = updateData.members.map((m) => m.toString());

      const addedMembers = newMemberIds.filter(
        (mId) => !oldMemberIds.includes(mId)
      );
      const removedMembers = oldMemberIds.filter(
        (mId) => !newMemberIds.includes(mId)
      );

      if (addedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: addedMembers } },
          { $addToSet: { projects: project._id } }
        );
      }

      if (removedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: removedMembers } },
          { $pull: { projects: project._id } }
        );
      }
    }

    return Project.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .populate("tasks"); // ensure tasks virtual is returned
  }

  static async delete(id) {
    const project = await Project.findByIdAndDelete(id);
    if (!project) throw new NotFoundError("Project not found.");
    return project;
  }
}

module.exports = ProjectService;
