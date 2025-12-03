# Data Model: Markdown Editor

**Date**: 2025-12-03
**Feature**: Markdown Editor
**Context**: Clean Architecture entity design for dual-pane markdown editor

## Core Entities

### Document Entity

```typescript
interface Document {
  id: DocumentId;
  content: MarkdownContent;
  filePath?: FilePath;
  metadata: DocumentMetadata;
}

type DocumentId = string; // UUID v4 format
type MarkdownContent = string; // Raw markdown text
type FilePath = string; // Absolute file system path
```

**Business Rules**:
- Document ID MUST be unique across application session
- Content MUST be valid UTF-8 string
- FilePath MUST be absolute path when document is saved
- Document becomes dirty when content changes after last save

**State Transitions**:
```
New Document -> [setContent] -> Dirty Document
Dirty Document -> [save] -> Clean Document
Clean Document -> [setContent] -> Dirty Document
Saved Document -> [load] -> Clean Document
```

### DocumentMetadata Entity

```typescript
interface DocumentMetadata {
  title: DocumentTitle;
  createdAt: Date;
  modifiedAt: Date;
  savedAt?: Date;
  isDirty: boolean;
  characterCount: number;
  wordCount: number;
}

type DocumentTitle = string; // Derived from content or filename
```

**Business Rules**:
- Title MUST be derived from first H1 heading or filename
- CreatedAt MUST be set when document is created
- ModifiedAt MUST update when content changes
- SavedAt MUST update when document is successfully saved
- IsDirty MUST be true when modifiedAt > savedAt
- Character count MUST exclude whitespace
- Word count MUST use standard word boundary detection

**Validation Rules**:
```typescript
interface DocumentMetadataValidation {
  title: {
    maxLength: 200;
    required: true;
    fallback: "Untitled Document";
  };
  characterCount: {
    min: 0;
    max: 5_000_000; // 5MB as per SC-003
  };
}
```

### EditorState Entity

```typescript
interface EditorState {
  documentId: DocumentId;
  cursorPosition: CursorPosition;
  selection: TextSelection;
  scrollPosition: ScrollPosition;
  isPreviewVisible: boolean;
  zoomLevel: ZoomLevel;
}

interface CursorPosition {
  line: number; // 0-based
  column: number; // 0-based
}

interface TextSelection {
  from: CursorPosition;
  to: CursorPosition;
  text: string;
}

interface ScrollPosition {
  top: number; // Pixels from top
  left: number; // Pixels from left
}

type ZoomLevel = number; // 0.5 to 3.0, default 1.0
```

**Business Rules**:
- Cursor position MUST be within document bounds
- Selection MUST have valid from/to positions
- Scroll position MUST be non-negative
- Zoom level MUST be between 0.5 and 3.0
- Preview visibility state persists per document

### FileSystemReference Entity

```typescript
interface FileSystemReference {
  path: FilePath;
  permissions: FilePermissions;
  lastModified: Date;
  size: number; // Bytes
  exists: boolean;
}

interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}
```

**Business Rules**:
- Path MUST be absolute and platform-normalized
- Permissions MUST reflect actual file system state
- LastModified MUST match file system timestamp
- Size MUST match actual file size in bytes
- Exists MUST reflect current file system state

**Validation Rules**:
```typescript
interface FileSystemValidation {
  path: {
    pattern: /^\/.*\.md$/; // Unix absolute path ending in .md
    maxLength: 260; // Windows compatibility
  };
  size: {
    max: 5_242_880; // 5MB in bytes
  };
}
```

## Value Objects

### MarkdownContent Value Object

```typescript
class MarkdownContent {
  constructor(private readonly content: string) {
    this.validate();
  }

  get value(): string {
    return this.content;
  }

  get wordCount(): number {
    return this.content
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  get characterCount(): number {
    return this.content.replace(/\s/g, '').length;
  }

  get firstHeading(): string | null {
    const match = this.content.match(/^#\s+(.*)$/m);
    return match ? match[1].trim() : null;
  }

  private validate(): void {
    if (this.content.length > 5_000_000) {
      throw new Error('Content exceeds 5MB limit');
    }

    if (!this.isValidUtf8(this.content)) {
      throw new Error('Content must be valid UTF-8');
    }
  }

  private isValidUtf8(str: string): boolean {
    try {
      // Browser environment UTF-8 validation
      return str === decodeURIComponent(encodeURIComponent(str));
    } catch {
      return false;
    }
  }
}
```

### DocumentId Value Object

```typescript
class DocumentId {
  constructor(private readonly id: string) {
    this.validate();
  }

  get value(): string {
    return this.id;
  }

  static generate(): DocumentId {
    return new DocumentId(crypto.randomUUID());
  }

  equals(other: DocumentId): boolean {
    return this.id === other.value;
  }

  private validate(): void {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(this.id)) {
      throw new Error('DocumentId must be valid UUID v4');
    }
  }
}
```

## Aggregates

### DocumentAggregate

```typescript
class DocumentAggregate {
  private constructor(
    private document: Document,
    private editorState: EditorState,
    private fileReference?: FileSystemReference
  ) {}

  static create(content?: string): DocumentAggregate {
    const documentId = DocumentId.generate();
    const document: Document = {
      id: documentId,
      content: new MarkdownContent(content || ''),
      metadata: {
        title: 'Untitled Document',
        createdAt: new Date(),
        modifiedAt: new Date(),
        isDirty: false,
        characterCount: 0,
        wordCount: 0,
      }
    };

    const editorState: EditorState = {
      documentId,
      cursorPosition: { line: 0, column: 0 },
      selection: {
        from: { line: 0, column: 0 },
        to: { line: 0, column: 0 },
        text: ''
      },
      scrollPosition: { top: 0, left: 0 },
      isPreviewVisible: true,
      zoomLevel: 1.0
    };

    return new DocumentAggregate(document, editorState);
  }

  updateContent(newContent: string): void {
    const markdownContent = new MarkdownContent(newContent);

    this.document.content = markdownContent;
    this.document.metadata.modifiedAt = new Date();
    this.document.metadata.isDirty = true;
    this.document.metadata.characterCount = markdownContent.characterCount;
    this.document.metadata.wordCount = markdownContent.wordCount;

    // Update title from first heading or keep existing
    const firstHeading = markdownContent.firstHeading;
    if (firstHeading) {
      this.document.metadata.title = firstHeading;
    }
  }

  save(filePath: string): void {
    this.document.filePath = filePath;
    this.document.metadata.savedAt = new Date();
    this.document.metadata.isDirty = false;
  }

  getDocument(): Document {
    return { ...this.document };
  }

  getEditorState(): EditorState {
    return { ...this.editorState };
  }

  updateEditorState(updates: Partial<EditorState>): void {
    this.editorState = {
      ...this.editorState,
      ...updates
    };
  }
}
```

## Repository Interfaces

### DocumentRepository

```typescript
interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: DocumentId): Promise<Document | null>;
  delete(id: DocumentId): Promise<void>;
  findAll(): Promise<Document[]>;
  findByFilePath(filePath: string): Promise<Document | null>;
}
```

### FileSystemRepository

```typescript
interface FileSystemRepository {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getMetadata(filePath: string): Promise<FileSystemReference>;
  showOpenDialog(): Promise<string | null>;
  showSaveDialog(defaultName?: string): Promise<string | null>;
}
```

## Domain Events

### DocumentEvents

```typescript
interface DocumentContentChanged {
  type: 'DocumentContentChanged';
  documentId: DocumentId;
  content: string;
  timestamp: Date;
}

interface DocumentSaved {
  type: 'DocumentSaved';
  documentId: DocumentId;
  filePath: string;
  timestamp: Date;
}

interface DocumentLoaded {
  type: 'DocumentLoaded';
  documentId: DocumentId;
  filePath: string;
  timestamp: Date;
}

type DocumentEvent =
  | DocumentContentChanged
  | DocumentSaved
  | DocumentLoaded;
```

## Entity Relationships

```
DocumentAggregate (Aggregate Root)
├── Document (Entity)
│   ├── DocumentId (Value Object)
│   ├── MarkdownContent (Value Object)
│   ├── FilePath (Value Object)
│   └── DocumentMetadata (Entity)
├── EditorState (Entity)
│   ├── CursorPosition (Value Object)
│   ├── TextSelection (Value Object)
│   ├── ScrollPosition (Value Object)
│   └── ZoomLevel (Value Object)
└── FileSystemReference (Entity)
    ├── FilePath (Value Object)
    └── FilePermissions (Value Object)
```

## Invariants and Business Rules Summary

1. **Document Identity**: Each document MUST have unique ID throughout session
2. **Content Integrity**: Content MUST remain unchanged between save/load cycles
3. **State Consistency**: Editor state MUST always reference valid document
4. **File System Sync**: File metadata MUST reflect actual file system state
5. **Performance Bounds**: Operations MUST complete within defined time limits
6. **Size Limitations**: Content MUST not exceed 5MB limit
7. **Title Derivation**: Document title MUST be deterministic and meaningful
8. **Dirty State Tracking**: Dirty flag MUST accurately reflect unsaved changes

These entities and rules provide the foundation for implementing Clean Architecture layers while ensuring business logic remains independent of UI frameworks and file system implementations.