/**
 * EditDocument Use Case - Renderer Process
 *
 * Implements the business logic for editing markdown documents.
 * This use case orchestrates document updates while maintaining
 * Clean Architecture principles by depending on interfaces.
 */

import { Document, type DocumentSnapshot } from '../entities/Document';
import { DocumentValidator } from '../../shared/entities/Document';
import type { DocumentId, MarkdownContent } from '../../shared/entities/Document';

/**
 * Repository interface for document persistence (dependency inversion)
 */
export interface DocumentRepository {
  save(document: Document): Promise<void>;
  load(id: DocumentId): Promise<Document>;
  create(content?: string): Promise<Document>;
}

/**
 * Validation service interface for content validation (dependency inversion)
 */
export interface ContentValidator {
  validate(content: string): ValidationResult;
  sanitize(content: string): string;
}

/**
 * State management interface for editor state (dependency inversion)
 */
export interface EditorStateManager {
  updateEditorState(documentId: DocumentId, updates: EditorStateUpdates): void;
  getEditorState(documentId: DocumentId): EditorStateData | null;
}

/**
 * Undo/Redo management interface
 */
export interface UndoRedoManager {
  saveSnapshot(documentId: DocumentId, snapshot: DocumentSnapshot): void;
  undo(documentId: DocumentId): DocumentSnapshot | null;
  redo(documentId: DocumentId): DocumentSnapshot | null;
  canUndo(documentId: DocumentId): boolean;
  canRedo(documentId: DocumentId): boolean;
  clearHistory(documentId: DocumentId): void;
}

/**
 * Event publisher interface for document events (dependency inversion)
 */
export interface DocumentEventPublisher {
  publishContentChanged(documentId: DocumentId, content: MarkdownContent): void;
  publishDocumentSaved(documentId: DocumentId, filePath?: string): void;
  publishDocumentError(documentId: DocumentId, error: string): void;
}

/**
 * Types for use case inputs and outputs
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface EditorStateUpdates {
  isDirty?: boolean;
  hasUnsavedChanges?: boolean;
  lastChangeTimestamp?: Date;
  cursorPosition?: { line: number; column: number };
  selectionStart?: number;
  selectionEnd?: number;
}

export interface EditorStateData {
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  lastChangeTimestamp: Date;
  cursorPosition: { line: number; column: number };
  selectionStart: number;
  selectionEnd: number;
}

export interface EditDocumentRequest {
  documentId: DocumentId;
  newContent: MarkdownContent;
  cursorPosition?: { line: number; column: number };
  selectionRange?: { start: number; end: number };
  createSnapshot?: boolean;
}

export interface EditDocumentResult {
  success: boolean;
  document?: Document;
  errors?: string[];
  warnings?: string[];
  canUndo?: boolean;
  canRedo?: boolean;
}

/**
 * EditDocument Use Case Implementation
 *
 * This class contains the core business logic for editing documents.
 * It demonstrates Clean Architecture by depending only on interfaces.
 */
export class EditDocument {
  constructor(
    private documentRepository: DocumentRepository,
    private contentValidator: ContentValidator,
    private editorStateManager: EditorStateManager,
    private undoRedoManager: UndoRedoManager,
    private eventPublisher: DocumentEventPublisher
  ) {}

  /**
   * Execute the edit document use case
   */
  async execute(request: EditDocumentRequest): Promise<EditDocumentResult> {
    try {
      // Business Rule 1: Validate input content
      const validation = this.contentValidator.validate(request.newContent);
      if (!validation.isValid) {
        this.eventPublisher.publishDocumentError(request.documentId, validation.errors.join(', '));
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Business Rule 2: Load current document
      const document = await this.documentRepository.load(request.documentId);

      // Business Rule 3: Create snapshot for undo/redo if requested
      if (request.createSnapshot !== false && document.content !== request.newContent) {
        const snapshot = document.createSnapshot();
        this.undoRedoManager.saveSnapshot(request.documentId, snapshot);
      }

      // Business Rule 4: Sanitize content for security
      const sanitizedContent = this.contentValidator.sanitize(request.newContent);

      // Business Rule 5: Update document content
      document.updateContent(sanitizedContent);

      // Business Rule 6: Start editing session if not already editing
      if (!document.isCurrentlyEditing()) {
        document.startEditing();
      }

      // Business Rule 7: Update editor state with cursor/selection info
      const editorStateUpdates: EditorStateUpdates = {
        isDirty: true,
        hasUnsavedChanges: true,
        lastChangeTimestamp: new Date(),
      };

      if (request.cursorPosition) {
        editorStateUpdates.cursorPosition = request.cursorPosition;
      }

      if (request.selectionRange) {
        editorStateUpdates.selectionStart = request.selectionRange.start;
        editorStateUpdates.selectionEnd = request.selectionRange.end;
      }

      this.editorStateManager.updateEditorState(request.documentId, editorStateUpdates);

      // Business Rule 8: Persist document changes
      await this.documentRepository.save(document);

      // Business Rule 9: Clear any previous errors
      document.clearError();

      // Business Rule 10: Publish content changed event
      this.eventPublisher.publishContentChanged(request.documentId, sanitizedContent);

      return {
        success: true,
        document,
        warnings: validation.warnings,
        canUndo: this.undoRedoManager.canUndo(request.documentId),
        canRedo: this.undoRedoManager.canRedo(request.documentId),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Handle error and update document state
      try {
        const document = await this.documentRepository.load(request.documentId);
        document.setError(errorMessage);
        await this.documentRepository.save(document);
      } catch {
        // Ignore secondary errors when handling primary error
      }

      this.eventPublisher.publishDocumentError(request.documentId, errorMessage);

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Undo last edit operation
   */
  async undo(documentId: DocumentId): Promise<EditDocumentResult> {
    try {
      const snapshot = this.undoRedoManager.undo(documentId);
      if (!snapshot) {
        return {
          success: false,
          errors: ['Nothing to undo'],
        };
      }

      const document = await this.documentRepository.load(documentId);
      document.restoreFromSnapshot(snapshot);

      // Update editor state
      this.editorStateManager.updateEditorState(documentId, {
        isDirty: true,
        hasUnsavedChanges: true,
        lastChangeTimestamp: new Date(),
      });

      // Save changes
      await this.documentRepository.save(document);

      // Publish event
      this.eventPublisher.publishContentChanged(documentId, document.content);

      return {
        success: true,
        document,
        canUndo: this.undoRedoManager.canUndo(documentId),
        canRedo: this.undoRedoManager.canRedo(documentId),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Undo failed';
      this.eventPublisher.publishDocumentError(documentId, errorMessage);

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Redo last undone operation
   */
  async redo(documentId: DocumentId): Promise<EditDocumentResult> {
    try {
      const snapshot = this.undoRedoManager.redo(documentId);
      if (!snapshot) {
        return {
          success: false,
          errors: ['Nothing to redo'],
        };
      }

      const document = await this.documentRepository.load(documentId);
      document.restoreFromSnapshot(snapshot);

      // Update editor state
      this.editorStateManager.updateEditorState(documentId, {
        isDirty: true,
        hasUnsavedChanges: true,
        lastChangeTimestamp: new Date(),
      });

      // Save changes
      await this.documentRepository.save(document);

      // Publish event
      this.eventPublisher.publishContentChanged(documentId, document.content);

      return {
        success: true,
        document,
        canUndo: this.undoRedoManager.canUndo(documentId),
        canRedo: this.undoRedoManager.canRedo(documentId),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Redo failed';
      this.eventPublisher.publishDocumentError(documentId, errorMessage);

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Insert text at current cursor position
   */
  async insertText(
    documentId: DocumentId,
    text: string,
    cursorPosition: { line: number; column: number }
  ): Promise<EditDocumentResult> {
    try {
      const document = await this.documentRepository.load(documentId);
      const lines = document.content.split('\n');

      // Ensure we have enough lines
      while (lines.length <= cursorPosition.line) {
        lines.push('');
      }

      // Insert text at cursor position
      const currentLine = lines[cursorPosition.line];
      const beforeCursor = currentLine.substring(0, cursorPosition.column);
      const afterCursor = currentLine.substring(cursorPosition.column);
      lines[cursorPosition.line] = beforeCursor + text + afterCursor;

      const newContent = lines.join('\n');

      // Calculate new cursor position after insertion
      const newCursorPosition = {
        line: cursorPosition.line,
        column: cursorPosition.column + text.length,
      };

      return await this.execute({
        documentId,
        newContent,
        cursorPosition: newCursorPosition,
        createSnapshot: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Insert text failed';
      this.eventPublisher.publishDocumentError(documentId, errorMessage);

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Replace selected text
   */
  async replaceSelection(
    documentId: DocumentId,
    newText: string,
    selectionRange: { start: number; end: number }
  ): Promise<EditDocumentResult> {
    try {
      const document = await this.documentRepository.load(documentId);
      const content = document.content;

      // Replace selected text
      const beforeSelection = content.substring(0, selectionRange.start);
      const afterSelection = content.substring(selectionRange.end);
      const newContent = beforeSelection + newText + afterSelection;

      // Calculate new selection range (cursor at end of inserted text)
      const newCursorPosition = this.getPositionFromOffset(newContent, selectionRange.start + newText.length);

      return await this.execute({
        documentId,
        newContent,
        cursorPosition: newCursorPosition,
        createSnapshot: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Replace selection failed';
      this.eventPublisher.publishDocumentError(documentId, errorMessage);

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Stop editing session
   */
  async stopEditing(documentId: DocumentId): Promise<void> {
    try {
      const document = await this.documentRepository.load(documentId);
      document.stopEditing();
      await this.documentRepository.save(document);

      this.editorStateManager.updateEditorState(documentId, {
        lastChangeTimestamp: new Date(),
      });
    } catch (error) {
      // Log error but don't throw - stopping editing shouldn't fail the operation
      console.error('Failed to stop editing:', error);
    }
  }

  /**
   * Clear undo/redo history for a document
   */
  clearHistory(documentId: DocumentId): void {
    this.undoRedoManager.clearHistory(documentId);
  }

  /**
   * Check if undo is available
   */
  canUndo(documentId: DocumentId): boolean {
    return this.undoRedoManager.canUndo(documentId);
  }

  /**
   * Check if redo is available
   */
  canRedo(documentId: DocumentId): boolean {
    return this.undoRedoManager.canRedo(documentId);
  }

  /**
   * Convert character offset to line/column position
   */
  private getPositionFromOffset(content: string, offset: number): { line: number; column: number } {
    const lines = content.substring(0, offset).split('\n');
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
    };
  }
}

/**
 * Default content validator implementation
 */
export class DefaultContentValidator implements ContentValidator {
  validate(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Use shared document validator
      DocumentValidator.validateContent(content);

      // Additional UI-specific validations
      if (content.length > 1_000_000) { // 1MB warning
        warnings.push('Large document may impact editor performance');
      }

      // Check for potential problematic patterns
      if (content.includes('\0')) {
        errors.push('Content contains null characters');
      }

      // Check for excessively long lines that might cause rendering issues
      const lines = content.split('\n');
      const maxLineLength = 10000;
      const longLines = lines.filter(line => line.length > maxLineLength);
      if (longLines.length > 0) {
        warnings.push(`${longLines.length} line(s) exceed ${maxLineLength} characters`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
      };
    }
  }

  sanitize(content: string): string {
    // Basic sanitization for security
    // Remove null characters
    return content.replace(/\0/g, '');
  }
}

/**
 * Export types for use in adapters layer
 */
export type {
  DocumentRepository,
  ContentValidator,
  EditorStateManager,
  UndoRedoManager,
  DocumentEventPublisher,
  ValidationResult,
  EditorStateUpdates,
  EditorStateData,
  EditDocumentRequest,
  EditDocumentResult,
};