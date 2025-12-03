/**
 * Document Entity - Shared across main and renderer processes
 *
 * Represents a markdown document with all its metadata.
 * This entity contains the core business logic for document validation
 * and state management.
 */

export type DocumentId = string; // UUID v4 format
export type MarkdownContent = string; // Raw markdown text
export type FilePath = string; // Absolute file system path

export interface DocumentMetadata {
  title: string;
  createdAt: Date;
  modifiedAt: Date;
  savedAt?: Date;
  isDirty: boolean;
  characterCount: number;
  wordCount: number;
}

export interface Document {
  id: DocumentId;
  content: MarkdownContent;
  filePath?: FilePath;
  metadata: DocumentMetadata;
}

/**
 * Document business rules and validation
 */
export class DocumentValidator {
  static validateContent(content: string): void {
    if (content.length > 5_000_000) {
      throw new Error('Content exceeds 5MB limit');
    }

    if (!this.isValidUtf8(content)) {
      throw new Error('Content must be valid UTF-8');
    }
  }

  static validateDocumentId(id: string): void {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      throw new Error('DocumentId must be valid UUID v4');
    }
  }

  private static isValidUtf8(str: string): boolean {
    try {
      // Browser environment UTF-8 validation
      return str === decodeURIComponent(encodeURIComponent(str));
    } catch {
      return false;
    }
  }
}

/**
 * Document utility functions
 */
export class DocumentUtils {
  static generateDocumentId(): DocumentId {
    return crypto.randomUUID();
  }

  static extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.*)$/m);
    return match ? match[1].trim() : null;
  }

  static calculateWordCount(content: string): number {
    return content
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  static calculateCharacterCount(content: string): number {
    return content.replace(/\s/g, '').length;
  }

  static createMetadata(content: string, title?: string): DocumentMetadata {
    const now = new Date();
    return {
      title: title || this.extractTitle(content) || 'Untitled Document',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      characterCount: this.calculateCharacterCount(content),
      wordCount: this.calculateWordCount(content),
    };
  }

  static updateMetadata(metadata: DocumentMetadata, newContent: string): DocumentMetadata {
    const extractedTitle = this.extractTitle(newContent);
    return {
      ...metadata,
      title: extractedTitle || metadata.title,
      modifiedAt: new Date(),
      isDirty: true,
      characterCount: this.calculateCharacterCount(newContent),
      wordCount: this.calculateWordCount(newContent),
    };
  }
}

/**
 * Document factory for creating new documents
 */
export class DocumentFactory {
  static createNew(initialContent: string = ''): Document {
    const id = DocumentUtils.generateDocumentId();
    DocumentValidator.validateDocumentId(id);
    DocumentValidator.validateContent(initialContent);

    return {
      id,
      content: initialContent,
      metadata: DocumentUtils.createMetadata(initialContent),
    };
  }

  static createFromFile(id: DocumentId, content: string, filePath: string): Document {
    DocumentValidator.validateDocumentId(id);
    DocumentValidator.validateContent(content);

    return {
      id,
      content,
      filePath,
      metadata: {
        ...DocumentUtils.createMetadata(content),
        savedAt: new Date(),
        isDirty: false,
      },
    };
  }
}