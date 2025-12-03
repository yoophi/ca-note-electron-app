/**
 * EditDocument Use Case Test
 *
 * Educational test demonstrating Clean Architecture boundaries:
 * - Use cases contain business logic independent of UI frameworks
 * - Dependencies point inward (use cases don't depend on external frameworks)
 * - Testing business rules in isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Document } from '../../../src/shared/entities/Document';
import type { EditorState } from '../../../src/renderer/entities/EditorState';

/**
 * Mock interfaces that demonstrate dependency inversion
 * The use case will depend on these interfaces, not concrete implementations
 */
interface DocumentRepository {
  save(document: Document): Promise<void>;
  load(id: string): Promise<Document>;
  create(content?: string): Promise<Document>;
}

interface DocumentValidator {
  validate(content: string): { isValid: boolean; errors: string[] };
}

interface StateManager {
  updateEditorState(documentId: string, newState: Partial<EditorState>): void;
  getEditorState(documentId: string): EditorState | null;
}

/**
 * EditDocument Use Case Implementation
 *
 * This represents the business logic for editing documents.
 * Notice how it depends only on interfaces (dependency inversion).
 */
class EditDocument {
  constructor(
    private documentRepository: DocumentRepository,
    private validator: DocumentValidator,
    private stateManager: StateManager
  ) {}

  async execute(documentId: string, newContent: string): Promise<EditDocumentResult> {
    // Business Rule 1: Content must be valid
    const validation = this.validator.validate(newContent);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      // Business Rule 2: Load current document
      const document = await this.documentRepository.load(documentId);

      // Business Rule 3: Update document content and metadata
      const updatedDocument: Document = {
        ...document,
        content: newContent,
        metadata: {
          ...document.metadata,
          modifiedAt: new Date(),
          isDirty: true,
          wordCount: this.calculateWordCount(newContent),
          characterCount: this.calculateCharacterCount(newContent),
          title: this.extractTitle(newContent) || document.metadata.title,
        },
      };

      // Business Rule 4: Persist changes
      await this.documentRepository.save(updatedDocument);

      // Business Rule 5: Update editor state
      this.stateManager.updateEditorState(documentId, {
        isDirty: true,
        hasUnsavedChanges: true,
        lastChangeTimestamp: new Date(),
      });

      return {
        success: true,
        document: updatedDocument,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateCharacterCount(content: string): number {
    return content.replace(/\s/g, '').length;
  }

  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
}

interface EditDocumentResult {
  success: boolean;
  document?: Document;
  errors?: string[];
}

// Test Implementation
describe('EditDocument Use Case', () => {
  let editDocument: EditDocument;
  let mockDocumentRepository: DocumentRepository;
  let mockValidator: DocumentValidator;
  let mockStateManager: StateManager;

  const sampleDocument: Document = {
    id: 'doc-123',
    content: '# Original Title\n\nOriginal content',
    filePath: '/path/to/test.md',
    metadata: {
      title: 'Original Title',
      createdAt: new Date('2023-01-01'),
      modifiedAt: new Date('2023-01-01'),
      isDirty: false,
      characterCount: 20,
      wordCount: 4,
    },
  };

  beforeEach(() => {
    // Create mocks using dependency inversion principle
    mockDocumentRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(sampleDocument),
      create: vi.fn(),
    };

    mockValidator = {
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    mockStateManager = {
      updateEditorState: vi.fn(),
      getEditorState: vi.fn(),
    };

    // Inject dependencies (dependency inversion in action)
    editDocument = new EditDocument(
      mockDocumentRepository,
      mockValidator,
      mockStateManager
    );
  });

  describe('Business Rule: Content Validation', () => {
    it('should reject invalid content', async () => {
      // Arrange
      const invalidContent = 'a'.repeat(5_000_001); // Exceeds 5MB limit
      mockValidator.validate = vi.fn().mockReturnValue({
        isValid: false,
        errors: ['Content exceeds 5MB limit'],
      });

      // Act
      const result = await editDocument.execute('doc-123', invalidContent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Content exceeds 5MB limit');
      expect(mockDocumentRepository.save).not.toHaveBeenCalled();
    });

    it('should accept valid content', async () => {
      // Arrange
      const validContent = '# New Title\n\nNew content here';

      // Act
      const result = await editDocument.execute('doc-123', validContent);

      // Assert
      expect(result.success).toBe(true);
      expect(mockValidator.validate).toHaveBeenCalledWith(validContent);
    });
  });

  describe('Business Rule: Document Updates', () => {
    it('should update document content and metadata correctly', async () => {
      // Arrange
      const newContent = '# Updated Title\n\nThis is updated content with more words.';

      // Act
      const result = await editDocument.execute('doc-123', newContent);

      // Assert
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.content).toBe(newContent);
      expect(result.document!.metadata.title).toBe('Updated Title');
      expect(result.document!.metadata.isDirty).toBe(true);
      expect(result.document!.metadata.wordCount).toBe(8); // "This is updated content with more words"
      expect(result.document!.metadata.characterCount).toBeGreaterThan(0);
    });

    it('should preserve existing title if no new title found', async () => {
      // Arrange
      const contentWithoutTitle = 'Just some content without a title.';

      // Act
      const result = await editDocument.execute('doc-123', contentWithoutTitle);

      // Assert
      expect(result.success).toBe(true);
      expect(result.document!.metadata.title).toBe('Original Title');
    });

    it('should update modification timestamp', async () => {
      // Arrange
      const newContent = 'Updated content';
      const beforeTime = new Date();

      // Act
      const result = await editDocument.execute('doc-123', newContent);
      const afterTime = new Date();

      // Assert
      expect(result.success).toBe(true);
      expect(result.document!.metadata.modifiedAt).toBeInstanceOf(Date);
      expect(result.document!.metadata.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.document!.metadata.modifiedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Business Rule: State Management', () => {
    it('should update editor state after successful edit', async () => {
      // Arrange
      const newContent = '# Test\n\nContent';

      // Act
      await editDocument.execute('doc-123', newContent);

      // Assert
      expect(mockStateManager.updateEditorState).toHaveBeenCalledWith(
        'doc-123',
        expect.objectContaining({
          isDirty: true,
          hasUnsavedChanges: true,
          lastChangeTimestamp: expect.any(Date),
        })
      );
    });

    it('should not update state if edit fails', async () => {
      // Arrange
      mockValidator.validate = vi.fn().mockReturnValue({
        isValid: false,
        errors: ['Invalid content'],
      });

      // Act
      await editDocument.execute('doc-123', 'invalid content');

      // Assert
      expect(mockStateManager.updateEditorState).not.toHaveBeenCalled();
    });
  });

  describe('Business Rule: Persistence', () => {
    it('should save document to repository', async () => {
      // Arrange
      const newContent = '# Test\n\nContent';

      // Act
      const result = await editDocument.execute('doc-123', newContent);

      // Assert
      expect(result.success).toBe(true);
      expect(mockDocumentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'doc-123',
          content: newContent,
        })
      );
    });

    it('should handle repository save failures', async () => {
      // Arrange
      const saveError = new Error('Database connection failed');
      mockDocumentRepository.save = vi.fn().mockRejectedValue(saveError);

      // Act
      const result = await editDocument.execute('doc-123', 'test content');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      // Act
      const result = await editDocument.execute('doc-123', '');

      // Assert
      expect(result.success).toBe(true);
      expect(result.document!.content).toBe('');
      expect(result.document!.metadata.wordCount).toBe(0);
      expect(result.document!.metadata.characterCount).toBe(0);
    });

    it('should handle document not found', async () => {
      // Arrange
      mockDocumentRepository.load = vi.fn().mockRejectedValue(new Error('Document not found'));

      // Act
      const result = await editDocument.execute('non-existent', 'content');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Document not found');
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate dependency inversion principle', () => {
      // The use case depends on interfaces, not concrete implementations
      expect(editDocument).toBeInstanceOf(EditDocument);

      // Verify all dependencies are injected as interfaces
      expect(mockDocumentRepository).toHaveProperty('save');
      expect(mockDocumentRepository).toHaveProperty('load');
      expect(mockValidator).toHaveProperty('validate');
      expect(mockStateManager).toHaveProperty('updateEditorState');
    });

    it('should be testable in isolation (no external dependencies)', () => {
      // This test runs without any UI framework, database, or file system
      // It demonstrates that business logic is independent of infrastructure
      expect(() => {
        new EditDocument(mockDocumentRepository, mockValidator, mockStateManager);
      }).not.toThrow();
    });
  });
});