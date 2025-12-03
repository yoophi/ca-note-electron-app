/**
 * PreviewSynchronizationService
 *
 * Handles real-time synchronization between the markdown editor and preview panes.
 * This service manages scroll position synchronization, cursor-to-preview mapping,
 * and optimized preview updates with debouncing strategies.
 */

import { EventEmitter } from 'events';
import type { CursorPosition, ScrollPosition } from '../../../shared/entities/EditorState';
import type { MarkdownContent } from '../../../shared/entities/Document';

/**
 * Scroll synchronization modes
 */
export type SyncMode = 'editor-to-preview' | 'preview-to-editor' | 'bidirectional' | 'disabled';

/**
 * Configuration for preview synchronization
 */
export interface PreviewSyncConfig {
  // Debouncing settings
  scrollDebounceDelay?: number;
  contentDebounceDelay?: number;
  cursorDebounceDelay?: number;

  // Synchronization settings
  syncMode?: SyncMode;
  enableScrollSync?: boolean;
  enableCursorSync?: boolean;
  smoothScrolling?: boolean;

  // Performance settings
  maxContentLength?: number;
  skipSyncThreshold?: number;
  throttleScrollUpdates?: boolean;

  // Mapping settings
  enableLineMapping?: boolean;
  enableHeadingSync?: boolean;
}

/**
 * Scroll mapping result
 */
export interface ScrollMapping {
  editorLine: number;
  previewElement?: Element;
  previewScrollTop?: number;
  confidence: number; // 0-1, how confident we are in the mapping
}

/**
 * Synchronization state
 */
export interface SyncState {
  isEditorScrolling: boolean;
  isPreviewScrolling: boolean;
  lastEditorScroll: number;
  lastPreviewScroll: number;
  lastContentUpdate: number;
  syncMode: SyncMode;
}

/**
 * Events emitted by the synchronization service
 */
export interface PreviewSyncEvents {
  'scroll-mapped': [ScrollMapping];
  'sync-mode-changed': [SyncMode];
  'sync-performance': [{ operation: string; duration: number; success: boolean }];
}

/**
 * PreviewSynchronizationService implementation
 */
export class PreviewSynchronizationService extends EventEmitter {
  private config: Required<PreviewSyncConfig>;
  private state: SyncState;

  // Debounce timers
  private scrollDebounceTimer: NodeJS.Timeout | null = null;
  private contentDebounceTimer: NodeJS.Timeout | null = null;
  private cursorDebounceTimer: NodeJS.Timeout | null = null;

  // Element references
  private editorElement: Element | null = null;
  private previewElement: Element | null = null;

  // Content mapping
  private lineToElementMap: Map<number, Element> = new Map();
  private elementToLineMap: Map<Element, number> = new Map();
  private headingMap: Map<string, Element> = new Map();

  // Performance tracking
  private lastMappingUpdate = 0;
  private mappingCacheValid = false;

  constructor(config: PreviewSyncConfig = {}) {
    super();

    // Initialize configuration with defaults
    this.config = {
      scrollDebounceDelay: 50,
      contentDebounceDelay: 300,
      cursorDebounceDelay: 100,
      syncMode: 'bidirectional',
      enableScrollSync: true,
      enableCursorSync: true,
      smoothScrolling: true,
      maxContentLength: 100000,
      skipSyncThreshold: 1000,
      throttleScrollUpdates: true,
      enableLineMapping: true,
      enableHeadingSync: true,
      ...config,
    };

    // Initialize state
    this.state = {
      isEditorScrolling: false,
      isPreviewScrolling: false,
      lastEditorScroll: 0,
      lastPreviewScroll: 0,
      lastContentUpdate: 0,
      syncMode: this.config.syncMode,
    };
  }

  /**
   * Initialize synchronization with editor and preview elements
   */
  initialize(editorElement: Element, previewElement: Element): void {
    this.editorElement = editorElement;
    this.previewElement = previewElement;

    this.setupScrollListeners();
    this.buildElementMapping();
  }

  /**
   * Update content and rebuild mapping
   */
  updateContent(content: MarkdownContent): void {
    if (content.length > this.config.maxContentLength) {
      console.warn('Content length exceeds synchronization threshold, disabling sync');
      this.setSyncMode('disabled');
      return;
    }

    this.clearDebounce(this.contentDebounceTimer);

    this.contentDebounceTimer = setTimeout(() => {
      this.buildElementMapping();
      this.state.lastContentUpdate = Date.now();
    }, this.config.contentDebounceDelay);
  }

  /**
   * Synchronize scroll position from editor to preview
   */
  syncEditorToPreview(scrollPosition: ScrollPosition, cursorPosition?: CursorPosition): void {
    if (!this.canSync('editor-to-preview')) return;

    this.clearDebounce(this.scrollDebounceTimer);

    this.scrollDebounceTimer = setTimeout(() => {
      this.performEditorToPreviewSync(scrollPosition, cursorPosition);
    }, this.config.scrollDebounceDelay);
  }

  /**
   * Synchronize scroll position from preview to editor
   */
  syncPreviewToEditor(scrollPosition: ScrollPosition): void {
    if (!this.canSync('preview-to-editor')) return;

    this.clearDebounce(this.scrollDebounceTimer);

    this.scrollDebounceTimer = setTimeout(() => {
      this.performPreviewToEditorSync(scrollPosition);
    }, this.config.scrollDebounceDelay);
  }

  /**
   * Synchronize cursor position to preview highlight
   */
  syncCursorToPreview(cursorPosition: CursorPosition): void {
    if (!this.config.enableCursorSync || !this.canSync('editor-to-preview')) return;

    this.clearDebounce(this.cursorDebounceTimer);

    this.cursorDebounceTimer = setTimeout(() => {
      this.performCursorSync(cursorPosition);
    }, this.config.cursorDebounceDelay);
  }

  /**
   * Scroll to specific heading in preview
   */
  scrollToHeading(headingText: string): void {
    if (!this.previewElement) return;

    const headingElement = this.findHeadingElement(headingText);
    if (headingElement) {
      this.scrollToElement(headingElement);
    }
  }

  /**
   * Set synchronization mode
   */
  setSyncMode(mode: SyncMode): void {
    this.state.syncMode = mode;
    this.config.syncMode = mode;
    this.emit('sync-mode-changed', mode);
  }

  /**
   * Get current synchronization state
   */
  getSyncState(): SyncState {
    return { ...this.state };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearAllTimers();
    this.removeScrollListeners();
    this.removeAllListeners();
  }

  /**
   * Private implementation methods
   */

  private performEditorToPreviewSync(scrollPosition: ScrollPosition, cursorPosition?: CursorPosition): void {
    if (!this.previewElement) return;

    const startTime = performance.now();

    try {
      let targetScrollTop: number;

      if (cursorPosition && this.config.enableLineMapping) {
        // Use cursor position for more accurate mapping
        const mapping = this.mapLineToPreview(cursorPosition.line);
        targetScrollTop = mapping.previewScrollTop || this.calculateProportionalScroll(scrollPosition);
      } else {
        // Fall back to proportional scrolling
        targetScrollTop = this.calculateProportionalScroll(scrollPosition);
      }

      this.scrollPreviewTo(targetScrollTop);

      const duration = performance.now() - startTime;
      this.emit('sync-performance', { operation: 'editor-to-preview', duration, success: true });

    } catch (error) {
      const duration = performance.now() - startTime;
      console.warn('Failed to sync editor to preview:', error);
      this.emit('sync-performance', { operation: 'editor-to-preview', duration, success: false });
    }
  }

  private performPreviewToEditorSync(scrollPosition: ScrollPosition): void {
    if (!this.editorElement) return;

    const startTime = performance.now();

    try {
      const targetScrollTop = this.calculateProportionalScrollReverse(scrollPosition);
      this.scrollEditorTo(targetScrollTop);

      const duration = performance.now() - startTime;
      this.emit('sync-performance', { operation: 'preview-to-editor', duration, success: true });

    } catch (error) {
      const duration = performance.now() - startTime;
      console.warn('Failed to sync preview to editor:', error);
      this.emit('sync-performance', { operation: 'preview-to-editor', duration, success: false });
    }
  }

  private performCursorSync(cursorPosition: CursorPosition): void {
    if (!this.previewElement) return;

    const mapping = this.mapLineToPreview(cursorPosition.line);

    if (mapping.previewElement) {
      this.highlightPreviewElement(mapping.previewElement);
      this.emit('scroll-mapped', mapping);
    }
  }

  private mapLineToPreview(lineNumber: number): ScrollMapping {
    // Try exact line mapping first
    const exactElement = this.lineToElementMap.get(lineNumber);
    if (exactElement) {
      return {
        editorLine: lineNumber,
        previewElement: exactElement,
        previewScrollTop: this.getElementScrollPosition(exactElement),
        confidence: 1.0,
      };
    }

    // Try finding nearest mapped line
    const nearestMapping = this.findNearestMapping(lineNumber);
    if (nearestMapping) {
      return nearestMapping;
    }

    // Fall back to proportional mapping
    return {
      editorLine: lineNumber,
      confidence: 0.3,
    };
  }

  private buildElementMapping(): void {
    if (!this.previewElement || !this.config.enableLineMapping) return;

    if (Date.now() - this.lastMappingUpdate < 1000 && this.mappingCacheValid) {
      return; // Skip if mapping was recently updated
    }

    const startTime = performance.now();

    // Clear existing mappings
    this.lineToElementMap.clear();
    this.elementToLineMap.clear();
    this.headingMap.clear();

    try {
      // Find all elements with data attributes or identifiable content
      const elements = this.previewElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote');

      elements.forEach((element, index) => {
        // Map headings
        if (element.tagName.startsWith('H')) {
          const headingText = element.textContent?.trim();
          if (headingText) {
            this.headingMap.set(headingText, element);
          }
        }

        // Rough line mapping (simplified)
        const estimatedLine = Math.floor(index * 1.5); // Rough estimate
        this.lineToElementMap.set(estimatedLine, element);
        this.elementToLineMap.set(element, estimatedLine);
      });

      this.lastMappingUpdate = Date.now();
      this.mappingCacheValid = true;

      const duration = performance.now() - startTime;
      this.emit('sync-performance', { operation: 'build-mapping', duration, success: true });

    } catch (error) {
      console.warn('Failed to build element mapping:', error);
      this.mappingCacheValid = false;
    }
  }

  private findNearestMapping(lineNumber: number): ScrollMapping | null {
    let bestMatch: { line: number; element: Element; distance: number } | null = null;

    for (const [mappedLine, element] of this.lineToElementMap) {
      const distance = Math.abs(mappedLine - lineNumber);

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { line: mappedLine, element, distance };
      }
    }

    if (bestMatch && bestMatch.distance <= 10) { // Within 10 lines
      return {
        editorLine: lineNumber,
        previewElement: bestMatch.element,
        previewScrollTop: this.getElementScrollPosition(bestMatch.element),
        confidence: Math.max(0.1, 1 - (bestMatch.distance / 10)),
      };
    }

    return null;
  }

  private calculateProportionalScroll(scrollPosition: ScrollPosition): number {
    if (!this.editorElement || !this.previewElement) return 0;

    const editorHeight = this.editorElement.scrollHeight;
    const editorViewHeight = this.editorElement.clientHeight;
    const previewHeight = this.previewElement.scrollHeight;
    const previewViewHeight = this.previewElement.clientHeight;

    const editorScrollRatio = scrollPosition.top / (editorHeight - editorViewHeight);
    return editorScrollRatio * (previewHeight - previewViewHeight);
  }

  private calculateProportionalScrollReverse(scrollPosition: ScrollPosition): number {
    if (!this.editorElement || !this.previewElement) return 0;

    const editorHeight = this.editorElement.scrollHeight;
    const editorViewHeight = this.editorElement.clientHeight;
    const previewHeight = this.previewElement.scrollHeight;
    const previewViewHeight = this.previewElement.clientHeight;

    const previewScrollRatio = scrollPosition.top / (previewHeight - previewViewHeight);
    return previewScrollRatio * (editorHeight - editorViewHeight);
  }

  private scrollPreviewTo(scrollTop: number): void {
    if (!this.previewElement) return;

    this.state.isPreviewScrolling = true;

    if (this.config.smoothScrolling) {
      this.previewElement.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    } else {
      this.previewElement.scrollTop = scrollTop;
    }

    setTimeout(() => {
      this.state.isPreviewScrolling = false;
    }, 100);
  }

  private scrollEditorTo(scrollTop: number): void {
    if (!this.editorElement) return;

    this.state.isEditorScrolling = true;

    if (this.config.smoothScrolling) {
      this.editorElement.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    } else {
      this.editorElement.scrollTop = scrollTop;
    }

    setTimeout(() => {
      this.state.isEditorScrolling = false;
    }, 100);
  }

  private scrollToElement(element: Element): void {
    element.scrollIntoView({
      behavior: this.config.smoothScrolling ? 'smooth' : 'auto',
      block: 'start',
    });
  }

  private highlightPreviewElement(element: Element): void {
    // Remove previous highlights
    this.previewElement?.querySelectorAll('.cursor-highlight').forEach(el => {
      el.classList.remove('cursor-highlight');
    });

    // Add highlight to current element
    element.classList.add('cursor-highlight');

    // Remove highlight after a delay
    setTimeout(() => {
      element.classList.remove('cursor-highlight');
    }, 1000);
  }

  private findHeadingElement(headingText: string): Element | null {
    return this.headingMap.get(headingText) || null;
  }

  private getElementScrollPosition(element: Element): number {
    if (!this.previewElement) return 0;

    const rect = element.getBoundingClientRect();
    const containerRect = this.previewElement.getBoundingClientRect();

    return rect.top - containerRect.top + this.previewElement.scrollTop;
  }

  private setupScrollListeners(): void {
    if (!this.editorElement || !this.previewElement) return;

    // Editor scroll listener
    this.editorElement.addEventListener('scroll', (event) => {
      if (!this.state.isEditorScrolling && this.canSync('editor-to-preview')) {
        const target = event.target as Element;
        this.syncEditorToPreview({ top: target.scrollTop, left: target.scrollLeft });
      }
    });

    // Preview scroll listener
    this.previewElement.addEventListener('scroll', (event) => {
      if (!this.state.isPreviewScrolling && this.canSync('preview-to-editor')) {
        const target = event.target as Element;
        this.syncPreviewToEditor({ top: target.scrollTop, left: target.scrollLeft });
      }
    });
  }

  private removeScrollListeners(): void {
    // In a real implementation, you'd store the listener references and remove them
    // This is simplified for demonstration
  }

  private canSync(direction: 'editor-to-preview' | 'preview-to-editor'): boolean {
    if (!this.config.enableScrollSync) return false;

    switch (this.state.syncMode) {
      case 'disabled':
        return false;
      case 'bidirectional':
        return true;
      case 'editor-to-preview':
        return direction === 'editor-to-preview';
      case 'preview-to-editor':
        return direction === 'preview-to-editor';
      default:
        return false;
    }
  }

  private clearDebounce(timer: NodeJS.Timeout | null): void {
    if (timer) {
      clearTimeout(timer);
    }
  }

  private clearAllTimers(): void {
    this.clearDebounce(this.scrollDebounceTimer);
    this.clearDebounce(this.contentDebounceTimer);
    this.clearDebounce(this.cursorDebounceTimer);
  }
}

/**
 * Factory function for creating configured preview synchronization service
 */
export function createPreviewSyncService(config?: PreviewSyncConfig): PreviewSynchronizationService {
  return new PreviewSynchronizationService(config);
}

// Re-export types
export type {
  SyncMode,
  PreviewSyncConfig,
  ScrollMapping,
  SyncState,
  PreviewSyncEvents,
};