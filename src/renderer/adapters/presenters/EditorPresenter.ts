/**
 * EditorPresenter
 *
 * Coordinates between use cases and UI components for the markdown editor.
 * This presenter follows Clean Architecture by handling the flow of data
 * between business logic and the user interface, formatting data for
 * presentation and handling user interactions.
 */

import { EventEmitter } from 'events';
import { Document } from '../../entities/Document';
import {
  EditDocument,
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
  type RenderMarkdownRequest,
  type RenderMarkdownResult,
  type MarkdownRenderer,
  type ContentSanitizer,
  type RenderCache,
  type PerformanceMonitor,
} from '../../use-cases/RenderMarkdown';
import {
  ManageEditorState,
  type EditorStateData,
  type ManageEditorStateRequest,
  type ManageEditorStateResult,
  type StateStorage,
  type StateSynchronizer,
  type StatePerformanceMonitor,
  type EditorStateEventPublisher,
} from '../../use-cases/ManageEditorState';
import type { DocumentId, MarkdownContent } from '../../../shared/entities/Document';
import type {
  CursorPosition,
  TextSelection,
  ScrollPosition,
  ZoomLevel,
} from '../../../shared/entities/EditorState';

/**
 * Presenter configuration interface (dependency inversion)
 */
export interface EditorPresenterConfig {
  // Use case dependencies
  documentRepository: DocumentRepository;
  markdownRenderer: MarkdownRenderer;
  contentSanitizer: ContentSanitizer;
  renderCache: RenderCache;
  performanceMonitor: PerformanceMonitor;
  stateStorage: StateStorage;
  stateSynchronizer: StateSynchronizer;
  statePerformanceMonitor: StatePerformanceMonitor;

  // Optional dependencies with defaults
  contentValidator?: ContentValidator;
  editorStateManager?: EditorStateManager;
  undoRedoManager?: UndoRedoManager;
  documentEventPublisher?: DocumentEventPublisher;
  editorStateEventPublisher?: EditorStateEventPublisher;

  // Configuration
  autoSave?: boolean;
  autoSaveInterval?: number;
  debounceDelay?: number;
  maxUndoHistory?: number;
  enableRealTimePreview?: boolean;
}

/**
 * View model for the editor state
 */
export interface EditorViewModel {
  // Document state
  documentId: DocumentId | null;
  content: string;
  isLoading: boolean;
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;

  // Editor state
  cursorPosition: CursorPosition;
  selection: TextSelection;
  scrollPosition: ScrollPosition;
  isEditing: boolean;
  zoomLevel: ZoomLevel;

  // Preview state
  isPreviewVisible: boolean;
  previewHtml: string;
  previewScrollSync: boolean;
  isPreviewLoading: boolean;
  previewError: string | null;

  // History state
  canUndo: boolean;
  canRedo: boolean;

  // Error state
  errors: string[];
  warnings: string[];

  // Performance metrics
  lastRenderTime?: number;
  lastSaveTime?: number;
  documentStats?: {
    wordCount: number;
    characterCount: number;
    lineCount: number;
  };
}

/**
 * Events emitted by the presenter
 */
export interface EditorPresenterEvents {
  'state-changed': [EditorViewModel];
  'document-loaded': [DocumentId];
  'document-saved': [DocumentId];
  'document-error': [DocumentId, string];
  'content-changed': [DocumentId, string];
  'cursor-moved': [DocumentId, CursorPosition];
  'selection-changed': [DocumentId, TextSelection];
  'preview-updated': [DocumentId, string];
  'preview-error': [DocumentId, string];
  'undo-available': [DocumentId, boolean];
  'redo-available': [DocumentId, boolean];
}

/**
 * EditorPresenter implementation
 *
 * This class coordinates between multiple use cases and provides a clean
 * interface for the UI layer. It follows the MVP pattern where the presenter
 * contains the presentation logic and coordinates business operations.
 */
export class EditorPresenter extends EventEmitter {
  private editDocument: EditDocument;
  private renderMarkdown: RenderMarkdown;
  private manageEditorState: ManageEditorState;

  private currentDocument: Document | null = null;
  private currentViewModel: EditorViewModel;
  private debounceTimer: NodeJS.Timeout | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(private config: EditorPresenterConfig) {
    super();

    // Initialize use cases with dependencies
    this.editDocument = new EditDocument(
      config.documentRepository,
      config.contentValidator || this.createDefaultContentValidator(),
      config.editorStateManager || this.createDefaultEditorStateManager(),
      config.undoRedoManager || this.createDefaultUndoRedoManager(),
      config.documentEventPublisher || this.createDefaultDocumentEventPublisher()
    );

    this.renderMarkdown = new RenderMarkdown(
      config.markdownRenderer,
      config.contentSanitizer,
      config.renderCache,
      config.performanceMonitor
    );

    this.manageEditorState = new ManageEditorState(
      config.stateStorage,
      config.stateSynchronizer,
      config.statePerformanceMonitor,
      config.editorStateEventPublisher || this.createDefaultEditorStateEventPublisher()
    );

    // Initialize view model
    this.currentViewModel = this.createInitialViewModel();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Get current view model for the UI
   */
  getViewModel(): EditorViewModel {
    return { ...this.currentViewModel };
  }

  /**
   * Load a document
   */
  async loadDocument(documentId: DocumentId): Promise<boolean> {
    try {
      this.updateViewModel({ isLoading: true, errors: [] });

      // Load document
      const document = await this.config.documentRepository.load(documentId);
      this.currentDocument = document;

      // Restore editor state
      const stateResult = await this.manageEditorState.restoreState({
        documentId,
        createIfNotExists: true,
      });

      // Update view model
      this.updateViewModel({
        documentId,
        content: document.content,
        isLoading: false,
        isDirty: false,
        hasUnsavedChanges: false,
        lastSaved: document.lastModified,
        cursorPosition: stateResult.state?.cursorPosition || { line: 0, column: 0 },
        selection: stateResult.state?.selection || this.createEmptySelection(),
        scrollPosition: stateResult.state?.scrollPosition || { top: 0, left: 0 },
        zoomLevel: stateResult.state?.zoomLevel || 1.0,
        isPreviewVisible: stateResult.state?.isPreviewVisible || true,
        previewScrollSync: stateResult.state?.previewScrollSync || true,
        canUndo: this.editDocument.canUndo(documentId),
        canRedo: this.editDocument.canRedo(documentId),
        documentStats: this.calculateDocumentStats(document.content),
      });

      // Render initial preview
      if (this.currentViewModel.isPreviewVisible) {
        await this.updatePreview(document.content);
      }

      this.emit('document-loaded', documentId);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load document';
      this.updateViewModel({
        isLoading: false,
        errors: [errorMessage],
      });
      this.emit('document-error', documentId, errorMessage);
      return false;
    }
  }

  /**
   * Create a new document
   */
  async createDocument(initialContent = ''): Promise<DocumentId | null> {
    try {
      this.updateViewModel({ isLoading: true });

      const document = await this.config.documentRepository.create(initialContent);
      this.currentDocument = document;

      this.updateViewModel({
        documentId: document.id,
        content: document.content,
        isLoading: false,
        isDirty: false,
        hasUnsavedChanges: false,
        lastSaved: document.lastModified,
        cursorPosition: { line: 0, column: 0 },
        selection: this.createEmptySelection(),
        canUndo: false,
        canRedo: false,
        documentStats: this.calculateDocumentStats(document.content),
      });

      // Initialize preview
      if (this.currentViewModel.isPreviewVisible) {
        await this.updatePreview(document.content);
      }

      this.emit('document-loaded', document.id);
      return document.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
      this.updateViewModel({
        isLoading: false,
        errors: [errorMessage],
      });
      return null;
    }
  }

  /**
   * Save the current document
   */
  async saveDocument(): Promise<boolean> {
    if (!this.currentDocument) return false;

    try {
      await this.config.documentRepository.save(this.currentDocument);
      this.currentDocument.markAsSaved();

      this.updateViewModel({
        isDirty: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
        lastSaveTime: Date.now(),
      });

      this.emit('document-saved', this.currentDocument.id);
      this.scheduleAutoSave();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save document';
      this.updateViewModel({
        errors: [...this.currentViewModel.errors, errorMessage],
      });
      this.emit('document-error', this.currentDocument.id, errorMessage);
      return false;
    }
  }

  /**
   * Update document content
   */
  async updateContent(content: string, options: {
    cursorPosition?: CursorPosition;
    createSnapshot?: boolean;
  } = {}): Promise<boolean> {
    if (!this.currentDocument) return false;

    try {
      const request: EditDocumentRequest = {
        documentId: this.currentDocument.id,
        newContent: content,
        cursorPosition: options.cursorPosition,
        createSnapshot: options.createSnapshot,
      };

      const result = await this.editDocument.execute(request);

      if (result.success && result.document) {
        this.currentDocument = result.document;

        this.updateViewModel({
          content,
          isDirty: true,
          hasUnsavedChanges: true,
          isEditing: true,
          canUndo: result.canUndo || false,
          canRedo: result.canRedo || false,
          documentStats: this.calculateDocumentStats(content),
          errors: [],
          warnings: result.warnings || [],
        });

        // Update cursor position if provided
        if (options.cursorPosition) {
          await this.updateCursorPosition(options.cursorPosition);
        }

        // Update preview with debouncing
        if (this.config.enableRealTimePreview !== false) {
          this.debouncedUpdatePreview(content);
        }

        this.emit('content-changed', this.currentDocument.id, content);
        this.scheduleAutoSave();
        return true;
      } else {
        this.updateViewModel({
          errors: result.errors || ['Failed to update content'],
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update content';
      this.updateViewModel({
        errors: [...this.currentViewModel.errors, errorMessage],
      });
      return false;
    }
  }

  /**
   * Insert text at cursor position
   */
  async insertText(text: string, position: CursorPosition): Promise<boolean> {
    if (!this.currentDocument) return false;

    const result = await this.editDocument.insertText(this.currentDocument.id, text, position);

    if (result.success && result.document) {
      this.currentDocument = result.document;

      this.updateViewModel({
        content: result.document.content,
        isDirty: true,
        hasUnsavedChanges: true,
        canUndo: result.canUndo || false,
        canRedo: result.canRedo || false,
        documentStats: this.calculateDocumentStats(result.document.content),
      });

      this.debouncedUpdatePreview(result.document.content);
      this.scheduleAutoSave();
      return true;
    }

    return false;
  }

  /**
   * Replace selected text
   */
  async replaceSelection(text: string, selection: { start: number; end: number }): Promise<boolean> {
    if (!this.currentDocument) return false;

    const result = await this.editDocument.replaceSelection(this.currentDocument.id, text, selection);

    if (result.success && result.document) {
      this.currentDocument = result.document;

      this.updateViewModel({
        content: result.document.content,
        isDirty: true,
        hasUnsavedChanges: true,
        canUndo: result.canUndo || false,
        canRedo: result.canRedo || false,
        documentStats: this.calculateDocumentStats(result.document.content),
      });

      this.debouncedUpdatePreview(result.document.content);
      this.scheduleAutoSave();
      return true;
    }

    return false;
  }

  /**
   * Undo last operation
   */
  async undo(): Promise<boolean> {
    if (!this.currentDocument) return false;

    const result = await this.editDocument.undo(this.currentDocument.id);

    if (result.success && result.document) {
      this.currentDocument = result.document;

      this.updateViewModel({
        content: result.document.content,
        isDirty: true,
        hasUnsavedChanges: true,
        canUndo: result.canUndo || false,
        canRedo: result.canRedo || false,
        documentStats: this.calculateDocumentStats(result.document.content),
      });

      this.debouncedUpdatePreview(result.document.content);
      this.emit('undo-available', this.currentDocument.id, result.canUndo || false);
      this.emit('redo-available', this.currentDocument.id, result.canRedo || false);
      return true;
    }

    return false;
  }

  /**
   * Redo last undone operation
   */
  async redo(): Promise<boolean> {
    if (!this.currentDocument) return false;

    const result = await this.editDocument.redo(this.currentDocument.id);

    if (result.success && result.document) {
      this.currentDocument = result.document;

      this.updateViewModel({
        content: result.document.content,
        isDirty: true,
        hasUnsavedChanges: true,
        canUndo: result.canUndo || false,
        canRedo: result.canRedo || false,
        documentStats: this.calculateDocumentStats(result.document.content),
      });

      this.debouncedUpdatePreview(result.document.content);
      this.emit('undo-available', this.currentDocument.id, result.canUndo || false);
      this.emit('redo-available', this.currentDocument.id, result.canRedo || false);
      return true;
    }

    return false;
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(position: CursorPosition): Promise<void> {
    if (!this.currentViewModel.documentId) return;

    await this.manageEditorState.updateCursorPosition(this.currentViewModel.documentId, position);

    this.updateViewModel({ cursorPosition: position });
    this.emit('cursor-moved', this.currentViewModel.documentId, position);
  }

  /**
   * Update text selection
   */
  async updateSelection(selection: TextSelection): Promise<void> {
    if (!this.currentViewModel.documentId) return;

    await this.manageEditorState.updateSelection(this.currentViewModel.documentId, selection);

    this.updateViewModel({ selection });
    this.emit('selection-changed', this.currentViewModel.documentId, selection);
  }

  /**
   * Update scroll position
   */
  async updateScrollPosition(position: ScrollPosition): Promise<void> {
    if (!this.currentViewModel.documentId) return;

    await this.manageEditorState.updateScrollPosition(this.currentViewModel.documentId, position);

    this.updateViewModel({ scrollPosition: position });
  }

  /**
   * Update zoom level
   */
  async updateZoomLevel(zoomLevel: ZoomLevel): Promise<void> {
    if (!this.currentViewModel.documentId) return;

    await this.manageEditorState.updateZoomLevel(this.currentViewModel.documentId, zoomLevel);

    this.updateViewModel({ zoomLevel });
  }

  /**
   * Toggle preview visibility
   */
  async togglePreview(): Promise<void> {
    if (!this.currentViewModel.documentId) return;

    const result = await this.manageEditorState.togglePreview(this.currentViewModel.documentId);

    if (result.success && result.state) {
      this.updateViewModel({ isPreviewVisible: result.state.isPreviewVisible });

      // Update preview if it was turned on
      if (result.state.isPreviewVisible && this.currentDocument) {
        await this.updatePreview(this.currentDocument.content);
      }
    }
  }

  /**
   * Manually refresh preview
   */
  async refreshPreview(): Promise<void> {
    if (!this.currentDocument) return;
    await this.updatePreview(this.currentDocument.content);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.updateViewModel({ errors: [] });
  }

  /**
   * Clear all warnings
   */
  clearWarnings(): void {
    this.updateViewModel({ warnings: [] });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.removeAllListeners();
  }

  /**
   * Private helper methods
   */

  private createInitialViewModel(): EditorViewModel {
    return {
      documentId: null,
      content: '',
      isLoading: false,
      isDirty: false,
      hasUnsavedChanges: false,
      lastSaved: null,
      cursorPosition: { line: 0, column: 0 },
      selection: this.createEmptySelection(),
      scrollPosition: { top: 0, left: 0 },
      isEditing: false,
      zoomLevel: 1.0,
      isPreviewVisible: true,
      previewHtml: '',
      previewScrollSync: true,
      isPreviewLoading: false,
      previewError: null,
      canUndo: false,
      canRedo: false,
      errors: [],
      warnings: [],
    };
  }

  private createEmptySelection(): TextSelection {
    const position = { line: 0, column: 0 };
    return {
      from: position,
      to: position,
      text: '',
    };
  }

  private updateViewModel(updates: Partial<EditorViewModel>): void {
    this.currentViewModel = { ...this.currentViewModel, ...updates };
    this.emit('state-changed', this.getViewModel());
  }

  private async updatePreview(content: string): Promise<void> {
    if (!this.currentViewModel.isPreviewVisible) return;

    this.updateViewModel({ isPreviewLoading: true, previewError: null });

    try {
      const request: RenderMarkdownRequest = {
        content,
        options: {
          target: 'preview',
          enableSyntaxHighlighting: false, // Disabled for performance in real-time preview
          maxRenderTime: 2000, // 2 second timeout for previews
        },
      };

      const result = await this.renderMarkdown.execute(request);

      if (result.success && result.result) {
        this.updateViewModel({
          previewHtml: result.result.html,
          isPreviewLoading: false,
          lastRenderTime: result.performanceMetrics?.renderTime,
        });

        if (this.currentViewModel.documentId) {
          this.emit('preview-updated', this.currentViewModel.documentId, result.result.html);
        }
      } else {
        const errorMessage = result.errors?.join(', ') || 'Failed to render preview';
        this.updateViewModel({
          isPreviewLoading: false,
          previewError: errorMessage,
        });

        if (this.currentViewModel.documentId) {
          this.emit('preview-error', this.currentViewModel.documentId, errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Preview render failed';
      this.updateViewModel({
        isPreviewLoading: false,
        previewError: errorMessage,
      });

      if (this.currentViewModel.documentId) {
        this.emit('preview-error', this.currentViewModel.documentId, errorMessage);
      }
    }
  }

  private debouncedUpdatePreview(content: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.updatePreview(content);
    }, this.config.debounceDelay || 300);
  }

  private scheduleAutoSave(): void {
    if (!this.config.autoSave || !this.currentDocument || !this.currentViewModel.hasUnsavedChanges) {
      return;
    }

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveDocument();
    }, this.config.autoSaveInterval || 30000); // 30 seconds default
  }

  private calculateDocumentStats(content: string): EditorViewModel['documentStats'] {
    const lines = content.split('\n');
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;

    return {
      wordCount: words,
      characterCount: content.length,
      lineCount: lines.length,
    };
  }

  private setupEventListeners(): void {
    // Setup any additional event listeners here if needed
  }

  // Default implementation factories
  private createDefaultContentValidator(): ContentValidator {
    return {
      validate: () => ({ isValid: true, errors: [] }),
    };
  }

  private createDefaultEditorStateManager(): EditorStateManager {
    return {
      updateEditorState: () => {},
      getEditorState: () => null,
    };
  }

  private createDefaultUndoRedoManager(): UndoRedoManager {
    const snapshots = new Map();
    return {
      saveSnapshot: () => {},
      undo: () => null,
      redo: () => null,
      canUndo: () => false,
      canRedo: () => false,
      clearHistory: () => {},
    };
  }

  private createDefaultDocumentEventPublisher(): DocumentEventPublisher {
    return {
      publishContentChanged: () => {},
      publishDocumentSaved: () => {},
      publishDocumentError: () => {},
    };
  }

  private createDefaultEditorStateEventPublisher(): EditorStateEventPublisher {
    return {
      publishCursorPositionChanged: () => {},
      publishSelectionChanged: () => {},
      publishScrollPositionChanged: () => {},
      publishZoomLevelChanged: () => {},
      publishPreviewToggled: () => {},
    };
  }
}

// Re-export types for use in UI layer
export type {
  EditorPresenterConfig,
  EditorViewModel,
  EditorPresenterEvents,
};