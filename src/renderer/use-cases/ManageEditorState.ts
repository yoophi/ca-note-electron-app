/**
 * ManageEditorState Use Case - Renderer Process
 *
 * Implements the business logic for managing editor state including
 * cursor position, selection, scroll position, and view preferences.
 * This use case maintains Clean Architecture principles through
 * dependency inversion and interface segregation.
 */

import { EditorState, RendererEditorStateService } from '../entities/EditorState';
import type { DocumentId } from '../../shared/entities/Document';
import type {
  CursorPosition,
  TextSelection,
  ScrollPosition,
  ZoomLevel,
} from '../../shared/entities/EditorState';
import { EditorStateValidator, EditorStateUtils } from '../../shared/entities/EditorState';

/**
 * State persistence interface (dependency inversion)
 */
export interface StateStorage {
  save(documentId: DocumentId, state: EditorStateData): Promise<void>;
  load(documentId: DocumentId): Promise<EditorStateData | null>;
  clear(documentId: DocumentId): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * State synchronization interface for multi-window scenarios
 */
export interface StateSynchronizer {
  broadcast(documentId: DocumentId, state: EditorStateData): void;
  subscribe(callback: (documentId: DocumentId, state: EditorStateData) => void): () => void;
  unsubscribe(): void;
}

/**
 * Performance monitoring for state operations
 */
export interface StatePerformanceMonitor {
  recordStateUpdate(documentId: DocumentId, operationType: string, duration: number): void;
  getStateMetrics(documentId: DocumentId): StateMetrics;
}

/**
 * Event publisher for state change notifications
 */
export interface EditorStateEventPublisher {
  publishCursorPositionChanged(documentId: DocumentId, position: CursorPosition): void;
  publishSelectionChanged(documentId: DocumentId, selection: TextSelection): void;
  publishScrollPositionChanged(documentId: DocumentId, position: ScrollPosition): void;
  publishZoomLevelChanged(documentId: DocumentId, zoomLevel: ZoomLevel): void;
  publishPreviewToggled(documentId: DocumentId, isVisible: boolean): void;
}

/**
 * Types for state management
 */
export interface EditorStateData {
  documentId: DocumentId;
  cursorPosition: CursorPosition;
  selection: TextSelection;
  scrollPosition: ScrollPosition;
  isPreviewVisible: boolean;
  zoomLevel: ZoomLevel;
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  lastChangeTimestamp: Date;
  previewScrollSync: boolean;
}

export interface StateMetrics {
  updateCount: number;
  lastUpdateTime: Date;
  averageUpdateTime: number;
  maxUpdateTime: number;
}

export interface ManageEditorStateRequest {
  documentId: DocumentId;
  updates?: Partial<EditorStateData>;
  persistImmediately?: boolean;
  broadcastChanges?: boolean;
}

export interface ManageEditorStateResult {
  success: boolean;
  state?: EditorState;
  errors?: string[];
  metrics?: StateMetrics;
}

export interface RestoreStateRequest {
  documentId: DocumentId;
  createIfNotExists?: boolean;
}

export interface RestoreStateResult {
  success: boolean;
  state?: EditorState;
  wasRestored: boolean;
  errors?: string[];
}

/**
 * ManageEditorState Use Case Implementation
 *
 * This class manages all aspects of editor state with business rules
 * and validation while maintaining independence from UI frameworks.
 */
export class ManageEditorState {
  private states: Map<DocumentId, EditorState> = new Map();
  private debouncedSave: (state: EditorState) => void;

  constructor(
    private storage: StateStorage,
    private synchronizer: StateSynchronizer,
    private performanceMonitor: StatePerformanceMonitor,
    private eventPublisher: EditorStateEventPublisher
  ) {
    this.debouncedSave = RendererEditorStateService.createDebouncedSave();
    this.setupSynchronization();
  }

  /**
   * Update editor state with validation and persistence
   */
  async updateState(request: ManageEditorStateRequest): Promise<ManageEditorStateResult> {
    const startTime = performance.now();

    try {
      // Business Rule 1: Validate document ID exists
      let state = this.states.get(request.documentId);
      if (!state) {
        // Create initial state if it doesn't exist
        state = RendererEditorStateService.restoreOrCreateInitial(request.documentId);
        this.states.set(request.documentId, state);
      }

      // Business Rule 2: Apply updates with validation
      if (request.updates) {
        this.applyStateUpdates(state, request.updates);
      }

      // Business Rule 3: Persist state if requested
      if (request.persistImmediately) {
        await this.persistState(state);
      } else {
        this.debouncedSave(state);
      }

      // Business Rule 4: Broadcast changes to other instances
      if (request.broadcastChanges !== false) {
        this.synchronizer.broadcast(request.documentId, this.stateToData(state));
      }

      // Business Rule 5: Record performance metrics
      const duration = performance.now() - startTime;
      this.performanceMonitor.recordStateUpdate(request.documentId, 'update', duration);

      return {
        success: true,
        state,
        metrics: this.performanceMonitor.getStateMetrics(request.documentId),
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.performanceMonitor.recordStateUpdate(request.documentId, 'update-error', duration);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error updating state'],
      };
    }
  }

  /**
   * Update cursor position with validation
   */
  async updateCursorPosition(
    documentId: DocumentId,
    position: CursorPosition
  ): Promise<ManageEditorStateResult> {
    try {
      // Business Rule: Validate cursor position
      EditorStateValidator.validateCursorPosition(position);

      const result = await this.updateState({
        documentId,
        updates: { cursorPosition: position },
        broadcastChanges: true,
      });

      if (result.success) {
        this.eventPublisher.publishCursorPositionChanged(documentId, position);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Invalid cursor position'],
      };
    }
  }

  /**
   * Update text selection with validation
   */
  async updateSelection(
    documentId: DocumentId,
    selection: TextSelection
  ): Promise<ManageEditorStateResult> {
    try {
      // Business Rule: Validate selection
      EditorStateValidator.validateSelection(selection);

      const result = await this.updateState({
        documentId,
        updates: {
          selection,
          cursorPosition: selection.to, // Cursor follows selection end
        },
        broadcastChanges: true,
      });

      if (result.success) {
        this.eventPublisher.publishSelectionChanged(documentId, selection);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Invalid selection'],
      };
    }
  }

  /**
   * Update scroll position
   */
  async updateScrollPosition(
    documentId: DocumentId,
    position: ScrollPosition
  ): Promise<ManageEditorStateResult> {
    try {
      // Business Rule: Validate scroll position
      EditorStateValidator.validateScrollPosition(position);

      const result = await this.updateState({
        documentId,
        updates: { scrollPosition: position },
        broadcastChanges: false, // Don't sync scroll position across instances
      });

      if (result.success) {
        this.eventPublisher.publishScrollPositionChanged(documentId, position);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Invalid scroll position'],
      };
    }
  }

  /**
   * Update zoom level with validation
   */
  async updateZoomLevel(
    documentId: DocumentId,
    zoomLevel: ZoomLevel
  ): Promise<ManageEditorStateResult> {
    try {
      // Business Rule: Validate zoom level
      EditorStateValidator.validateZoomLevel(zoomLevel);

      const result = await this.updateState({
        documentId,
        updates: { zoomLevel },
        broadcastChanges: true,
      });

      if (result.success) {
        this.eventPublisher.publishZoomLevelChanged(documentId, zoomLevel);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Invalid zoom level'],
      };
    }
  }

  /**
   * Toggle preview visibility
   */
  async togglePreview(documentId: DocumentId): Promise<ManageEditorStateResult> {
    const state = this.states.get(documentId);
    if (!state) {
      return {
        success: false,
        errors: ['Editor state not found'],
      };
    }

    const newVisibility = !state.isPreviewVisible;

    const result = await this.updateState({
      documentId,
      updates: { isPreviewVisible: newVisibility },
      broadcastChanges: true,
    });

    if (result.success) {
      this.eventPublisher.publishPreviewToggled(documentId, newVisibility);
    }

    return result;
  }

  /**
   * Restore editor state from storage
   */
  async restoreState(request: RestoreStateRequest): Promise<RestoreStateResult> {
    try {
      // Business Rule: Try to load from storage first
      const storedData = await this.storage.load(request.documentId);

      if (storedData) {
        // Restore from storage
        const state = this.dataToState(storedData);
        this.states.set(request.documentId, state);

        return {
          success: true,
          state,
          wasRestored: true,
        };
      } else if (request.createIfNotExists) {
        // Create new state if not found
        const state = RendererEditorStateService.restoreOrCreateInitial(request.documentId);
        this.states.set(request.documentId, state);

        return {
          success: true,
          state,
          wasRestored: false,
        };
      } else {
        return {
          success: false,
          wasRestored: false,
          errors: ['State not found and createIfNotExists is false'],
        };
      }
    } catch (error) {
      return {
        success: false,
        wasRestored: false,
        errors: [error instanceof Error ? error.message : 'Failed to restore state'],
      };
    }
  }

  /**
   * Get current editor state
   */
  getState(documentId: DocumentId): EditorState | null {
    return this.states.get(documentId) || null;
  }

  /**
   * Remove editor state for document
   */
  async removeState(documentId: DocumentId): Promise<void> {
    this.states.delete(documentId);
    await this.storage.clear(documentId);
  }

  /**
   * Clear all states
   */
  async clearAllStates(): Promise<void> {
    this.states.clear();
    await this.storage.clearAll();
  }

  /**
   * Get all active document IDs
   */
  getActiveDocumentIds(): DocumentId[] {
    return Array.from(this.states.keys());
  }

  /**
   * Check if document has active editor state
   */
  hasState(documentId: DocumentId): boolean {
    return this.states.has(documentId);
  }

  /**
   * Apply state updates with business rule validation
   */
  private applyStateUpdates(state: EditorState, updates: Partial<EditorStateData>): void {
    if (updates.cursorPosition) {
      EditorStateValidator.validateCursorPosition(updates.cursorPosition);
      state.updateCursor(updates.cursorPosition);
    }

    if (updates.selection) {
      EditorStateValidator.validateSelection(updates.selection);
      state.updateSelection(updates.selection);
    }

    if (updates.scrollPosition) {
      EditorStateValidator.validateScrollPosition(updates.scrollPosition);
      state.updateScroll(updates.scrollPosition);
    }

    if (updates.zoomLevel !== undefined) {
      EditorStateValidator.validateZoomLevel(updates.zoomLevel);
      state.setZoomLevel(updates.zoomLevel);
    }

    if (updates.isPreviewVisible !== undefined) {
      state.isPreviewVisible = updates.isPreviewVisible;
    }

    if (updates.previewScrollSync !== undefined) {
      state.previewScrollSync = updates.previewScrollSync;
    }

    if (updates.isDirty !== undefined) {
      if (updates.isDirty) {
        state.markAsChanged();
      } else {
        state.markAsSaved();
      }
    }
  }

  /**
   * Persist state to storage
   */
  private async persistState(state: EditorState): Promise<void> {
    const data = this.stateToData(state);
    await this.storage.save(state.documentId, data);
  }

  /**
   * Convert EditorState to serializable data
   */
  private stateToData(state: EditorState): EditorStateData {
    return {
      documentId: state.documentId,
      cursorPosition: state.cursorPosition,
      selection: state.selection,
      scrollPosition: state.scrollPosition,
      isPreviewVisible: state.isPreviewVisible,
      zoomLevel: state.zoomLevel,
      isDirty: state.isDirty,
      hasUnsavedChanges: state.hasUnsavedChanges,
      lastChangeTimestamp: state.lastChangeTimestamp,
      previewScrollSync: state.previewScrollSync,
    };
  }

  /**
   * Convert serializable data to EditorState
   */
  private dataToState(data: EditorStateData): EditorState {
    const sharedState = {
      documentId: data.documentId,
      cursorPosition: data.cursorPosition,
      selection: data.selection,
      scrollPosition: data.scrollPosition,
      isPreviewVisible: data.isPreviewVisible,
      zoomLevel: data.zoomLevel,
    };

    const state = EditorState.fromSharedState(sharedState);

    // Apply renderer-specific properties
    state.isDirty = data.isDirty;
    state.hasUnsavedChanges = data.hasUnsavedChanges;
    state.lastChangeTimestamp = data.lastChangeTimestamp;
    state.previewScrollSync = data.previewScrollSync;

    return state;
  }

  /**
   * Setup state synchronization with other instances
   */
  private setupSynchronization(): void {
    this.synchronizer.subscribe((documentId: DocumentId, stateData: EditorStateData) => {
      // Business Rule: Only sync if we have this document and the change is newer
      const currentState = this.states.get(documentId);
      if (currentState && stateData.lastChangeTimestamp > currentState.lastChangeTimestamp) {
        // Apply external changes without broadcasting
        const updatedState = this.dataToState(stateData);
        this.states.set(documentId, updatedState);
      }
    });
  }
}

/**
 * Default implementations
 */
export class LocalStorageStateStorage implements StateStorage {
  private readonly keyPrefix = 'editorState';

  async save(documentId: DocumentId, state: EditorStateData): Promise<void> {
    try {
      const key = `${this.keyPrefix}-${documentId}`;
      const serialized = JSON.stringify({
        ...state,
        lastChangeTimestamp: state.lastChangeTimestamp.toISOString(),
      });
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.warn('Failed to save editor state to localStorage:', error);
    }
  }

  async load(documentId: DocumentId): Promise<EditorStateData | null> {
    try {
      const key = `${this.keyPrefix}-${documentId}`;
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        return null;
      }

      const data = JSON.parse(serialized);
      return {
        ...data,
        lastChangeTimestamp: new Date(data.lastChangeTimestamp),
      };
    } catch (error) {
      console.warn('Failed to load editor state from localStorage:', error);
      return null;
    }
  }

  async clear(documentId: DocumentId): Promise<void> {
    try {
      const key = `${this.keyPrefix}-${documentId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear editor state from localStorage:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.keyPrefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all editor states from localStorage:', error);
    }
  }
}

export class DefaultStatePerformanceMonitor implements StatePerformanceMonitor {
  private metrics: Map<DocumentId, StateMetrics> = new Map();

  recordStateUpdate(documentId: DocumentId, operationType: string, duration: number): void {
    const current = this.metrics.get(documentId) || {
      updateCount: 0,
      lastUpdateTime: new Date(),
      averageUpdateTime: 0,
      maxUpdateTime: 0,
    };

    const newMetrics: StateMetrics = {
      updateCount: current.updateCount + 1,
      lastUpdateTime: new Date(),
      averageUpdateTime: (current.averageUpdateTime * current.updateCount + duration) / (current.updateCount + 1),
      maxUpdateTime: Math.max(current.maxUpdateTime, duration),
    };

    this.metrics.set(documentId, newMetrics);
  }

  getStateMetrics(documentId: DocumentId): StateMetrics {
    return this.metrics.get(documentId) || {
      updateCount: 0,
      lastUpdateTime: new Date(),
      averageUpdateTime: 0,
      maxUpdateTime: 0,
    };
  }
}

/**
 * Export types for use in adapters layer
 */
export type {
  StateStorage,
  StateSynchronizer,
  StatePerformanceMonitor,
  EditorStateEventPublisher,
  EditorStateData,
  StateMetrics,
  ManageEditorStateRequest,
  ManageEditorStateResult,
  RestoreStateRequest,
  RestoreStateResult,
};