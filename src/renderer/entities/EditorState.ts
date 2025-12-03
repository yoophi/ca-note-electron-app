/**
 * EditorState Entity - Renderer Process
 *
 * Renderer process representation of editor state with UI-specific behavior
 * and CodeMirror integration helpers.
 */

import type {
  EditorState as SharedEditorState,
  CursorPosition,
  TextSelection,
  ScrollPosition,
  ZoomLevel,
} from '../../shared/entities/EditorState';
import {
  EditorStateValidator,
  EditorStateUtils,
  EditorStateFactory,
} from '../../shared/entities/EditorState';
import type { DocumentId } from '../../shared/entities/Document';

/**
 * Extended editor state with UI-specific properties
 */
export interface RendererEditorState extends SharedEditorState {
  isDirty: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastChangeTimestamp: Date;
  previewScrollSync: boolean;
}

/**
 * Renderer process EditorState entity with UI capabilities
 */
export class EditorState implements RendererEditorState {
  public documentId: DocumentId;
  public cursorPosition: CursorPosition;
  public selection: TextSelection;
  public scrollPosition: ScrollPosition;
  public isPreviewVisible: boolean;
  public zoomLevel: ZoomLevel;
  public isDirty: boolean;
  public isLoading: boolean;
  public hasUnsavedChanges: boolean;
  public lastChangeTimestamp: Date;
  public previewScrollSync: boolean;

  constructor(state: SharedEditorState) {
    EditorStateValidator.validateEditorState(state);

    this.documentId = state.documentId;
    this.cursorPosition = { ...state.cursorPosition };
    this.selection = {
      from: { ...state.selection.from },
      to: { ...state.selection.to },
      text: state.selection.text,
    };
    this.scrollPosition = { ...state.scrollPosition };
    this.isPreviewVisible = state.isPreviewVisible;
    this.zoomLevel = state.zoomLevel;

    // Renderer-specific properties
    this.isDirty = false;
    this.isLoading = false;
    this.hasUnsavedChanges = false;
    this.lastChangeTimestamp = new Date();
    this.previewScrollSync = true;
  }

  /**
   * Update cursor position and mark as changed
   */
  updateCursor(newPosition: CursorPosition): void {
    EditorStateValidator.validateCursorPosition(newPosition);

    this.cursorPosition = { ...newPosition };
    this.selection = {
      from: { ...newPosition },
      to: { ...newPosition },
      text: '',
    };
    this.markAsChanged();
  }

  /**
   * Update text selection and mark as changed
   */
  updateSelection(newSelection: TextSelection): void {
    EditorStateValidator.validateSelection(newSelection);

    this.selection = {
      from: { ...newSelection.from },
      to: { ...newSelection.to },
      text: newSelection.text,
    };
    this.cursorPosition = { ...newSelection.to };
    this.markAsChanged();
  }

  /**
   * Update scroll position
   */
  updateScroll(newPosition: ScrollPosition): void {
    EditorStateValidator.validateScrollPosition(newPosition);

    this.scrollPosition = { ...newPosition };
  }

  /**
   * Toggle preview visibility
   */
  togglePreview(): void {
    this.isPreviewVisible = !this.isPreviewVisible;
    this.markAsChanged();
  }

  /**
   * Update zoom level
   */
  setZoomLevel(newZoom: ZoomLevel): void {
    EditorStateValidator.validateZoomLevel(newZoom);

    this.zoomLevel = newZoom;
    this.markAsChanged();
  }

  /**
   * Mark state as dirty and changed
   */
  markAsChanged(): void {
    this.isDirty = true;
    this.hasUnsavedChanges = true;
    this.lastChangeTimestamp = new Date();
  }

  /**
   * Mark state as saved/clean
   */
  markAsSaved(): void {
    this.isDirty = false;
    this.hasUnsavedChanges = false;
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
  }

  /**
   * Toggle scroll synchronization between editor and preview
   */
  toggleScrollSync(): void {
    this.previewScrollSync = !this.previewScrollSync;
  }

  /**
   * Reset to initial state for new document
   */
  resetForNewDocument(documentId: DocumentId): void {
    this.documentId = documentId;
    this.cursorPosition = EditorStateUtils.createEmptyCursorPosition();
    this.selection = EditorStateUtils.createEmptySelection();
    this.scrollPosition = EditorStateUtils.createEmptyScrollPosition();
    this.isPreviewVisible = true;
    this.zoomLevel = 1.0;
    this.isDirty = false;
    this.isLoading = false;
    this.hasUnsavedChanges = false;
    this.lastChangeTimestamp = new Date();
    this.previewScrollSync = true;
  }

  /**
   * Check if selection is active (not empty)
   */
  hasActiveSelection(): boolean {
    return !EditorStateUtils.isSelectionEmpty(this.selection);
  }

  /**
   * Get selected text length
   */
  getSelectionLength(): number {
    return EditorStateUtils.getSelectionLength(this.selection);
  }

  /**
   * Convert to shared editor state for IPC
   */
  toSharedState(): SharedEditorState {
    return {
      documentId: this.documentId,
      cursorPosition: { ...this.cursorPosition },
      selection: {
        from: { ...this.selection.from },
        to: { ...this.selection.to },
        text: this.selection.text,
      },
      scrollPosition: { ...this.scrollPosition },
      isPreviewVisible: this.isPreviewVisible,
      zoomLevel: this.zoomLevel,
    };
  }

  /**
   * Create EditorState from shared state
   */
  static fromSharedState(state: SharedEditorState): EditorState {
    return new EditorState(state);
  }
}

/**
 * EditorState management and persistence utilities
 */
export class RendererEditorStateService {
  private static readonly STORAGE_KEY = 'editorState';
  private static readonly DEBOUNCE_DELAY = 300;

  /**
   * Save editor state to local storage
   */
  static saveToStorage(state: EditorState): void {
    try {
      const serializable = {
        documentId: state.documentId,
        cursorPosition: state.cursorPosition,
        scrollPosition: state.scrollPosition,
        isPreviewVisible: state.isPreviewVisible,
        zoomLevel: state.zoomLevel,
        previewScrollSync: state.previewScrollSync,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save editor state to storage:', error);
    }
  }

  /**
   * Load editor state from local storage
   */
  static loadFromStorage(documentId: DocumentId): Partial<RendererEditorState> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      if (parsed.documentId !== documentId) {
        return null; // Different document
      }

      return {
        cursorPosition: parsed.cursorPosition,
        scrollPosition: parsed.scrollPosition,
        isPreviewVisible: parsed.isPreviewVisible ?? true,
        zoomLevel: parsed.zoomLevel ?? 1.0,
        previewScrollSync: parsed.previewScrollSync ?? true,
      };
    } catch (error) {
      console.warn('Failed to load editor state from storage:', error);
      return null;
    }
  }

  /**
   * Clear stored editor state
   */
  static clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear editor state storage:', error);
    }
  }

  /**
   * Create debounced save function for performance
   */
  static createDebouncedSave(): (state: EditorState) => void {
    let timeoutId: NodeJS.Timeout;

    return (state: EditorState) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.saveToStorage(state);
      }, this.DEBOUNCE_DELAY);
    };
  }

  /**
   * Restore editor state or create initial state
   */
  static restoreOrCreateInitial(documentId: DocumentId): EditorState {
    const stored = this.loadFromStorage(documentId);

    if (stored) {
      try {
        const baseState = EditorStateFactory.createInitial(documentId);
        const editorState = new EditorState(baseState);

        // Apply stored state
        if (stored.cursorPosition) {
          editorState.updateCursor(stored.cursorPosition);
        }
        if (stored.scrollPosition) {
          editorState.updateScroll(stored.scrollPosition);
        }
        if (stored.isPreviewVisible !== undefined) {
          editorState.isPreviewVisible = stored.isPreviewVisible;
        }
        if (stored.zoomLevel !== undefined) {
          editorState.setZoomLevel(stored.zoomLevel);
        }
        if (stored.previewScrollSync !== undefined) {
          editorState.previewScrollSync = stored.previewScrollSync;
        }

        editorState.markAsSaved(); // Don't mark as dirty on restore
        return editorState;
      } catch (error) {
        console.warn('Failed to restore editor state, creating new:', error);
      }
    }

    // Create fresh state
    const baseState = EditorStateFactory.createInitial(documentId);
    return new EditorState(baseState);
  }
}