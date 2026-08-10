const TaskService = require("../services/task/task.service");
const Task = require("../models/Task");
const { NotFoundError } = require("../utils/errors");

describe("TaskService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getAll", () => {
    it("returns all tasks with populated fields", async () => {
        const tasks = [{ _id: "task-1", title: "Task 1" }];

        const query = {
            populate: jest.fn(),
        };

        query.populate.mockReturnValue(query);
        query.populate
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(Promise.resolve(tasks));

        jest.spyOn(Task, "find").mockReturnValue(query);

        const result = await TaskService.getAll();

        expect(Task.find).toHaveBeenCalled();
        expect(query.populate).toHaveBeenCalledWith(
            "project",
            "name"
        );
        expect(query.populate).toHaveBeenCalledWith(
            "assignedTo",
            "name email"
        );
        expect(query.populate).toHaveBeenCalledWith(
            "createdBy",
            "name email"
        );
        expect(query.populate).toHaveBeenCalledWith("labels");

        expect(result).toEqual(tasks);
    });
    });

  describe("getByUser", () => {
    it("returns tasks assigned to the user", async () => {
      const tasks = [{ _id: "task-1" }];

      const populateLabels = jest.fn().mockResolvedValue(tasks);
      const populateAssignedTo = jest.fn().mockReturnValue({
        populate: populateLabels,
      });
      const populateProject = jest.fn().mockReturnValue({
        populate: populateAssignedTo,
      });

      jest.spyOn(Task, "find").mockReturnValue({
        populate: populateProject,
      });

      const result = await TaskService.getByUser("user-1");

      expect(Task.find).toHaveBeenCalledWith({
        assignedTo: { $in: ["user-1"] },
      });
      expect(result).toEqual(tasks);
    });
  });

  describe("getByProject", () => {
    const createQueryMock = () => {
      const query = {
        populate: jest.fn(),
        sort: jest.fn(),
      };

      query.populate.mockReturnValue(query);
      query.sort.mockResolvedValue([]);

      return query;
    };

    it("applies all supported filters", async () => {
      const query = createQueryMock();
      jest.spyOn(Task, "find").mockReturnValue(query);

      await TaskService.getByProject(
        "project-1",
        {
          status: ["To Do"],
          priority: ["High"],
          assignedTo: ["user-1"],
          labels: ["label-1"],
          createdBy: ["user-2"],
        },
        "-createdAt"
      );

      expect(Task.find).toHaveBeenCalledWith({
        project: "project-1",
        status: { $in: ["To Do"] },
        priority: { $in: ["High"] },
        assignedTo: { $in: ["user-1"] },
        labels: { $in: ["label-1"] },
        createdBy: { $in: ["user-2"] },
      });

      expect(query.sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    it("applies overdue due-date filter", async () => {
      const query = createQueryMock();
      jest.spyOn(Task, "find").mockReturnValue(query);

      await TaskService.getByProject("project-1", {
        dueDate: "overdue",
      });

      const findArg = Task.find.mock.calls[0][0];

      expect(findArg.project).toBe("project-1");
      expect(findArg.dueDate).toEqual(
        expect.objectContaining({
          $lt: expect.any(Date),
          $ne: null,
        })
      );
    });

    it("applies today due-date filter", async () => {
      const query = createQueryMock();
      jest.spyOn(Task, "find").mockReturnValue(query);

      await TaskService.getByProject("project-1", {
        dueDate: "today",
      });

      const findArg = Task.find.mock.calls[0][0];

      expect(findArg.project).toBe("project-1");
      expect(findArg.dueDate.$gte).toBeInstanceOf(Date);
      expect(findArg.dueDate.$lt).toBeInstanceOf(Date);
      expect(findArg.dueDate.$lt.getTime()).toBeGreaterThan(
        findArg.dueDate.$gte.getTime()
      );
    });

    it("applies upcoming due-date filter", async () => {
      const query = createQueryMock();
      jest.spyOn(Task, "find").mockReturnValue(query);

      await TaskService.getByProject("project-1", {
        dueDate: "upcoming",
      });

      const findArg = Task.find.mock.calls[0][0];

      expect(findArg.project).toBe("project-1");
      expect(findArg.dueDate).toEqual({
        $gte: expect.any(Date),
      });
    });

    it.each([
      ["dueDate_asc", { dueDate: 1, createdAt: -1 }],
      ["dueDate_desc", { dueDate: -1, createdAt: -1 }],
      ["priority_desc", { priority: -1, createdAt: -1 }],
      ["-createdAt", { createdAt: -1 }],
      ["createdAt", { createdAt: 1 }],
    ])("uses the correct sort for %s", async (sortOption, expectedSort) => {
      const query = createQueryMock();
      jest.spyOn(Task, "find").mockReturnValue(query);

      await TaskService.getByProject(
        "project-1",
        {},
        sortOption
      );

      expect(query.sort).toHaveBeenCalledWith(expectedSort);
    });
  });

  describe("getById", () => {
    it("returns a task by id", async () => {
      const task = { _id: "task-1" };

      const populateLabels = jest.fn().mockResolvedValue(task);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateLabels,
      });
      const populateAssignedTo = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });
      const populateProject = jest.fn().mockReturnValue({
        populate: populateAssignedTo,
      });

      jest.spyOn(Task, "findById").mockReturnValue({
        populate: populateProject,
      });

      const result = await TaskService.getById("task-1");

      expect(Task.findById).toHaveBeenCalledWith("task-1");
      expect(result).toEqual(task);
    });
  });

  describe("create", () => {
    it("creates and returns a populated task", async () => {
      const createdTask = { _id: "task-1" };
      const finalTask = { _id: "task-1", title: "Created Task" };

      jest.spyOn(Task, "create").mockResolvedValue(createdTask);

      const populateLabels = jest.fn().mockResolvedValue(finalTask);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateLabels,
      });
      const populateAssignedTo = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });
      const populateProject = jest.fn().mockReturnValue({
        populate: populateAssignedTo,
      });

      jest.spyOn(Task, "findById").mockReturnValue({
        populate: populateProject,
      });

      const data = {
        title: "Created Task",
        project: "project-1",
        createdBy: "user-1",
      };

      const result = await TaskService.create(data);

      expect(Task.create).toHaveBeenCalledWith(data);
      expect(Task.findById).toHaveBeenCalledWith(createdTask._id);
      expect(result).toEqual(finalTask);
    });
  });

  describe("update", () => {
    it("updates an existing task", async () => {
      const task = { _id: "task-1", title: "Updated" };

      const populateLabels = jest.fn().mockResolvedValue(task);
      const populateCreatedBy = jest.fn().mockReturnValue({
        populate: populateLabels,
      });
      const populateAssignedTo = jest.fn().mockReturnValue({
        populate: populateCreatedBy,
      });
      const populateProject = jest.fn().mockReturnValue({
        populate: populateAssignedTo,
      });

      jest.spyOn(Task, "findByIdAndUpdate").mockReturnValue({
        populate: populateProject,
      });

      const result = await TaskService.update("task-1", {
        title: "Updated",
      });

      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        "task-1",
        { title: "Updated" },
        {
          new: true,
          runValidators: true,
        }
      );

      expect(result).toEqual(task);
    });

    it("throws NotFoundError when updating a missing task", async () => {
        const query = {
            populate: jest.fn(),
        };

        query.populate.mockReturnValue(query);

        query.populate
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(Promise.resolve(null));

        jest.spyOn(Task, "findByIdAndUpdate").mockReturnValue(query);

        await expect(
            TaskService.update("missing-task", {
            title: "Updated",
            })
        ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

  describe("updateStatus", () => {
    it("updates task status", async () => {
      const task = { _id: "task-1", status: "Done" };

      const populateLabels = jest.fn().mockResolvedValue(task);
      const populateAssignedTo = jest.fn().mockReturnValue({
        populate: populateLabels,
      });
      const populateProject = jest.fn().mockReturnValue({
        populate: populateAssignedTo,
      });

      jest.spyOn(Task, "findByIdAndUpdate").mockReturnValue({
        populate: populateProject,
      });

      const result = await TaskService.updateStatus(
        "task-1",
        "Done"
      );

      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        "task-1",
        { status: "Done" },
        {
          new: true,
          runValidators: true,
        }
      );

      expect(result).toEqual(task);
    });

    it("throws NotFoundError when updating status of a missing task", async () => {
        const query = {
            populate: jest.fn(),
        };

        query.populate.mockReturnValue(query);

        query.populate
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(query)
            .mockReturnValueOnce(Promise.resolve(null));

        jest.spyOn(Task, "findByIdAndUpdate").mockReturnValue(query);

        await expect(
            TaskService.updateStatus("missing-task", "Done")
        ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

  describe("delete", () => {
    it("deletes an existing task", async () => {
      const task = { _id: "task-1" };

      jest.spyOn(Task, "findByIdAndDelete").mockResolvedValue(task);

      const result = await TaskService.delete("task-1");

      expect(Task.findByIdAndDelete).toHaveBeenCalledWith("task-1");
      expect(result).toEqual(task);
    });

    it("throws NotFoundError when deleting a missing task", async () => {
      jest.spyOn(Task, "findByIdAndDelete").mockResolvedValue(null);

      await expect(
        TaskService.delete("missing-task")
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("deleteMany", () => {
    it("deletes multiple tasks", async () => {
      const result = { deletedCount: 2 };

      jest.spyOn(Task, "deleteMany").mockResolvedValue(result);

      const taskIds = ["task-1", "task-2"];

      const response = await TaskService.deleteMany(taskIds);

      expect(Task.deleteMany).toHaveBeenCalledWith({
        _id: {
          $in: taskIds,
        },
      });

      expect(response).toEqual(result);
    });
  });

  describe("duplicate", () => {
    it("throws NotFoundError when source task does not exist", async () => {
      jest.spyOn(TaskService, "getById").mockResolvedValue(null);

      await expect(
        TaskService.duplicate("missing-task", "user-1")
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("duplicates a task and resets its status", async () => {
      const sourceTask = {
        _id: "task-1",
        title: "Original Task",
        description: "Description",
        priority: "High",
        project: {
          _id: "project-1",
        },
        assignedTo: [
          { _id: "user-1" },
          { _id: "user-2" },
        ],
        labels: [
          { _id: "label-1" },
          { _id: "label-2" },
        ],
      };

      const clonedTask = {
        _id: "task-2",
        title: "Original Task (Copy)",
      };

      jest
        .spyOn(TaskService, "getById")
        .mockResolvedValue(sourceTask);

      jest
        .spyOn(TaskService, "create")
        .mockResolvedValue(clonedTask);

      const result = await TaskService.duplicate(
        "task-1",
        "user-3"
      );

      expect(TaskService.create).toHaveBeenCalledWith({
        title: "Original Task (Copy)",
        description: "Description",
        status: "To Do",
        priority: "High",
        project: "project-1",
        assignedTo: ["user-1", "user-2"],
        labels: ["label-1", "label-2"],
        createdBy: "user-3",
      });

      expect(result).toEqual(clonedTask);
    });

    it("duplicates a task without labels", async () => {
      const sourceTask = {
        _id: "task-1",
        title: "Original Task",
        description: "Description",
        priority: "Medium",
        project: {
          _id: "project-1",
        },
        assignedTo: [],
        labels: null,
      };

      jest
        .spyOn(TaskService, "getById")
        .mockResolvedValue(sourceTask);

      jest
        .spyOn(TaskService, "create")
        .mockResolvedValue({
          _id: "task-2",
        });

      await TaskService.duplicate("task-1", "user-2");

      expect(TaskService.create).toHaveBeenCalledWith({
        title: "Original Task (Copy)",
        description: "Description",
        status: "To Do",
        priority: "Medium",
        project: "project-1",
        assignedTo: [],
        labels: [],
        createdBy: "user-2",
      });
    });
  });
});