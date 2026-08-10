const ProjectService = require("../services/project/project.service");
const Project = require("../models/Project");
const User = require("../models/User");
const { NotFoundError } = require("../utils/errors");

describe("ProjectService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getById", () => {
    it("returns a project when it exists", async () => {
      const project = {
        _id: "project-1",
        name: "Test Project",
      };

      const populateTasks = jest.fn().mockResolvedValue(project);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateTasks,
      });
      const populateMembers = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });

      jest.spyOn(Project, "findById").mockReturnValue({
        populate: populateMembers,
      });

      const result = await ProjectService.getById("project-1");

      expect(Project.findById).toHaveBeenCalledWith("project-1");
      expect(result).toEqual(project);
    });

    it("throws NotFoundError when project does not exist", async () => {
      const populateTasks = jest.fn().mockResolvedValue(null);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateTasks,
      });
      const populateMembers = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });

      jest.spyOn(Project, "findById").mockReturnValue({
        populate: populateMembers,
      });

      await expect(
        ProjectService.getById("missing-project")
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("create", () => {
    it("creates a project without members", async () => {
      const createdProject = {
        _id: "project-1",
      };

      jest.spyOn(Project, "create").mockResolvedValue(createdProject);

      const finalProject = {
        _id: "project-1",
        name: "Test Project",
      };

      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(finalProject),
      });

      jest.spyOn(Project, "findById").mockReturnValue({
        populate: populateCreatedBy,
      });

      const result = await ProjectService.create(
        {
          name: "Test Project",
          description: "Description",
        },
        "user-1"
      );

      expect(Project.create).toHaveBeenCalledWith({
        name: "Test Project",
        description: "Description",
        members: [],
        createdBy: "user-1",
      });

      jest.spyOn(User, "updateMany").mockResolvedValue({});
      expect(result).toEqual(finalProject);
    });

    it("creates a project and syncs members to User.projects", async () => {
      const createdProject = {
        _id: "project-1",
      };

      jest.spyOn(Project, "create").mockResolvedValue(createdProject);
      jest.spyOn(User, "updateMany").mockResolvedValue({});

      const finalProject = {
        _id: "project-1",
        name: "Team Project",
      };

      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(finalProject),
      });

      jest.spyOn(Project, "findById").mockReturnValue({
        populate: populateCreatedBy,
      });

      const members = ["user-1", "user-2"];

      const result = await ProjectService.create(
        {
          name: "Team Project",
          description: "Team project",
          members,
        },
        "admin-1"
      );

      expect(User.updateMany).toHaveBeenCalledWith(
        { _id: { $in: members } },
        { $addToSet: { projects: "project-1" } }
      );

      expect(result).toEqual(finalProject);
    });
  });

  describe("update", () => {
    it("throws NotFoundError when project does not exist", async () => {
      jest.spyOn(Project, "findById").mockResolvedValue(null);

      await expect(
        ProjectService.update("missing-project", {
          name: "Updated",
        })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("adds new members to User.projects", async () => {
      const project = {
        _id: "project-1",
        members: ["user-1", "user-2"],
      };

      jest.spyOn(Project, "findById").mockResolvedValue(project);
      jest.spyOn(User, "updateMany").mockResolvedValue({});

      const updatedProject = {
        _id: "project-1",
        name: "Updated Project",
      };

      const populateTasks = jest.fn().mockResolvedValue(updatedProject);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateTasks,
      });
      const populateMembers = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });

      jest.spyOn(Project, "findByIdAndUpdate").mockReturnValue({
        populate: populateMembers,
      });

      const result = await ProjectService.update("project-1", {
        members: ["user-1", "user-2", "user-3"],
      });

      expect(User.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["user-3"] } },
        { $addToSet: { projects: "project-1" } }
      );

      expect(result).toEqual(updatedProject);
    });

    it("removes deleted members from User.projects", async () => {
      const project = {
        _id: "project-1",
        members: ["user-1", "user-2"],
      };

      jest.spyOn(Project, "findById").mockResolvedValue(project);
      jest.spyOn(User, "updateMany").mockResolvedValue({});

      const updatedProject = {
        _id: "project-1",
        members: ["user-1"],
      };

      const populateTasks = jest.fn().mockResolvedValue(updatedProject);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateTasks,
      });
      const populateMembers = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });

      jest.spyOn(Project, "findByIdAndUpdate").mockReturnValue({
        populate: populateMembers,
      });

      const result = await ProjectService.update("project-1", {
        members: ["user-1"],
      });

      expect(User.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["user-2"] } },
        { $pull: { projects: "project-1" } }
      );

      expect(result).toEqual(updatedProject);
    });

    it("adds and removes members when membership changes", async () => {
      const project = {
        _id: "project-1",
        members: ["user-1", "user-2"],
      };

      jest.spyOn(Project, "findById").mockResolvedValue(project);
      jest.spyOn(User, "updateMany").mockResolvedValue({});

      const populateTasks = jest.fn().mockResolvedValue({
        _id: "project-1",
        members: ["user-1", "user-3"],
      });

      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateTasks,
      });

      const populateMembers = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });

      jest.spyOn(Project, "findByIdAndUpdate").mockReturnValue({
        populate: populateMembers,
      });

      await ProjectService.update("project-1", {
        members: ["user-1", "user-3"],
      });

      expect(User.updateMany).toHaveBeenCalledTimes(2);

      expect(User.updateMany).toHaveBeenNthCalledWith(
        1,
        { _id: { $in: ["user-3"] } },
        { $addToSet: { projects: "project-1" } }
      );

      expect(User.updateMany).toHaveBeenNthCalledWith(
        2,
        { _id: { $in: ["user-2"] } },
        { $pull: { projects: "project-1" } }
      );
    });
  });

  describe("delete", () => {
    it("deletes an existing project", async () => {
      const project = {
        _id: "project-1",
        name: "Project",
      };

      jest.spyOn(Project, "findByIdAndDelete").mockResolvedValue(project);

      const result = await ProjectService.delete("project-1");

      expect(Project.findByIdAndDelete).toHaveBeenCalledWith("project-1");
      expect(result).toEqual(project);
    });

    it("throws NotFoundError when deleting a missing project", async () => {
      jest.spyOn(Project, "findByIdAndDelete").mockResolvedValue(null);

      await expect(
        ProjectService.delete("missing-project")
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});