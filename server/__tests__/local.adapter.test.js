const fs = require("fs/promises");
const path = require("path");

const storageAdapter = require("../modules/storage/local.adapter");

describe("LocalStorageAdapter", () => {
  describe("init", () => {
    it("does not create the directory when it already exists", async () => {
      const accessSpy = jest
        .spyOn(fs, "access")
        .mockResolvedValue(undefined);

      const mkdirSpy = jest.spyOn(fs, "mkdir");

      await storageAdapter.init();

      expect(accessSpy).toHaveBeenCalledWith(storageAdapter.uploadDir);
      expect(mkdirSpy).not.toHaveBeenCalled();
    });

    it("creates the upload directory when it does not exist", async () => {
      jest
        .spyOn(fs, "access")
        .mockRejectedValue(new Error("Directory does not exist"));

      const mkdirSpy = jest
        .spyOn(fs, "mkdir")
        .mockResolvedValue(undefined);

      await storageAdapter.init();

      expect(mkdirSpy).toHaveBeenCalledWith(
        storageAdapter.uploadDir,
        { recursive: true }
      );
    });
  });

  describe("saveFile", () => {
    it("returns the filename", async () => {
      const file = {
        filename: "test-file.txt",
      };

      const result = await storageAdapter.saveFile(file);

      expect(result).toBe("test-file.txt");
    });
  });

  describe("deleteFile", () => {
    it("deletes an existing file", async () => {
      const unlinkSpy = jest
        .spyOn(fs, "unlink")
        .mockResolvedValue(undefined);

      await storageAdapter.deleteFile("test-file.txt");

      expect(unlinkSpy).toHaveBeenCalledWith(
        path.resolve(storageAdapter.uploadDir, "test-file.txt")
      );
    });

    it("ignores ENOENT when the file does not exist", async () => {
      const error = new Error("File not found");
      error.code = "ENOENT";

      jest.spyOn(fs, "unlink").mockRejectedValue(error);

      await expect(
        storageAdapter.deleteFile("missing-file.txt")
      ).resolves.toBeUndefined();
    });

    it("logs and rethrows non-ENOENT errors", async () => {
      const error = new Error("Permission denied");
      error.code = "EACCES";

      jest.spyOn(fs, "unlink").mockRejectedValue(error);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        storageAdapter.deleteFile("protected-file.txt")
      ).rejects.toThrow("Permission denied");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("rejects path traversal attempts", async () => {
      const unlinkSpy = jest.spyOn(fs, "unlink");

      await expect(
        storageAdapter.deleteFile("../../etc/passwd")
      ).resolves.toBeUndefined();

      expect(unlinkSpy).toHaveBeenCalled();
    });
  });

  describe("getFilePath", () => {
    it("returns the safe absolute path", () => {
      const result = storageAdapter.getFilePath("test-file.txt");

      expect(result).toBe(
        path.resolve(storageAdapter.uploadDir, "test-file.txt")
      );
    });

    it("strips path components from the filename", () => {
      const result = storageAdapter.getFilePath("../../etc/passwd");

      expect(result).toBe(
        path.resolve(storageAdapter.uploadDir, "passwd")
      );
    });
  });
});