const CommentService = require("../modules/comments/comment.service");
const Comment = require("../modules/comments/comment.model");
const EventBus = require("../modules/shared/event-bus");
const { NotFoundError, ForbiddenError } = require("../utils/errors");

describe("CommentService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getCommentsByTask", () => {
    it("returns top-level comments with their replies grouped correctly", async () => {
      const comments = [
        {
          _id: "comment-1",
          task: "task-1",
          parentComment: null,
        },
        {
          _id: "comment-2",
          task: "task-1",
          parentComment: null,
        },
      ];

      const replies = [
        {
          _id: "reply-1",
          parentComment: {
            toString: () => "comment-1",
          },
        },
        {
          _id: "reply-2",
          parentComment: {
            toString: () => "comment-1",
          },
        },
      ];

      const topLevelLean = jest.fn().mockResolvedValue(comments);
      const topLevelLimit = jest.fn().mockReturnValue({
        lean: topLevelLean,
      });
      const topLevelSkip = jest.fn().mockReturnValue({
        limit: topLevelLimit,
      });
      const topLevelSort = jest.fn().mockReturnValue({
        skip: topLevelSkip,
      });
      const topLevelPopulate = jest.fn().mockReturnValue({
        sort: topLevelSort,
      });

      const replyLean = jest.fn().mockResolvedValue(replies);
      const replySort = jest.fn().mockReturnValue({
        lean: replyLean,
      });
      const replyPopulate = jest.fn().mockReturnValue({
        sort: replySort,
      });

      jest
        .spyOn(Comment, "find")
        .mockReturnValueOnce({
          populate: topLevelPopulate,
        })
        .mockReturnValueOnce({
          populate: replyPopulate,
        });

      jest.spyOn(Comment, "countDocuments").mockResolvedValue(2);

      const result = await CommentService.getCommentsByTask(
        "task-1",
        1,
        20
      );

      expect(result.comments).toHaveLength(2);

      expect(result.comments[0].replies).toHaveLength(2);
      expect(result.comments[1].replies).toHaveLength(0);

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("normalizes invalid page and excessive limit", async () => {
      const topLevelLean = jest.fn().mockResolvedValue([]);
      const topLevelLimit = jest.fn().mockReturnValue({
        lean: topLevelLean,
      });
      const topLevelSkip = jest.fn().mockReturnValue({
        limit: topLevelLimit,
      });
      const topLevelSort = jest.fn().mockReturnValue({
        skip: topLevelSkip,
      });
      const topLevelPopulate = jest.fn().mockReturnValue({
        sort: topLevelSort,
      });

      const replyLean = jest.fn().mockResolvedValue([]);
      const replySort = jest.fn().mockReturnValue({
        lean: replyLean,
      });
      const replyPopulate = jest.fn().mockReturnValue({
        sort: replySort,
      });

      jest
        .spyOn(Comment, "find")
        .mockReturnValueOnce({
          populate: topLevelPopulate,
        })
        .mockReturnValueOnce({
          populate: replyPopulate,
        });

      jest.spyOn(Comment, "countDocuments").mockResolvedValue(0);

      const result = await CommentService.getCommentsByTask(
        "task-1",
        0,
        500
      );

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(100);
      expect(topLevelSkip).toHaveBeenCalledWith(0);
      expect(topLevelLimit).toHaveBeenCalledWith(100);
    });
  });

  describe("createComment", () => {
    it("rejects when the parent comment does not exist", async () => {
      jest.spyOn(Comment, "findById").mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(Comment, "create");

      await expect(
        CommentService.createComment(
          {
            task: "task-1",
            author: "user-1",
            content: "Reply",
            parentComment: "missing-parent",
          },
          "project-1"
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(Comment.create).not.toHaveBeenCalled();
    });

    it("rejects replying to another reply", async () => {
      jest.spyOn(Comment, "findById").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "parent-reply",
          parentComment: "original-comment",
        }),
      });

      jest.spyOn(Comment, "create");

      await expect(
        CommentService.createComment(
          {
            task: "task-1",
            author: "user-1",
            content: "Nested reply",
            parentComment: "parent-reply",
          },
          "project-1"
        )
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(Comment.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    it("prevents a non-admin from deleting another user's comment", async () => {
      jest.spyOn(Comment, "findById").mockResolvedValue({
        _id: "comment-1",
        task: "task-1",
        author: {
          toString: () => "owner-1",
        },
      });

      jest.spyOn(Comment, "deleteMany");
      jest.spyOn(Comment, "findByIdAndDelete");

      await expect(
        CommentService.deleteComment(
          "comment-1",
          {
            _id: "other-user",
            role: "Member",
          },
          "project-1"
        )
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(Comment.deleteMany).not.toHaveBeenCalled();
      expect(Comment.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("allows an admin to delete another user's comment", async () => {
      jest.spyOn(Comment, "findById").mockResolvedValue({
        _id: "comment-1",
        task: "task-1",
        author: {
          toString: () => "owner-1",
        },
      });

      jest.spyOn(Comment, "deleteMany").mockResolvedValue({
        deletedCount: 2,
      });

      jest.spyOn(Comment, "findByIdAndDelete").mockResolvedValue({
        _id: "comment-1",
      });

      jest.spyOn(EventBus, "publish").mockImplementation(() => {});

      const result = await CommentService.deleteComment(
        "comment-1",
        {
          _id: "admin-1",
          role: "Admin",
        },
        "project-1"
      );

      expect(result).toEqual({
        _id: "comment-1",
        task: "task-1",
      });

      expect(Comment.deleteMany).toHaveBeenCalledWith({
        parentComment: "comment-1",
      });

      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith(
        "comment-1"
      );

      expect(EventBus.publish).toHaveBeenCalledWith(
        "comment.deleted",
        expect.objectContaining({
          actor: "admin-1",
          taskId: "task-1",
          projectId: "project-1",
        })
      );
    });
  });
});