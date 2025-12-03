/**
 * DocumentRepository Interface - Main Process
 *
 * Defines the contract for document persistence and retrieval operations.
 * This interface follows Clean Architecture principles by abstracting
 * the data access layer from business logic.
 */

import type { Document } from '../entities/Document';
import type { DocumentId, FilePath } from '../../shared/entities/Document';

/**
 * Repository interface for Document persistence operations
 */
export interface DocumentRepository {
  /**
   * Save document to persistent storage
   * @param document - Document to save
   * @param filePath - Optional file path (if omitted, shows save dialog)
   * @returns Promise resolving to the saved file path
   * @throws Error if save operation fails
   */
  save(document: Document, filePath?: FilePath): Promise<FilePath>;

  /**
   * Load document from file system
   * @param filePath - Path to the file to load
   * @returns Promise resolving to the loaded document
   * @throws Error if file doesn't exist or cannot be read
   */
  load(filePath: FilePath): Promise<Document>;

  /**
   * Create new document with optional content
   * @param initialContent - Optional initial markdown content
   * @returns Promise resolving to the new document
   * @throws Error if document creation fails
   */
  create(initialContent?: string): Promise<Document>;

  /**
   * Check if file exists at given path
   * @param filePath - Path to check
   * @returns Promise resolving to boolean indicating existence
   */
  exists(filePath: FilePath): Promise<boolean>;

  /**
   * Delete document from file system
   * @param filePath - Path to the file to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if file doesn't exist or cannot be deleted
   */
  delete(filePath: FilePath): Promise<void>;

  /**
   * Get document metadata without loading full content
   * @param filePath - Path to the file
   * @returns Promise resolving to basic document information
   * @throws Error if file doesn't exist or cannot be accessed
   */
  getMetadata(filePath: FilePath): Promise<DocumentMetadata>;

  /**
   * List all markdown files in a directory
   * @param directoryPath - Directory to search
   * @param recursive - Whether to search subdirectories
   * @returns Promise resolving to array of file paths
   * @throws Error if directory doesn't exist or cannot be accessed
   */
  listMarkdownFiles(directoryPath: string, recursive?: boolean): Promise<FilePath[]>;

  /**
   * Backup document to a backup location
   * @param document - Document to backup
   * @param backupPath - Optional backup path
   * @returns Promise resolving to backup file path
   * @throws Error if backup operation fails
   */
  backup(document: Document, backupPath?: string): Promise<FilePath>;

  /**
   * Validate file path for document operations
   * @param filePath - Path to validate
   * @throws Error if path is invalid
   */
  validateFilePath(filePath: FilePath): void;
}

/**
 * Document metadata for lightweight operations
 */
export interface DocumentMetadata {
  filePath: FilePath;
  fileName: string;
  size: number;
  lastModified: Date;
  created: Date;
  isReadOnly: boolean;
  encoding: string;
}

/**
 * Search criteria for document queries
 */
export interface DocumentSearchCriteria {
  /**
   * Text to search for in document content
   */
  contentSearch?: string;

  /**
   * Pattern to match in file names
   */
  fileNamePattern?: string;

  /**
   * Minimum file size in bytes
   */
  minSize?: number;

  /**
   * Maximum file size in bytes
   */
  maxSize?: number;

  /**
   * Documents modified after this date
   */
  modifiedAfter?: Date;

  /**
   * Documents modified before this date
   */
  modifiedBefore?: Date;

  /**
   * Include only files in these directories
   */
  includeDirectories?: string[];

  /**
   * Exclude files from these directories
   */
  excludeDirectories?: string[];
}

/**
 * Extended repository interface with advanced operations
 */
export interface ExtendedDocumentRepository extends DocumentRepository {
  /**
   * Search for documents based on criteria
   * @param criteria - Search criteria
   * @returns Promise resolving to array of matching file paths
   */
  search(criteria: DocumentSearchCriteria): Promise<FilePath[]>;

  /**
   * Get recently accessed documents
   * @param limit - Maximum number of documents to return
   * @returns Promise resolving to array of recently accessed file paths
   */
  getRecentDocuments(limit?: number): Promise<FilePath[]>;

  /**
   * Add document to recent documents list
   * @param filePath - Path of the accessed document
   */
  addToRecent(filePath: FilePath): Promise<void>;

  /**
   * Clear recent documents list
   */
  clearRecent(): Promise<void>;

  /**
   * Watch for external changes to a document
   * @param filePath - Path to watch
   * @param callback - Function to call when file changes
   * @returns Function to stop watching
   */
  watchDocument(filePath: FilePath, callback: (event: FileWatchEvent) => void): () => void;

  /**
   * Auto-save document at regular intervals
   * @param document - Document to auto-save
   * @param intervalMs - Save interval in milliseconds
   * @returns Function to stop auto-saving
   */
  enableAutoSave(document: Document, intervalMs?: number): () => void;
}

/**
 * File watch event types
 */
export interface FileWatchEvent {
  type: 'modified' | 'deleted' | 'renamed';
  filePath: FilePath;
  timestamp: Date;
  details?: {
    oldPath?: FilePath; // For rename events
    size?: number; // For modification events
  };
}

/**
 * Repository configuration options
 */
export interface DocumentRepositoryConfig {
  /**
   * Default directory for new documents
   */
  defaultDirectory?: string;

  /**
   * Enable automatic backups
   */
  autoBackup?: boolean;

  /**
   * Backup directory path
   */
  backupDirectory?: string;

  /**
   * Maximum number of backup files to keep
   */
  maxBackups?: number;

  /**
   * File encoding to use (default: utf8)
   */
  defaultEncoding?: string;

  /**
   * Maximum file size for processing (bytes)
   */
  maxFileSize?: number;

  /**
   * Enable file watching for external changes
   */
  enableFileWatch?: boolean;

  /**
   * Auto-save interval in milliseconds (0 to disable)
   */
  autoSaveInterval?: number;
}

/**
 * Repository error types for better error handling
 */
export class DocumentRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: DocumentErrorCode,
    public readonly filePath?: FilePath,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DocumentRepositoryError';
  }
}

export enum DocumentErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  DISK_FULL = 'DISK_FULL',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  BACKUP_FAILED = 'BACKUP_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Factory interface for creating repository instances
 */
export interface DocumentRepositoryFactory {
  /**
   * Create a new document repository instance
   * @param config - Repository configuration
   * @returns Configured repository instance
   */
  create(config?: DocumentRepositoryConfig): DocumentRepository;

  /**
   * Create an extended repository instance with advanced features
   * @param config - Repository configuration
   * @returns Extended repository instance
   */
  createExtended(config?: DocumentRepositoryConfig): ExtendedDocumentRepository;
}