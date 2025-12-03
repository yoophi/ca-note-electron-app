/**
 * useMarkdownEditor Hook
 *
 * Custom React hook that orchestrates markdown editing operations.
 * This hook bridges React components with our Clean Architecture use cases,
 * providing a clean interface for document editing and rendering.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Document, type DocumentSnapshot } from '../../entities/Document';
import {
  EditDocument,
  DefaultContentValidator,
  type EditDocumentRequest,
  type EditDocumentResult,
  type DocumentRepository,
  type ContentValidator,
  type EditorStateManager,
  type UndoRedoManager,
  type DocumentEventPublisher,
} from '../../use-cases/EditDocument';
import {
  RenderMarkdown,
  DefaultPerformanceMonitor,
  type RenderMarkdownRequest,
  type RenderMarkdownResult,
  type MarkdownRenderer,
  type ContentSanitizer,
  type RenderCache,
  type PerformanceMonitor,
} from '../../use-cases/RenderMarkdown';
import type { DocumentId, MarkdownContent } from '../../../shared/entities/Document';
import type { CursorPosition, TextSelection } from '../../../shared/entities/EditorState';

/**
 * Hook configuration interface
 */
export interface UseMarkdownEditorConfig {
  // Dependencies (injected for Clean Architecture)
  documentRepository: DocumentRepository;
  markdownRenderer: MarkdownRenderer;
  contentSanitizer: ContentSanitizer;
  renderCache: RenderCache;
  editorStateManager?: EditorStateManager;
  undoRedoManager?: UndoRedoManager;
  eventPublisher?: DocumentEventPublisher;

  // Editor configuration
  autoSave?: boolean;
  autoSaveInterval?: number;
  debounceDelay?: number;
  maxUndoHistory?: number;

  // Performance settings
  enablePerformanceMonitoring?: boolean;
  maxRenderTime?: number;
  previewMode?: 'live' | 'manual';
}

/**
 * Hook state interface
 */
export interface MarkdownEditorState {
  // Document state
  document: Document | null;
  isLoading: boolean;
  isDirty: boolean;
  hasUnsavedChanges: boolean;

  // Editor state
  cursorPosition: CursorPosition;
  selection: TextSelection;
  isEditing: boolean;

  // Preview state
  previewContent: string;
  previewHtml: string;
  isPreviewLoading: boolean;
  previewError: string | null;

  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;

  // Error handling
  errors: string[];
  warnings: string[];

  // Performance metrics
  lastRenderTime?: number;
  lastSaveTime?: Date;
}

/**
 * Hook actions interface
 */
export interface MarkdownEditorActions {
  // Document operations
  loadDocument: (documentId: DocumentId) => Promise<boolean>;
  saveDocument: () => Promise<boolean>;
  createNewDocument: (initialContent?: string) => Promise<boolean>;

  // Content editing
  updateContent: (content: string, options?: {
    cursorPosition?: CursorPosition;
    createSnapshot?: boolean;
  }) => Promise<boolean>;
  insertText: (text: string, position: CursorPosition) => Promise<boolean>;
  replaceSelection: (text: string, selection: { start: number; end: number }) => Promise<boolean>;

  // Undo/Redo operations
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearHistory: () => void;

  // Preview operations
  refreshPreview: () => Promise<boolean>;
  updatePreviewScroll: (scrollTop: number) => void;

  // Editor state operations
  updateCursorPosition: (position: CursorPosition) => void;
  updateSelection: (selection: TextSelection) => void;
  startEditing: () => void;
  stopEditing: () => void;

  // Error handling
  clearErrors: () => void;
  clearWarnings: () => void;

  // Formatting helpers
  format: {
    bold: () => Promise<boolean>;
    italic: () => Promise<boolean>;
    code: () => Promise<boolean>;
    heading: (level: number) => Promise<boolean>;
    link: (url?: string, text?: string) => Promise<boolean>;
  };
}

/**
 * Hook return type
 */
export interface UseMarkdownEditorReturn {
  state: MarkdownEditorState;
  actions: MarkdownEditorActions;
}

/**
 * useMarkdownEditor Hook Implementation
 */
export function useMarkdownEditor(config: UseMarkdownEditorConfig): UseMarkdownEditorReturn {
  // Initialize use cases with injected dependencies
  const editDocument = useMemo(() => new EditDocument(
    config.documentRepository,
    config.contentSanitizer as ContentValidator || new DefaultContentValidator(),
    config.editorStateManager || createDefaultEditorStateManager(),
    config.undoRedoManager || createDefaultUndoRedoManager(),
    config.eventPublisher || createDefaultEventPublisher()
  ), [config]);

  const renderMarkdown = useMemo(() => new RenderMarkdown(
    config.markdownRenderer,
    config.contentSanitizer,
    config.renderCache,
    config.enablePerformanceMonitoring ? new DefaultPerformanceMonitor() : createDefaultPerformanceMonitor()
  ), [config]);

  // State management
  const [state, setState] = useState<MarkdownEditorState>({
    document: null,
    isLoading: false,
    isDirty: false,
    hasUnsavedChanges: false,
    cursorPosition: { line: 0, column: 0 },
    selection: { from: { line: 0, column: 0 }, to: { line: 0, column: 0 }, text: '' },
    isEditing: false,
    previewContent: '',
    previewHtml: '',
    isPreviewLoading: false,
    previewError: null,
    canUndo: false,
    canRedo: false,
    errors: [],
    warnings: [],
  });

  // Debounced operations
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<MarkdownEditorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Debounced preview update
   */
  const updatePreviewDebounced = useCallback(async (content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (config.previewMode === 'manual') return;

      updateState({ isPreviewLoading: true, previewError: null });

      try {
        const renderRequest: RenderMarkdownRequest = {
          content,
          options: {
            maxRenderTime: config.maxRenderTime || 5000,
            target: 'preview',
          },
        };

        const result = await renderMarkdown.execute(renderRequest);

        if (result.success && result.result) {
          updateState({
            previewContent: content,
            previewHtml: result.result.html,
            isPreviewLoading: false,
            lastRenderTime: result.performanceMetrics?.renderTime,
          });
        } else {
          updateState({
            isPreviewLoading: false,
            previewError: result.errors?.join(', ') || 'Unknown preview error',
          });
        }
      } catch (error) {
        updateState({
          isPreviewLoading: false,
          previewError: error instanceof Error ? error.message : 'Preview render failed',
        });
      }
    }, config.debounceDelay || 300);
  }, [config, renderMarkdown, updateState]);

  /**
   * Auto-save functionality
   */
  const scheduleAutoSave = useCallback(() => {
    if (!config.autoSave || !state.document || !state.hasUnsavedChanges) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await actions.saveDocument();
    }, config.autoSaveInterval || 30000); // 30 seconds default
  }, [config.autoSave, config.autoSaveInterval, state.document, state.hasUnsavedChanges]);

  /**
   * Actions implementation
   */
  const actions: MarkdownEditorActions = useMemo(() => ({
    loadDocument: async (documentId: DocumentId): Promise<boolean> => {
      updateState({ isLoading: true, errors: [], warnings: [] });

      try {
        const document = await config.documentRepository.load(documentId);

        updateState({
          document,
          isLoading: false,
          isDirty: false,
          hasUnsavedChanges: false,
          canUndo: editDocument.canUndo(documentId),
          canRedo: editDocument.canRedo(documentId),
        });

        // Update preview
        await updatePreviewDebounced(document.content);

        return true;
      } catch (error) {
        updateState({
          isLoading: false,
          errors: [error instanceof Error ? error.message : 'Failed to load document'],
        });
        return false;
      }
    },

    saveDocument: async (): Promise<boolean> => {
      if (!state.document) return false;

      updateState({ isLoading: true });

      try {
        await config.documentRepository.save(state.document);

        state.document.markAsSaved();

        updateState({
          isLoading: false,
          isDirty: false,
          hasUnsavedChanges: false,
          lastSaveTime: new Date(),
        });

        return true;
      } catch (error) {
        updateState({
          isLoading: false,
          errors: [...state.errors, error instanceof Error ? error.message : 'Failed to save document'],
        });
        return false;
      }
    },

    createNewDocument: async (initialContent = ''): Promise<boolean> => {
      updateState({ isLoading: true });

      try {
        const document = await config.documentRepository.create(initialContent);

        updateState({
          document,
          isLoading: false,
          isDirty: false,
          hasUnsavedChanges: false,
          canUndo: false,
          canRedo: false,
        });

        // Update preview
        await updatePreviewDebounced(document.content);

        return true;
      } catch (error) {
        updateState({
          isLoading: false,
          errors: [error instanceof Error ? error.message : 'Failed to create document'],
        });
        return false;
      }
    },

    updateContent: async (content: string, options = {}): Promise<boolean> => {
      if (!state.document) return false;

      const request: EditDocumentRequest = {
        documentId: state.document.id,
        newContent: content,
        cursorPosition: options.cursorPosition,
        createSnapshot: options.createSnapshot,
      };

      const result = await editDocument.execute(request);

      if (result.success && result.document) {
        updateState({
          document: result.document,
          isDirty: true,
          hasUnsavedChanges: true,
          isEditing: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
          errors: [],
          warnings: result.warnings || [],
        });

        // Update preview
        await updatePreviewDebounced(content);

        // Schedule auto-save
        scheduleAutoSave();

        return true;
      } else {
        updateState({
          errors: result.errors || ['Failed to update content'],
        });
        return false;
      }
    },

    insertText: async (text: string, position: CursorPosition): Promise<boolean> => {
      if (!state.document) return false;

      const result = await editDocument.insertText(state.document.id, text, position);

      if (result.success && result.document) {
        updateState({
          document: result.document,
          isDirty: true,
          hasUnsavedChanges: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
        });

        await updatePreviewDebounced(result.document.content);
        scheduleAutoSave();

        return true;
      }

      return false;
    },

    replaceSelection: async (text: string, selection: { start: number; end: number }): Promise<boolean> => {
      if (!state.document) return false;

      const result = await editDocument.replaceSelection(state.document.id, text, selection);

      if (result.success && result.document) {
        updateState({
          document: result.document,
          isDirty: true,
          hasUnsavedChanges: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
        });

        await updatePreviewDebounced(result.document.content);
        scheduleAutoSave();

        return true;
      }

      return false;
    },

    undo: async (): Promise<boolean> => {
      if (!state.document) return false;

      const result = await editDocument.undo(state.document.id);

      if (result.success && result.document) {
        updateState({
          document: result.document,
          isDirty: true,
          hasUnsavedChanges: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
        });

        await updatePreviewDebounced(result.document.content);

        return true;
      }

      return false;
    },

    redo: async (): Promise<boolean> => {
      if (!state.document) return false;

      const result = await editDocument.redo(state.document.id);

      if (result.success && result.document) {
        updateState({
          document: result.document,
          isDirty: true,
          hasUnsavedChanges: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
        });

        await updatePreviewDebounced(result.document.content);

        return true;
      }

      return false;
    },

    clearHistory: (): void => {
      if (state.document) {
        editDocument.clearHistory(state.document.id);
        updateState({ canUndo: false, canRedo: false });
      }
    },

    refreshPreview: async (): Promise<boolean> => {
      if (!state.document) return false;

      await updatePreviewDebounced(state.document.content);
      return true;
    },

    updatePreviewScroll: (scrollTop: number): void => {
      // This would be handled by the preview component
      // but we can store scroll sync state here if needed
    },

    updateCursorPosition: (position: CursorPosition): void => {
      updateState({ cursorPosition: position });
    },

    updateSelection: (selection: TextSelection): void => {
      updateState({ selection });
    },

    startEditing: (): void => {
      updateState({ isEditing: true });
      if (state.document) {
        state.document.startEditing();
      }
    },

    stopEditing: (): void => {
      updateState({ isEditing: false });
      if (state.document) {
        state.document.stopEditing();
        editDocument.stopEditing(state.document.id);
      }
    },

    clearErrors: (): void => {
      updateState({ errors: [] });
    },

    clearWarnings: (): void => {
      updateState({ warnings: [] });
    },

    format: {
      bold: async (): Promise<boolean> => {
        if (!state.document) return false;

        const selection = state.selection;
        const newText = selection.text ? `**${selection.text}**` : '****';

        // This is a simplified implementation
        // In a real app, you'd need to calculate proper selection ranges
        const content = state.document.content;
        // Implementation would depend on cursor/selection handling

        return actions.updateContent(content);
      },

      italic: async (): Promise<boolean> => {
        if (!state.document) return false;

        const selection = state.selection;
        const newText = selection.text ? `*${selection.text}*` : '**';

        return actions.updateContent(state.document.content);
      },

      code: async (): Promise<boolean> => {
        if (!state.document) return false;

        const selection = state.selection;
        const newText = selection.text ? `\`${selection.text}\`` : '``';

        return actions.updateContent(state.document.content);
      },

      heading: async (level: number): Promise<boolean> => {
        if (!state.document) return false;

        const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
        const lines = state.document.content.split('\n');
        const currentLine = lines[state.cursorPosition.line] || '';

        // Replace or add heading
        const newLine = currentLine.startsWith('#')
          ? `${hashes} ${currentLine.replace(/^#+\s*/, '')}`
          : `${hashes} ${currentLine}`;

        lines[state.cursorPosition.line] = newLine;

        return actions.updateContent(lines.join('\n'));
      },

      link: async (url = '', text = ''): Promise<boolean> => {
        if (!state.document) return false;

        const linkText = text || state.selection.text || 'link text';
        const linkUrl = url || 'https://';
        const newText = `[${linkText}](${linkUrl})`;

        // This would need proper cursor/selection handling
        return actions.updateContent(state.document.content);
      },
    },
  }), [state, editDocument, updateState, updatePreviewDebounced, scheduleAutoSave, config]);

  return { state, actions };
}

/**
 * Default implementation factories (for dependency injection)
 */
function createDefaultEditorStateManager(): EditorStateManager {
  return {
    updateEditorState: () => {},
    getEditorState: () => null,
  };
}

function createDefaultUndoRedoManager(): UndoRedoManager {
  const history = new Map<DocumentId, DocumentSnapshot[]>();
  const historyIndex = new Map<DocumentId, number>();

  return {
    saveSnapshot: (documentId, snapshot) => {
      if (!history.has(documentId)) {
        history.set(documentId, []);
        historyIndex.set(documentId, -1);
      }

      const snapshots = history.get(documentId)!;
      const index = historyIndex.get(documentId)!;

      // Remove any redo history after current position
      snapshots.splice(index + 1);
      snapshots.push(snapshot);
      historyIndex.set(documentId, snapshots.length - 1);

      // Limit history size
      if (snapshots.length > 50) {
        snapshots.splice(0, 1);
        historyIndex.set(documentId, snapshots.length - 1);
      }
    },

    undo: (documentId) => {
      const snapshots = history.get(documentId);
      const index = historyIndex.get(documentId);

      if (!snapshots || index === undefined || index <= 0) {
        return null;
      }

      historyIndex.set(documentId, index - 1);
      return snapshots[index - 1];
    },

    redo: (documentId) => {
      const snapshots = history.get(documentId);
      const index = historyIndex.get(documentId);

      if (!snapshots || index === undefined || index >= snapshots.length - 1) {
        return null;
      }

      historyIndex.set(documentId, index + 1);
      return snapshots[index + 1];
    },

    canUndo: (documentId) => {
      const index = historyIndex.get(documentId);
      return index !== undefined && index > 0;
    },

    canRedo: (documentId) => {
      const snapshots = history.get(documentId);
      const index = historyIndex.get(documentId);
      return snapshots !== undefined && index !== undefined && index < snapshots.length - 1;
    },

    clearHistory: (documentId) => {
      history.delete(documentId);
      historyIndex.delete(documentId);
    },
  };
}

function createDefaultEventPublisher(): DocumentEventPublisher {
  return {
    publishContentChanged: () => {},
    publishDocumentSaved: () => {},
    publishDocumentError: () => {},
  };
}

function createDefaultPerformanceMonitor(): PerformanceMonitor {
  return {
    startTimer: () => Date.now().toString(),
    endTimer: () => 0,
    recordMetric: () => {},
  };
}

export type { UseMarkdownEditorConfig, MarkdownEditorState, MarkdownEditorActions, UseMarkdownEditorReturn };