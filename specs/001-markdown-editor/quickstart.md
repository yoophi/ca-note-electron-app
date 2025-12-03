# Quickstart: Markdown Editor Implementation

**Feature**: Markdown Editor with Clean Architecture
**Target Audience**: Developers implementing the planned architecture
**Prerequisites**: TypeScript, React, Electron basics

## Architecture Overview

This implementation follows Clean Architecture principles with clear separation across Electron's process boundaries:

```
┌─────────────────────────────────────────────┐
│                 Renderer Process             │
├─────────────────────────────────────────────┤
│ Frameworks & Drivers                        │
│ ├─ CodeMirror 6 (Editor UI)                 │
│ ├─ react-markdown (Preview UI)              │
│ └─ IPC Client                               │
├─────────────────────────────────────────────┤
│ Interface Adapters                          │
│ ├─ React Components                         │
│ ├─ Custom Hooks                             │
│ └─ Presenters                               │
├─────────────────────────────────────────────┤
│ Use Cases (Application Logic)               │
│ ├─ EditDocument                             │
│ ├─ RenderMarkdown                           │
│ └─ ManageEditorState                        │
├─────────────────────────────────────────────┤
│ Entities (Business Logic)                   │
│ ├─ Document                                 │
│ └─ EditorState                              │
└─────────────────────────────────────────────┘
                      │ IPC Boundary
┌─────────────────────────────────────────────┐
│                  Main Process               │
├─────────────────────────────────────────────┤
│ Frameworks & Drivers                        │
│ ├─ Node.js File System                      │
│ ├─ Electron Dialog API                      │
│ └─ IPC Server                               │
├─────────────────────────────────────────────┤
│ Interface Adapters                          │
│ └─ File System Adapter                      │
├─────────────────────────────────────────────┤
│ Use Cases (Application Logic)               │
│ ├─ SaveDocument                             │
│ ├─ LoadDocument                             │
│ └─ CreateDocument                           │
├─────────────────────────────────────────────┤
│ Entities (Business Logic)                   │
│ ├─ Document                                 │
│ └─ FileSystemReference                      │
└─────────────────────────────────────────────┘
```

## Quick Implementation Steps

### Step 1: Install Dependencies

```bash
cd /Users/yoophi/study/architecture-fe/01-clean-architecture/example/fe/ca-note-electron-app/ca-note-electron-app

# Core dependencies
npm install @uiw/react-codemirror @codemirror/lang-markdown @codemirror/language-data
npm install react-markdown remark-gfm rehype-sanitize
npm install react-syntax-highlighter

# Type definitions
npm install --save-dev @types/react-syntax-highlighter
```

### Step 2: Set Up Entity Layer

Create the core business entities that both processes will use:

```typescript
// src/shared/entities/Document.ts
export interface Document {
  id: string;
  content: string;
  filePath?: string;
  metadata: {
    title: string;
    createdAt: Date;
    modifiedAt: Date;
    savedAt?: Date;
    isDirty: boolean;
    characterCount: number;
    wordCount: number;
  };
}

// src/shared/entities/EditorState.ts
export interface EditorState {
  documentId: string;
  cursorPosition: { line: number; column: number };
  selection: {
    from: { line: number; column: number };
    to: { line: number; column: number };
    text: string;
  };
  scrollPosition: { top: number; left: number };
  isPreviewVisible: boolean;
  zoomLevel: number;
}
```

### Step 3: Implement Main Process Use Cases

```typescript
// src/main/use-cases/SaveDocument.ts
import { promises as fs } from 'fs';
import type { Document } from '../../shared/entities/Document';

export class SaveDocumentUseCase {
  async execute(document: Document, filePath: string): Promise<void> {
    try {
      await fs.writeFile(filePath, document.content, 'utf-8');

      // Update document metadata
      document.filePath = filePath;
      document.metadata.savedAt = new Date();
      document.metadata.isDirty = false;

    } catch (error) {
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }
}

// src/main/use-cases/LoadDocument.ts
export class LoadDocumentUseCase {
  async execute(filePath: string): Promise<Document> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      const document: Document = {
        id: crypto.randomUUID(),
        content,
        filePath,
        metadata: {
          title: this.extractTitle(content) || path.basename(filePath, '.md'),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          savedAt: stats.mtime,
          isDirty: false,
          characterCount: content.replace(/\s/g, '').length,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        }
      };

      return document;
    } catch (error) {
      throw new Error(`Failed to load document: ${error.message}`);
    }
  }

  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.*)$/m);
    return match ? match[1].trim() : null;
  }
}
```

### Step 4: Set Up IPC Communication

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from '../contracts/ipc-contracts';

const electronApi: ElectronApi = {
  createDocument: (request) => ipcRenderer.invoke('document:create', request),
  saveDocument: (request) => ipcRenderer.invoke('document:save', request),
  loadDocument: (request) => ipcRenderer.invoke('document:load', request),
  showOpenDialog: (request) => ipcRenderer.invoke('file:show-open-dialog', request),
  showSaveDialog: (request) => ipcRenderer.invoke('file:show-save-dialog', request),
  getFileMetadata: (request) => ipcRenderer.invoke('file:get-metadata', request),

  onDocumentEvent: (callback) => {
    const handler = (_event: any, eventData: any) => callback(eventData);
    ipcRenderer.on('event:document-changed', handler);
    ipcRenderer.on('event:document-saved', handler);

    return () => {
      ipcRenderer.removeListener('event:document-changed', handler);
      ipcRenderer.removeListener('event:document-saved', handler);
    };
  },

  getVersion: () => ipcRenderer.invoke('app:get-version'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
```

### Step 5: Implement Renderer Use Cases

```typescript
// src/renderer/use-cases/EditDocument.ts
export class EditDocumentUseCase {
  constructor(
    private documentRepository: DocumentRepository,
    private eventPublisher: DocumentEventPublisher
  ) {}

  async execute(documentId: string, newContent: string): Promise<void> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update document
    document.content = newContent;
    document.metadata.modifiedAt = new Date();
    document.metadata.isDirty = true;
    document.metadata.characterCount = newContent.replace(/\s/g, '').length;
    document.metadata.wordCount = newContent.split(/\s+/).filter(w => w.length > 0).length;

    // Extract title from first heading
    const titleMatch = newContent.match(/^#\s+(.*)$/m);
    if (titleMatch) {
      document.metadata.title = titleMatch[1].trim();
    }

    await this.documentRepository.save(document);

    // Publish domain event
    this.eventPublisher.publish({
      type: 'document-changed',
      documentId: document.id,
      content: newContent,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Step 6: Create React Components

```typescript
// src/renderer/adapters/components/MarkdownEditor.tsx
import React, { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange
}) => {
  const extensions = useMemo(() => [
    markdown({ codeLanguages: languages })
  ], []);

  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  return (
    <div className="markdown-editor">
      <CodeMirror
        value={content}
        height="100vh"
        extensions={extensions}
        onChange={handleChange}
      />
    </div>
  );
};

// src/renderer/adapters/components/PreviewPane.tsx
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface PreviewPaneProps {
  content: string;
}

export const PreviewPane = memo<PreviewPaneProps>(({ content }) => {
  return (
    <div className="preview-pane prose prose-slate max-w-none p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        skipHtml={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prev, next) => prev.content === next.content);
```

### Step 7: Create Custom Hook for Integration

```typescript
// src/renderer/adapters/hooks/useMarkdownEditor.ts
import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export const useMarkdownEditor = (documentId: string) => {
  const [content, setContent] = useState('');
  const [debouncedContent] = useDebounce(content, 300);
  const editDocumentUseCase = useEditDocumentUseCase();

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Auto-save with debouncing
  useEffect(() => {
    if (debouncedContent && documentId) {
      editDocumentUseCase.execute(documentId, debouncedContent);
    }
  }, [debouncedContent, documentId, editDocumentUseCase]);

  return {
    content,
    handleContentChange,
  };
};
```

### Step 8: Assemble Main App Component

```typescript
// src/renderer/App.tsx
import React, { useState, useCallback } from 'react';
import { MarkdownEditor } from './adapters/components/MarkdownEditor';
import { PreviewPane } from './adapters/components/PreviewPane';
import { useMarkdownEditor } from './adapters/hooks/useMarkdownEditor';

export const App: React.FC = () => {
  const [documentId] = useState(() => crypto.randomUUID());
  const { content, handleContentChange } = useMarkdownEditor(documentId);

  const handleSave = useCallback(async () => {
    const response = await window.electronApi.saveDocument({
      documentId,
      content,
    });

    if (!response.success) {
      console.error('Save failed:', response.error);
    }
  }, [documentId, content]);

  const handleOpen = useCallback(async () => {
    const response = await window.electronApi.loadDocument({});

    if (response.success && response.document) {
      // Update state with loaded document
      handleContentChange(response.document.content);
    }
  }, [handleContentChange]);

  return (
    <div className="app">
      <div className="toolbar">
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave}>Save</button>
      </div>
      <div className="editor-layout">
        <div className="editor-pane">
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
          />
        </div>
        <div className="preview-pane">
          <PreviewPane content={content} />
        </div>
      </div>
    </div>
  );
};
```

## Testing Strategy

### Unit Tests (Entities & Use Cases)

```typescript
// test/unit/use-cases/EditDocument.test.ts
import { EditDocumentUseCase } from '../../../src/renderer/use-cases/EditDocument';

describe('EditDocumentUseCase', () => {
  it('should update document content and metadata', async () => {
    const mockRepository = createMockDocumentRepository();
    const mockEventPublisher = createMockEventPublisher();
    const useCase = new EditDocumentUseCase(mockRepository, mockEventPublisher);

    const document = createTestDocument();
    mockRepository.findById.mockResolvedValue(document);

    await useCase.execute(document.id, '# New Content');

    expect(document.content).toBe('# New Content');
    expect(document.metadata.isDirty).toBe(true);
    expect(document.metadata.title).toBe('New Content');
  });
});
```

### Integration Tests (Across Layers)

```typescript
// test/integration/editor-preview.test.ts
describe('Editor-Preview Integration', () => {
  it('should update preview when editor content changes', async () => {
    const { getByRole, getByTestId } = render(<App />);

    const editor = getByTestId('markdown-editor');
    const preview = getByTestId('markdown-preview');

    fireEvent.change(editor, { target: { value: '# Test Header' } });

    await waitFor(() => {
      expect(preview).toHaveTextContent('Test Header');
    });
  });
});
```

### E2E Tests (Full User Journeys)

```typescript
// test/e2e/file-operations.test.ts
describe('File Operations E2E', () => {
  it('should save and reload document with content fidelity', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Type content
    await window.fill('[data-testid="editor"]', '# My Document\n\nContent here');

    // Save
    await window.click('button:has-text("Save")');

    // Reload app
    await app.close();
    const newApp = await electron.launch({ args: ['.'] });
    const newWindow = await newApp.firstWindow();

    // Verify content persists
    expect(await newWindow.textContent('[data-testid="preview"]'))
      .toContain('My Document');
  });
});
```

## Performance Validation

Verify the implementation meets success criteria:

```typescript
// test/performance/performance.test.ts
describe('Performance Requirements', () => {
  it('SC-001: Preview updates within 100ms', async () => {
    const startTime = performance.now();

    fireEvent.change(editorInput, { target: { value: '# New content' } });

    await waitFor(() => {
      expect(preview).toHaveTextContent('New content');
    });

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(100);
  });

  it('SC-003: Handle 5MB files without degradation', async () => {
    const largeContent = 'x'.repeat(5_000_000);

    const startTime = performance.now();
    fireEvent.change(editorInput, { target: { value: largeContent } });
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(500); // Should not freeze UI
  });
});
```

## Common Pitfalls and Solutions

### 1. CodeMirror Re-rendering Issues
**Problem**: Editor loses focus or recreates on every render
**Solution**: Memoize extensions and configuration objects

```typescript
// ❌ Bad
<CodeMirror extensions={[markdown()]} />

// ✅ Good
const extensions = useMemo(() => [markdown()], []);
<CodeMirror extensions={extensions} />
```

### 2. IPC Type Safety Issues
**Problem**: Runtime errors due to untyped IPC communication
**Solution**: Use the provided contract types and validation

```typescript
// ✅ Type-safe IPC call
const response: SaveDocumentResponse = await window.electronApi.saveDocument({
  documentId: document.id,
  content: document.content,
});

if (!response.success) {
  throw new Error(response.error);
}
```

### 3. Memory Leaks in Event Listeners
**Problem**: Event listeners not cleaned up properly
**Solution**: Always return cleanup functions

```typescript
useEffect(() => {
  const unsubscribe = window.electronApi.onDocumentEvent((event) => {
    handleDocumentEvent(event);
  });

  return unsubscribe; // Critical: cleanup on unmount
}, []);
```

## Next Steps

1. **Implement P1 (Write and Preview)**: Start with basic editor and preview
2. **Add P2 (Save and Load)**: Implement file operations
3. **Enhance P3 (File Management)**: Add file status indicators and warnings
4. **Performance Optimization**: Profile and optimize for large files
5. **Testing**: Add comprehensive test coverage
6. **Error Handling**: Implement robust error boundaries and user feedback

This quickstart provides the foundation for implementing Clean Architecture principles while delivering the markdown editor functionality specified in the requirements.