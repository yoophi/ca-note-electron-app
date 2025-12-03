/**
 * FileSystemReference Entity - Main Process
 *
 * Represents a reference to a file on the file system with metadata
 * and operations for file status tracking and validation.
 */

import { promises as fs, constants as fsConstants } from 'fs';
import { basename, dirname, extname, resolve } from 'path';

export type FilePath = string;

export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export interface FileSystemReference {
  path: FilePath;
  permissions: FilePermissions;
  lastModified: Date;
  size: number;
  exists: boolean;
}

/**
 * FileSystemReference entity with file operations
 */
export class FileSystemReference implements FileSystemReference {
  public readonly path: FilePath;
  public permissions: FilePermissions;
  public lastModified: Date;
  public size: number;
  public exists: boolean;

  constructor(
    path: FilePath,
    permissions: FilePermissions,
    lastModified: Date,
    size: number,
    exists: boolean
  ) {
    this.path = resolve(path); // Normalize path
    this.permissions = { ...permissions };
    this.lastModified = new Date(lastModified);
    this.size = size;
    this.exists = exists;
  }

  /**
   * Get the filename without extension
   */
  getBaseName(): string {
    return basename(this.path, this.getExtension());
  }

  /**
   * Get the filename with extension
   */
  getFileName(): string {
    return basename(this.path);
  }

  /**
   * Get the file extension
   */
  getExtension(): string {
    return extname(this.path);
  }

  /**
   * Get the directory path
   */
  getDirectory(): string {
    return dirname(this.path);
  }

  /**
   * Check if file is a markdown file
   */
  isMarkdownFile(): boolean {
    return this.getExtension().toLowerCase() === '.md';
  }

  /**
   * Check if file can be read
   */
  canRead(): boolean {
    return this.exists && this.permissions.readable;
  }

  /**
   * Check if file can be written
   */
  canWrite(): boolean {
    return this.permissions.writable;
  }

  /**
   * Check if file is too large for processing
   */
  isLargeFile(threshold: number = 5_000_000): boolean {
    return this.size > threshold;
  }

  /**
   * Update file metadata from current file system state
   */
  async refresh(): Promise<void> {
    try {
      const stats = await fs.stat(this.path);
      const permissions = await this.checkPermissions();

      this.lastModified = stats.mtime;
      this.size = stats.size;
      this.exists = true;
      this.permissions = permissions;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.exists = false;
        this.permissions = { readable: false, writable: false, executable: false };
      } else {
        throw new Error(`Failed to refresh file metadata: ${error.message}`);
      }
    }
  }

  /**
   * Check current file permissions
   */
  private async checkPermissions(): Promise<FilePermissions> {
    try {
      await fs.access(this.path, fsConstants.F_OK);
      const [readable, writable, executable] = await Promise.allSettled([
        fs.access(this.path, fsConstants.R_OK),
        fs.access(this.path, fsConstants.W_OK),
        fs.access(this.path, fsConstants.X_OK),
      ]);

      return {
        readable: readable.status === 'fulfilled',
        writable: writable.status === 'fulfilled',
        executable: executable.status === 'fulfilled',
      };
    } catch {
      return { readable: false, writable: false, executable: false };
    }
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): FileSystemReference {
    return {
      path: this.path,
      permissions: { ...this.permissions },
      lastModified: new Date(this.lastModified),
      size: this.size,
      exists: this.exists,
    };
  }

  /**
   * Create FileSystemReference from plain object
   */
  static fromPlainObject(data: FileSystemReference): FileSystemReference {
    return new FileSystemReference(
      data.path,
      data.permissions,
      data.lastModified,
      data.size,
      data.exists
    );
  }

  /**
   * Create FileSystemReference from file path (async)
   */
  static async fromPath(path: FilePath): Promise<FileSystemReference> {
    const normalizedPath = resolve(path);

    try {
      const stats = await fs.stat(normalizedPath);
      const permissions = await FileSystemReference.prototype.checkPermissions.call(
        { path: normalizedPath }
      );

      return new FileSystemReference(
        normalizedPath,
        permissions,
        stats.mtime,
        stats.size,
        true
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create reference with default values
        return new FileSystemReference(
          normalizedPath,
          { readable: false, writable: false, executable: false },
          new Date(),
          0,
          false
        );
      } else {
        throw new Error(`Failed to create FileSystemReference: ${error.message}`);
      }
    }
  }
}

/**
 * FileSystem validation and utility functions
 */
export class FileSystemUtils {
  /**
   * Validate file path for security and compatibility
   */
  static validatePath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    // Prevent directory traversal
    if (path.includes('..')) {
      throw new Error('Path contains directory traversal');
    }

    // Check path length (Windows compatibility)
    if (path.length > 260) {
      throw new Error('Path too long (max 260 characters)');
    }

    // Validate markdown file extension
    if (!path.toLowerCase().endsWith('.md')) {
      throw new Error('Path must point to a markdown file (.md extension)');
    }
  }

  /**
   * Check if directory exists and create if needed
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Get safe filename from arbitrary string
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase()
      .substring(0, 50); // Limit length
  }

  /**
   * Generate unique filename if file already exists
   */
  static async generateUniqueFileName(basePath: string, fileName: string): Promise<string> {
    const extension = extname(fileName);
    const nameWithoutExt = basename(fileName, extension);
    let counter = 1;
    let uniqueName = fileName;

    while (await this.fileExists(resolve(basePath, uniqueName))) {
      uniqueName = `${nameWithoutExt}-${counter}${extension}`;
      counter++;
    }

    return uniqueName;
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}