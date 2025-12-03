/**
 * FileSystemRepository Interface - Main Process
 *
 * Defines the contract for file system operations abstracted from
 * the business logic. This interface enables Clean Architecture
 * dependency inversion for file operations.
 */

import type { FileSystemReference } from '../entities/FileSystemReference';
import type { FilePath } from '../../shared/entities/Document';

/**
 * Repository interface for file system operations
 */
export interface FileSystemRepository {
  /**
   * Read file content as text
   * @param filePath - Path to the file
   * @param encoding - Text encoding (default: utf8)
   * @returns Promise resolving to file content as string
   * @throws Error if file doesn't exist or cannot be read
   */
  readText(filePath: FilePath, encoding?: string): Promise<string>;

  /**
   * Write text content to file
   * @param filePath - Path to write to
   * @param content - Text content to write
   * @param encoding - Text encoding (default: utf8)
   * @returns Promise resolving when write is complete
   * @throws Error if write operation fails
   */
  writeText(filePath: FilePath, content: string, encoding?: string): Promise<void>;

  /**
   * Check if file or directory exists
   * @param path - Path to check
   * @returns Promise resolving to boolean indicating existence
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file system reference with metadata
   * @param filePath - Path to the file
   * @returns Promise resolving to FileSystemReference
   * @throws Error if path doesn't exist or cannot be accessed
   */
  getReference(filePath: FilePath): Promise<FileSystemReference>;

  /**
   * Delete file
   * @param filePath - Path to the file to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if file doesn't exist or cannot be deleted
   */
  deleteFile(filePath: FilePath): Promise<void>;

  /**
   * Copy file to another location
   * @param sourcePath - Source file path
   * @param destinationPath - Destination file path
   * @param overwrite - Whether to overwrite existing file
   * @returns Promise resolving when copy is complete
   * @throws Error if copy operation fails
   */
  copyFile(sourcePath: FilePath, destinationPath: FilePath, overwrite?: boolean): Promise<void>;

  /**
   * Move/rename file
   * @param oldPath - Current file path
   * @param newPath - New file path
   * @returns Promise resolving when move is complete
   * @throws Error if move operation fails
   */
  moveFile(oldPath: FilePath, newPath: FilePath): Promise<void>;

  /**
   * Create directory (with parents if needed)
   * @param dirPath - Directory path to create
   * @returns Promise resolving when directory exists
   * @throws Error if directory creation fails
   */
  createDirectory(dirPath: string): Promise<void>;

  /**
   * List files in directory
   * @param dirPath - Directory path
   * @param pattern - Optional glob pattern to filter files
   * @param recursive - Whether to search subdirectories
   * @returns Promise resolving to array of file paths
   * @throws Error if directory doesn't exist or cannot be accessed
   */
  listFiles(dirPath: string, pattern?: string, recursive?: boolean): Promise<FilePath[]>;

  /**
   * Show native file open dialog
   * @param options - Dialog options
   * @returns Promise resolving to selected file path or null if cancelled
   */
  showOpenDialog(options?: FileDialogOptions): Promise<FilePath | null>;

  /**
   * Show native file save dialog
   * @param options - Dialog options
   * @returns Promise resolving to selected file path or null if cancelled
   */
  showSaveDialog(options?: FileDialogOptions): Promise<FilePath | null>;
}

/**
 * File dialog configuration options
 */
export interface FileDialogOptions {
  /**
   * Default directory to open dialog in
   */
  defaultPath?: string;

  /**
   * Default filename for save dialogs
   */
  defaultName?: string;

  /**
   * File type filters
   */
  filters?: FileFilter[];

  /**
   * Dialog title
   */
  title?: string;

  /**
   * Allow selecting multiple files (open dialog only)
   */
  multiSelect?: boolean;

  /**
   * Show hidden files
   */
  showHiddenFiles?: boolean;
}

/**
 * File type filter for dialogs
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * File watching capabilities
 */
export interface FileWatcher {
  /**
   * Start watching a file or directory for changes
   * @param path - Path to watch
   * @param callback - Function to call on changes
   * @returns Function to stop watching
   */
  watch(path: string, callback: (event: FileSystemEvent) => void): () => void;

  /**
   * Watch multiple paths
   * @param paths - Array of paths to watch
   * @param callback - Function to call on changes
   * @returns Function to stop watching all paths
   */
  watchMultiple(paths: string[], callback: (event: FileSystemEvent) => void): () => void;

  /**
   * Stop watching all files
   */
  stopAll(): void;
}

/**
 * File system event types
 */
export interface FileSystemEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  timestamp: Date;
  stats?: FileStats;
  oldPath?: string; // For rename events
}

/**
 * File statistics
 */
export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isFile: boolean;
  isDirectory: boolean;
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
}

/**
 * Extended file system repository with advanced features
 */
export interface ExtendedFileSystemRepository extends FileSystemRepository {
  /**
   * Get file watcher instance
   */
  getWatcher(): FileWatcher;

  /**
   * Read file in chunks for large files
   * @param filePath - Path to the file
   * @param chunkSize - Size of each chunk in bytes
   * @returns Promise resolving to async iterator of string chunks
   */
  readInChunks(filePath: FilePath, chunkSize?: number): Promise<AsyncIterable<string>>;

  /**
   * Write file in streaming mode for large content
   * @param filePath - Path to write to
   * @param contentStream - Async iterable of content chunks
   * @returns Promise resolving when write is complete
   */
  writeStream(filePath: FilePath, contentStream: AsyncIterable<string>): Promise<void>;

  /**
   * Get detailed file statistics
   * @param path - Path to analyze
   * @returns Promise resolving to detailed file stats
   */
  getStats(path: string): Promise<FileStats>;

  /**
   * Search for files by content
   * @param dirPath - Directory to search in
   * @param searchTerm - Text to search for
   * @param options - Search options
   * @returns Promise resolving to array of file paths containing the term
   */
  searchInFiles(dirPath: string, searchTerm: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Create atomic backup of file
   * @param filePath - File to backup
   * @param backupDir - Backup directory
   * @returns Promise resolving to backup file path
   */
  createBackup(filePath: FilePath, backupDir?: string): Promise<FilePath>;

  /**
   * Restore file from backup
   * @param backupPath - Backup file path
   * @param originalPath - Original file path to restore to
   * @returns Promise resolving when restore is complete
   */
  restoreBackup(backupPath: FilePath, originalPath: FilePath): Promise<void>;

  /**
   * Get disk space information
   * @param path - Path to check (file or directory)
   * @returns Promise resolving to disk space info
   */
  getDiskSpace(path: string): Promise<DiskSpaceInfo>;
}

/**
 * Search options for content search
 */
export interface SearchOptions {
  /**
   * Case sensitive search
   */
  caseSensitive?: boolean;

  /**
   * Use regular expressions
   */
  useRegex?: boolean;

  /**
   * Include file content in results
   */
  includeContent?: boolean;

  /**
   * Maximum number of results
   */
  maxResults?: number;

  /**
   * File extensions to include
   */
  includeExtensions?: string[];

  /**
   * File extensions to exclude
   */
  excludeExtensions?: string[];

  /**
   * Search subdirectories
   */
  recursive?: boolean;
}

/**
 * Search result with match information
 */
export interface SearchResult {
  filePath: FilePath;
  matches: SearchMatch[];
  totalMatches: number;
}

/**
 * Individual search match
 */
export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  matchText: string;
}

/**
 * Disk space information
 */
export interface DiskSpaceInfo {
  total: number; // Total space in bytes
  used: number; // Used space in bytes
  free: number; // Free space in bytes
  percentUsed: number; // Percentage used (0-100)
}

/**
 * File system repository configuration
 */
export interface FileSystemRepositoryConfig {
  /**
   * Default text encoding
   */
  defaultEncoding?: string;

  /**
   * Maximum file size for operations (bytes)
   */
  maxFileSize?: number;

  /**
   * Chunk size for large file operations (bytes)
   */
  chunkSize?: number;

  /**
   * Enable file watching
   */
  enableWatching?: boolean;

  /**
   * Temporary directory for operations
   */
  tempDirectory?: string;

  /**
   * Backup directory
   */
  backupDirectory?: string;

  /**
   * Maximum number of backups to keep per file
   */
  maxBackupsPerFile?: number;

  /**
   * Enable automatic cleanup of old backups
   */
  autoCleanupBackups?: boolean;
}

/**
 * Repository error types for better error handling
 */
export class FileSystemRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: FileSystemErrorCode,
    public readonly path?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileSystemRepositoryError';
  }
}

export enum FileSystemErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  DISK_FULL = 'DISK_FULL',
  PATH_TOO_LONG = 'PATH_TOO_LONG',
  INVALID_PATH = 'INVALID_PATH',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  CONCURRENT_ACCESS = 'CONCURRENT_ACCESS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Factory interface for creating file system repository instances
 */
export interface FileSystemRepositoryFactory {
  /**
   * Create a new file system repository instance
   * @param config - Repository configuration
   * @returns Configured repository instance
   */
  create(config?: FileSystemRepositoryConfig): FileSystemRepository;

  /**
   * Create an extended repository instance with advanced features
   * @param config - Repository configuration
   * @returns Extended repository instance
   */
  createExtended(config?: FileSystemRepositoryConfig): ExtendedFileSystemRepository;
}