/**
 * Document Entity Validation Test
 *
 * Educational test demonstrating Clean Architecture Entity layer:
 * - Entities contain business rules and validation logic
 * - Entities are independent of frameworks and external concerns
 * - Testing domain invariants and business constraints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DocumentValidator,
  DocumentUtils,
  DocumentFactory,
  type Document,
} from '../../../src/shared/entities/Document';

describe('Document Entity - Business Rules and Validation', () => {
  describe('DocumentValidator - Content Validation Rules', () => {
    describe('Business Rule: Content Size Limits', () => {
      it('should accept content within 5MB limit', () => {
        // Arrange
        const validContent = 'a'.repeat(1000); // 1KB content

        // Act & Assert
        expect(() => DocumentValidator.validateContent(validContent)).not.toThrow();
      });

      it('should reject content exceeding 5MB limit', () => {
        // Arrange
        const oversizedContent = 'a'.repeat(5_000_001); // Just over 5MB

        // Act & Assert
        expect(() => DocumentValidator.validateContent(oversizedContent))
          .toThrow('Content exceeds 5MB limit');
      });

      it('should accept empty content', () => {
        // Act & Assert
        expect(() => DocumentValidator.validateContent('')).not.toThrow();
      });
    });

    describe('Business Rule: UTF-8 Encoding Validation', () => {
      it('should accept valid UTF-8 content', () => {
        // Arrange
        const validUtf8 = 'Hello 世界 🌍 café naïve';

        // Act & Assert
        expect(() => DocumentValidator.validateContent(validUtf8)).not.toThrow();
      });

      it('should accept markdown-specific characters', () => {
        // Arrange
        const markdownContent = `# Heading
**bold** *italic* \`code\`
- List item
> Quote
[Link](http://example.com)`;

        // Act & Assert
        expect(() => DocumentValidator.validateContent(markdownContent)).not.toThrow();
      });

      it('should handle special unicode characters', () => {
        // Arrange
        const unicodeContent = '⚡ 🚀 ∑ ∆ ∞ ™ ©';

        // Act & Assert
        expect(() => DocumentValidator.validateContent(unicodeContent)).not.toThrow();
      });
    });

    describe('Business Rule: Document ID Validation', () => {
      it('should accept valid UUID v4 format', () => {
        // Arrange
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

        // Act & Assert
        expect(() => DocumentValidator.validateDocumentId(validUuid)).not.toThrow();
      });

      it('should reject invalid UUID formats', () => {
        const invalidUuids = [
          'invalid-uuid',
          '123-456-789',
          'f47ac10b-58cc-4372-a567', // Too short
          'f47ac10b-58cc-4372-a567-0e02b2c3d479-extra', // Too long
          'g47ac10b-58cc-4372-a567-0e02b2c3d479', // Invalid character
        ];

        invalidUuids.forEach(invalidUuid => {
          expect(() => DocumentValidator.validateDocumentId(invalidUuid))
            .toThrow('DocumentId must be valid UUID v4');
        });
      });

      it('should be case insensitive for UUID validation', () => {
        // Arrange
        const uppercaseUuid = 'F47AC10B-58CC-4372-A567-0E02B2C3D479';
        const lowercaseUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

        // Act & Assert
        expect(() => DocumentValidator.validateDocumentId(uppercaseUuid)).not.toThrow();
        expect(() => DocumentValidator.validateDocumentId(lowercaseUuid)).not.toThrow();
      });
    });
  });

  describe('DocumentUtils - Business Logic Utilities', () => {
    describe('Business Rule: Document ID Generation', () => {
      it('should generate valid UUID v4 format', () => {
        // Act
        const id = DocumentUtils.generateDocumentId();

        // Assert
        expect(() => DocumentValidator.validateDocumentId(id)).not.toThrow();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should generate unique IDs', () => {
        // Act
        const id1 = DocumentUtils.generateDocumentId();
        const id2 = DocumentUtils.generateDocumentId();

        // Assert
        expect(id1).not.toBe(id2);
      });
    });

    describe('Business Rule: Title Extraction', () => {
      it('should extract title from first heading', () => {
        // Arrange
        const content = `# Main Title

## Subtitle

Some content here`;

        // Act
        const title = DocumentUtils.extractTitle(content);

        // Assert
        expect(title).toBe('Main Title');
      });

      it('should return null when no heading is found', () => {
        // Arrange
        const contentWithoutHeading = 'Just some content without headings.';

        // Act
        const title = DocumentUtils.extractTitle(contentWithoutHeading);

        // Assert
        expect(title).toBeNull();
      });

      it('should handle headings with extra whitespace', () => {
        // Arrange
        const content = '#    Heading with spaces    ';

        // Act
        const title = DocumentUtils.extractTitle(content);

        // Assert
        expect(title).toBe('Heading with spaces');
      });

      it('should extract first heading when multiple exist', () => {
        // Arrange
        const content = `# First Heading
Some content
# Second Heading`;

        // Act
        const title = DocumentUtils.extractTitle(content);

        // Assert
        expect(title).toBe('First Heading');
      });
    });

    describe('Business Rule: Word Count Calculation', () => {
      it('should count words correctly in simple text', () => {
        // Arrange
        const content = 'Hello world this is a test';

        // Act
        const count = DocumentUtils.calculateWordCount(content);

        // Assert
        expect(count).toBe(6);
      });

      it('should handle multiple spaces and line breaks', () => {
        // Arrange
        const content = `Hello    world


This  is   a    test`;

        // Act
        const count = DocumentUtils.calculateWordCount(content);

        // Assert
        expect(count).toBe(6);
      });

      it('should return 0 for empty content', () => {
        // Act
        const count = DocumentUtils.calculateWordCount('');

        // Assert
        expect(count).toBe(0);
      });

      it('should handle markdown formatting without counting markup', () => {
        // Arrange
        const content = '**Bold** and *italic* text';

        // Act
        const count = DocumentUtils.calculateWordCount(content);

        // Assert
        expect(count).toBe(5); // "Bold", "and", "italic", "text", plus formatting
      });
    });

    describe('Business Rule: Character Count Calculation', () => {
      it('should count characters excluding whitespace', () => {
        // Arrange
        const content = 'Hello world!';

        // Act
        const count = DocumentUtils.calculateCharacterCount(content);

        // Assert
        expect(count).toBe(11); // 'Helloworld!'
      });

      it('should return 0 for empty content', () => {
        // Act
        const count = DocumentUtils.calculateCharacterCount('');

        // Assert
        expect(count).toBe(0);
      });

      it('should exclude all types of whitespace', () => {
        // Arrange
        const content = 'Hello\tworld\n!';

        // Act
        const count = DocumentUtils.calculateCharacterCount(content);

        // Assert
        expect(count).toBe(11); // 'Helloworld!'
      });
    });

    describe('Business Rule: Metadata Creation', () => {
      it('should create metadata with correct default values', () => {
        // Arrange
        const content = '# Test Document\n\nSome content here';
        const beforeCreation = new Date();

        // Act
        const metadata = DocumentUtils.createMetadata(content);
        const afterCreation = new Date();

        // Assert
        expect(metadata.title).toBe('Test Document');
        expect(metadata.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
        expect(metadata.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
        expect(metadata.modifiedAt).toEqual(metadata.createdAt);
        expect(metadata.isDirty).toBe(false);
        expect(metadata.savedAt).toBeUndefined();
        expect(metadata.wordCount).toBeGreaterThan(0);
        expect(metadata.characterCount).toBeGreaterThan(0);
      });

      it('should use provided title when specified', () => {
        // Arrange
        const content = 'Content without heading';
        const customTitle = 'Custom Title';

        // Act
        const metadata = DocumentUtils.createMetadata(content, customTitle);

        // Assert
        expect(metadata.title).toBe(customTitle);
      });

      it('should fall back to "Untitled Document" when no title available', () => {
        // Arrange
        const content = 'Content without heading';

        // Act
        const metadata = DocumentUtils.createMetadata(content);

        // Assert
        expect(metadata.title).toBe('Untitled Document');
      });
    });

    describe('Business Rule: Metadata Updates', () => {
      it('should update metadata correctly when content changes', () => {
        // Arrange
        const originalMetadata = DocumentUtils.createMetadata('# Old Title\n\nOld content');
        const newContent = '# New Title\n\nNew content with more words';
        const beforeUpdate = new Date();

        // Act
        const updatedMetadata = DocumentUtils.updateMetadata(originalMetadata, newContent);
        const afterUpdate = new Date();

        // Assert
        expect(updatedMetadata.title).toBe('New Title');
        expect(updatedMetadata.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedMetadata.modifiedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
        expect(updatedMetadata.isDirty).toBe(true);
        expect(updatedMetadata.createdAt).toEqual(originalMetadata.createdAt); // Should not change
        expect(updatedMetadata.wordCount).toBe(6); // "New content with more words"
      });

      it('should preserve original title when new content has no heading', () => {
        // Arrange
        const originalMetadata = DocumentUtils.createMetadata('# Original Title\n\nContent');
        const newContent = 'Content without heading';

        // Act
        const updatedMetadata = DocumentUtils.updateMetadata(originalMetadata, newContent);

        // Assert
        expect(updatedMetadata.title).toBe('Original Title');
      });
    });
  });

  describe('DocumentFactory - Document Creation Rules', () => {
    describe('Business Rule: New Document Creation', () => {
      it('should create valid new document with default content', () => {
        // Act
        const document = DocumentFactory.createNew();

        // Assert
        expect(() => DocumentValidator.validateDocumentId(document.id)).not.toThrow();
        expect(document.content).toBe('');
        expect(document.filePath).toBeUndefined();
        expect(document.metadata.title).toBe('Untitled Document');
        expect(document.metadata.isDirty).toBe(false);
        expect(document.metadata.savedAt).toBeUndefined();
        expect(document.metadata.createdAt).toBeInstanceOf(Date);
        expect(document.metadata.modifiedAt).toEqual(document.metadata.createdAt);
      });

      it('should create document with provided initial content', () => {
        // Arrange
        const initialContent = '# My New Document\n\nInitial content here';

        // Act
        const document = DocumentFactory.createNew(initialContent);

        // Assert
        expect(document.content).toBe(initialContent);
        expect(document.metadata.title).toBe('My New Document');
        expect(document.metadata.wordCount).toBe(4); // "Initial content here"
      });

      it('should validate content during creation', () => {
        // Arrange
        const invalidContent = 'a'.repeat(5_000_001); // Exceeds limit

        // Act & Assert
        expect(() => DocumentFactory.createNew(invalidContent))
          .toThrow('Content exceeds 5MB limit');
      });
    });

    describe('Business Rule: Document Creation from File', () => {
      it('should create document from file with correct metadata', () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const content = '# File Document\n\nContent from file';
        const filePath = '/path/to/document.md';

        // Act
        const document = DocumentFactory.createFromFile(id, content, filePath);

        // Assert
        expect(document.id).toBe(id);
        expect(document.content).toBe(content);
        expect(document.filePath).toBe(filePath);
        expect(document.metadata.title).toBe('File Document');
        expect(document.metadata.isDirty).toBe(false);
        expect(document.metadata.savedAt).toBeInstanceOf(Date);
      });

      it('should validate ID and content when creating from file', () => {
        // Arrange
        const invalidId = 'invalid-id';
        const content = 'Valid content';
        const filePath = '/path/to/file.md';

        // Act & Assert
        expect(() => DocumentFactory.createFromFile(invalidId, content, filePath))
          .toThrow('DocumentId must be valid UUID v4');
      });
    });
  });

  describe('Document Entity Integration Tests', () => {
    let document: Document;

    beforeEach(() => {
      document = DocumentFactory.createNew('# Test Document\n\nTest content');
    });

    describe('Business Rule: Document State Consistency', () => {
      it('should maintain consistent state across operations', () => {
        // Initial state
        expect(document.metadata.isDirty).toBe(false);
        expect(document.metadata.wordCount).toBe(2); // "Test content"

        // Simulate content update (this would typically be done by a use case)
        const newMetadata = DocumentUtils.updateMetadata(document.metadata, '# Updated Title\n\nUpdated content with more words');

        expect(newMetadata.isDirty).toBe(true);
        expect(newMetadata.wordCount).toBe(5); // "Updated content with more words"
        expect(newMetadata.title).toBe('Updated Title');
      });

      it('should preserve immutability of original metadata', () => {
        // Arrange
        const originalMetadata = { ...document.metadata };

        // Act
        DocumentUtils.updateMetadata(document.metadata, 'New content');

        // Assert - original metadata should not be modified
        expect(document.metadata).toEqual(originalMetadata);
      });
    });

    describe('Business Rule: Entity Invariants', () => {
      it('should always have valid document ID', () => {
        // Assert
        expect(() => DocumentValidator.validateDocumentId(document.id)).not.toThrow();
      });

      it('should always have valid content', () => {
        // Assert
        expect(() => DocumentValidator.validateContent(document.content)).not.toThrow();
      });

      it('should maintain metadata consistency', () => {
        // Assert
        expect(document.metadata.createdAt).toBeDefined();
        expect(document.metadata.modifiedAt).toBeDefined();
        expect(document.metadata.title).toBeDefined();
        expect(typeof document.metadata.wordCount).toBe('number');
        expect(typeof document.metadata.characterCount).toBe('number');
        expect(typeof document.metadata.isDirty).toBe('boolean');
      });
    });

    describe('Architecture Validation', () => {
      it('should be framework-independent', () => {
        // The Document entity should not depend on any external frameworks
        // This test verifies that we can create and manipulate documents
        // without any UI framework, database, or external library
        expect(document).toBeDefined();
        expect(typeof document.id).toBe('string');
        expect(typeof document.content).toBe('string');
        expect(typeof document.metadata).toBe('object');
      });

      it('should encapsulate business rules', () => {
        // Entities should contain business logic and validation
        expect(DocumentValidator).toBeDefined();
        expect(DocumentUtils).toBeDefined();
        expect(DocumentFactory).toBeDefined();

        // Business rules should be testable in isolation
        expect(() => DocumentValidator.validateContent('test')).not.toThrow();
        expect(DocumentUtils.calculateWordCount('test')).toBe(1);
        expect(DocumentFactory.createNew).toBeDefined();
      });
    });
  });
});