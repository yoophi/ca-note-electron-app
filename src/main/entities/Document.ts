/**
 * Document Entity - Main Process
 *
 * Main process representation of a Document entity.
 * This extends the shared Document interface with main process specific
 * behavior for file system operations and persistence.
 */

import type { Document as SharedDocument, DocumentId, MarkdownContent, FilePath } from '../../shared/entities/Document';
import { DocumentValidator, DocumentUtils } from '../../shared/entities/Document';

/**
 * Main process Document entity with file system capabilities
 */
export class Document implements SharedDocument {
  public readonly id: DocumentId;
  public content: MarkdownContent;
  public filePath?: FilePath;
  public metadata: SharedDocument['metadata'];

  constructor(document: SharedDocument) {
    DocumentValidator.validateDocumentId(document.id);
    DocumentValidator.validateContent(document.content);

    this.id = document.id;
    this.content = document.content;
    this.filePath = document.filePath;
    this.metadata = { ...document.metadata };
  }

  /**
   * Update document content and refresh metadata
   */
  updateContent(newContent: MarkdownContent): void {
    DocumentValidator.validateContent(newContent);

    this.content = newContent;
    this.metadata = DocumentUtils.updateMetadata(this.metadata, newContent);
  }

  /**
   * Mark document as saved to file system
   */
  markAsSaved(filePath?: FilePath): void {
    if (filePath) {
      this.filePath = filePath;
    }

    this.metadata = {
      ...this.metadata,
      savedAt: new Date(),
      isDirty: false,
    };
  }

  /**
   * Check if document needs to be saved
   */
  isDirty(): boolean {
    return this.metadata.isDirty;
  }

  /**
   * Check if document is associated with a file
   */
  hasFilePath(): boolean {
    return this.filePath !== undefined;
  }

  /**
   * Get the filename from the file path
   */
  getFileName(): string | null {
    if (!this.filePath) {
      return null;
    }

    const pathParts = this.filePath.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || null;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): SharedDocument {
    return {
      id: this.id,
      content: this.content,
      filePath: this.filePath,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Create Document from plain object
   */
  static fromPlainObject(data: SharedDocument): Document {
    return new Document(data);
  }
}

/**
 * Document aggregation and management utilities
 */
export class DocumentService {
  /**
   * Validate file path for document operations
   */
  static validateFilePath(filePath: string): void {
    if (!filePath.endsWith('.md')) {
      throw new Error('File must have .md extension');
    }

    if (filePath.length > 260) {
      throw new Error('File path too long (max 260 characters)');
    }

    // Basic path validation - no directory traversal
    if (filePath.includes('..')) {
      throw new Error('Invalid file path - directory traversal not allowed');
    }
  }

  /**
   * Estimate document size in bytes for large file handling
   */
  static estimateSize(document: Document): number {
    // Rough estimation: 2 bytes per character (UTF-8 average)
    return document.content.length * 2;
  }

  /**
   * Check if document content is suitable for preview generation
   */
  static canGeneratePreview(document: Document): boolean {
    return document.content.length > 0 && document.content.length <= 1_000_000;
  }

  /**
   * Extract first N characters for preview purposes
   */
  static getPreviewContent(document: Document, maxLength: number = 500): string {
    if (document.content.length <= maxLength) {
      return document.content;
    }

    return document.content.substring(0, maxLength) + '...';
  }
}