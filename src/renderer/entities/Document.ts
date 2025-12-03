/**
 * Document Entity - Renderer Process
 *
 * Renderer-specific Document entity that extends the shared Document
 * with UI-specific capabilities and state management.
 */

import type {
  Document as SharedDocument,
  DocumentId,
  MarkdownContent,
  FilePath,
  DocumentMetadata,
} from '../../shared/entities/Document';
import {
  DocumentValidator,
  DocumentUtils,
  DocumentFactory,
} from '../../shared/entities/Document';

/**
 * Extended document metadata for UI state management
 */
export interface RendererDocumentMetadata extends DocumentMetadata {
  // UI-specific state
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  lastEditTimestamp: Date;

  // Display preferences
  isBookmarked: boolean;
  tags: string[];

  // Reading/editing analytics
  readingTime: number; // Estimated reading time in minutes
  editingTime: number; // Total time spent editing in minutes
  openCount: number; // How many times this document was opened

  // UI state for error handling
  hasErrors: boolean;
  lastError?: string;

  // Preview state
  previewScrollPosition: number;
  editorScrollPosition: number;
}

/**
 * Renderer Document entity with UI-specific behavior
 */
export class Document implements SharedDocument {
  public readonly id: DocumentId;
  public content: MarkdownContent;
  public filePath?: FilePath;
  public metadata: RendererDocumentMetadata;

  constructor(document: SharedDocument, uiMetadata?: Partial<RendererDocumentMetadata>) {
    DocumentValidator.validateDocumentId(document.id);
    DocumentValidator.validateContent(document.content);

    this.id = document.id;
    this.content = document.content;
    this.filePath = document.filePath;

    // Merge shared metadata with UI-specific metadata
    this.metadata = {
      ...document.metadata,
      isEditing: false,
      hasUnsavedChanges: false,
      lastEditTimestamp: new Date(),
      isBookmarked: false,
      tags: [],
      readingTime: this.calculateReadingTime(document.content),
      editingTime: 0,
      openCount: 0,
      hasErrors: false,
      previewScrollPosition: 0,
      editorScrollPosition: 0,
      ...uiMetadata,
    };
  }

  /**
   * Update document content with UI state tracking
   */
  updateContent(newContent: MarkdownContent): void {
    DocumentValidator.validateContent(newContent);

    const previousContent = this.content;
    this.content = newContent;

    // Update shared metadata
    const updatedSharedMetadata = DocumentUtils.updateMetadata(
      this.metadata,
      newContent
    );

    // Update UI-specific metadata
    this.metadata = {
      ...this.metadata,
      ...updatedSharedMetadata,
      hasUnsavedChanges: true,
      lastEditTimestamp: new Date(),
      readingTime: this.calculateReadingTime(newContent),
      hasErrors: false,
      lastError: undefined,
    };

    // Track editing activity
    if (previousContent !== newContent) {
      this.incrementEditingTime();
    }
  }

  /**
   * Mark document as saved with optional file path
   */
  markAsSaved(filePath?: FilePath): void {
    if (filePath) {
      this.filePath = filePath;
    }

    this.metadata = {
      ...this.metadata,
      savedAt: new Date(),
      isDirty: false,
      hasUnsavedChanges: false,
    };
  }

  /**
   * Start editing session
   */
  startEditing(): void {
    this.metadata = {
      ...this.metadata,
      isEditing: true,
      lastEditTimestamp: new Date(),
    };
  }

  /**
   * Stop editing session
   */
  stopEditing(): void {
    this.metadata = {
      ...this.metadata,
      isEditing: false,
    };
  }

  /**
   * Update scroll positions for preview and editor synchronization
   */
  updateScrollPositions(editorScrollPosition: number, previewScrollPosition: number): void {
    this.metadata = {
      ...this.metadata,
      editorScrollPosition,
      previewScrollPosition,
    };
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.metadata = {
      ...this.metadata,
      hasErrors: true,
      lastError: error,
    };
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.metadata = {
      ...this.metadata,
      hasErrors: false,
      lastError: undefined,
    };
  }

  /**
   * Toggle bookmark status
   */
  toggleBookmark(): void {
    this.metadata = {
      ...this.metadata,
      isBookmarked: !this.metadata.isBookmarked,
    };
  }

  /**
   * Add tag to document
   */
  addTag(tag: string): void {
    if (!this.metadata.tags.includes(tag)) {
      this.metadata = {
        ...this.metadata,
        tags: [...this.metadata.tags, tag],
      };
    }
  }

  /**
   * Remove tag from document
   */
  removeTag(tag: string): void {
    this.metadata = {
      ...this.metadata,
      tags: this.metadata.tags.filter(t => t !== tag),
    };
  }

  /**
   * Increment open count when document is opened
   */
  incrementOpenCount(): void {
    this.metadata = {
      ...this.metadata,
      openCount: this.metadata.openCount + 1,
    };
  }

  /**
   * Check if document has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.metadata.hasUnsavedChanges || this.metadata.isDirty;
  }

  /**
   * Check if document is associated with a file
   */
  hasFilePath(): boolean {
    return this.filePath !== undefined && this.filePath !== '';
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
   * Get file extension
   */
  getFileExtension(): string | null {
    const fileName = this.getFileName();
    if (!fileName) {
      return null;
    }

    const extensionMatch = fileName.match(/\.([^.]+)$/);
    return extensionMatch ? extensionMatch[1] : null;
  }

  /**
   * Check if document is currently being edited
   */
  isCurrentlyEditing(): boolean {
    return this.metadata.isEditing;
  }

  /**
   * Get estimated reading time in minutes
   */
  getReadingTime(): number {
    return this.metadata.readingTime;
  }

  /**
   * Get formatted reading time string
   */
  getFormattedReadingTime(): string {
    const minutes = this.metadata.readingTime;
    if (minutes < 1) {
      return '< 1 min read';
    }
    return `${Math.round(minutes)} min read`;
  }

  /**
   * Convert to shared document format for IPC
   */
  toSharedDocument(): SharedDocument {
    return {
      id: this.id,
      content: this.content,
      filePath: this.filePath,
      metadata: {
        title: this.metadata.title,
        createdAt: this.metadata.createdAt,
        modifiedAt: this.metadata.modifiedAt,
        savedAt: this.metadata.savedAt,
        isDirty: this.metadata.isDirty,
        characterCount: this.metadata.characterCount,
        wordCount: this.metadata.wordCount,
      },
    };
  }

  /**
   * Create a snapshot for undo/redo functionality
   */
  createSnapshot(): DocumentSnapshot {
    return {
      content: this.content,
      metadata: { ...this.metadata },
      timestamp: new Date(),
    };
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: DocumentSnapshot): void {
    this.content = snapshot.content;
    this.metadata = {
      ...snapshot.metadata,
      lastEditTimestamp: new Date(),
      hasUnsavedChanges: true,
    };
  }

  /**
   * Calculate reading time based on content
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = DocumentUtils.calculateWordCount(content);
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Increment editing time (called when content changes)
   */
  private incrementEditingTime(): void {
    // Increment editing time by 1 minute (simplified for demo)
    this.metadata = {
      ...this.metadata,
      editingTime: this.metadata.editingTime + 1,
    };
  }

  /**
   * Create Document from shared document
   */
  static fromSharedDocument(
    sharedDocument: SharedDocument,
    uiMetadata?: Partial<RendererDocumentMetadata>
  ): Document {
    return new Document(sharedDocument, uiMetadata);
  }
}

/**
 * Document snapshot interface for undo/redo
 */
export interface DocumentSnapshot {
  content: MarkdownContent;
  metadata: RendererDocumentMetadata;
  timestamp: Date;
}

/**
 * Renderer-specific document factory
 */
export class RendererDocumentFactory {
  /**
   * Create new document for renderer with UI metadata
   */
  static createNew(
    initialContent: string = '',
    uiMetadata?: Partial<RendererDocumentMetadata>
  ): Document {
    const sharedDocument = DocumentFactory.createNew(initialContent);
    return Document.fromSharedDocument(sharedDocument, uiMetadata);
  }

  /**
   * Create document from file with UI metadata
   */
  static createFromFile(
    id: DocumentId,
    content: MarkdownContent,
    filePath: FilePath,
    uiMetadata?: Partial<RendererDocumentMetadata>
  ): Document {
    const sharedDocument = DocumentFactory.createFromFile(id, content, filePath);
    return Document.fromSharedDocument(sharedDocument, uiMetadata);
  }

  /**
   * Create document from shared document (for IPC responses)
   */
  static fromSharedDocument(
    sharedDocument: SharedDocument,
    uiMetadata?: Partial<RendererDocumentMetadata>
  ): Document {
    return Document.fromSharedDocument(sharedDocument, uiMetadata);
  }
}

/**
 * Document collection management for renderer
 */
export class DocumentCollection {
  private documents: Map<DocumentId, Document> = new Map();
  private activeDocumentId: DocumentId | null = null;

  /**
   * Add document to collection
   */
  add(document: Document): void {
    this.documents.set(document.id, document);
    document.incrementOpenCount();
  }

  /**
   * Get document by ID
   */
  get(id: DocumentId): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * Remove document from collection
   */
  remove(id: DocumentId): boolean {
    if (this.activeDocumentId === id) {
      this.activeDocumentId = null;
    }
    return this.documents.delete(id);
  }

  /**
   * Set active document
   */
  setActive(id: DocumentId): void {
    if (this.documents.has(id)) {
      this.activeDocumentId = id;
    }
  }

  /**
   * Get active document
   */
  getActive(): Document | null {
    return this.activeDocumentId ? this.documents.get(this.activeDocumentId) || null : null;
  }

  /**
   * Get all documents
   */
  getAll(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get documents with unsaved changes
   */
  getUnsaved(): Document[] {
    return this.getAll().filter(doc => doc.hasUnsavedChanges());
  }

  /**
   * Get bookmarked documents
   */
  getBookmarked(): Document[] {
    return this.getAll().filter(doc => doc.metadata.isBookmarked);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.activeDocumentId = null;
  }

  /**
   * Get collection size
   */
  size(): number {
    return this.documents.size;
  }
}

// Export types for external use
export type { RendererDocumentMetadata, DocumentSnapshot };
export { DocumentValidator, DocumentUtils };