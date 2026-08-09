const fs = require('fs/promises');
const path = require('path');

/**
 * StorageAdapter interface implementation for Local Storage.
 * In a real enterprise system, this could be swapped with S3Adapter, GCSAdapter, etc.
 */
class LocalStorageAdapter {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  async init() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a file from a temporary buffer/path to permanent storage.
   * Multer normally handles writing the file, so this adapter might just verify it
   * or move it. If using multer.diskStorage, this is a no-op since multer already
   * placed it in `uploads/`.
   */
  async saveFile(file) {
    // Multer saves it to this.uploadDir. We just return the path relative to it.
    return file.filename;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filename) {
    try {
      // Prevent path traversal by resolving against uploadDir and ensuring it stays inside
      const safePath = path.resolve(this.uploadDir, path.basename(filename));
      if (!safePath.startsWith(this.uploadDir)) {
        throw new Error('Path traversal attempt');
      }
      await fs.unlink(safePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Storage error: Failed to delete ${filename}`, err);
        throw err;
      }
    }
  }

  /**
   * Get the absolute path for downloading/streaming
   */
  getFilePath(filename) {
    const safePath = path.resolve(this.uploadDir, path.basename(filename));
    if (!safePath.startsWith(this.uploadDir)) {
      throw new Error('Path traversal attempt');
    }
    return safePath;
  }
}

// Export a singleton instance
const storageAdapter = new LocalStorageAdapter();
storageAdapter.init().catch(console.error);

module.exports = storageAdapter;
