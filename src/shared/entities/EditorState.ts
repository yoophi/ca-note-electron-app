/**
 * EditorState Entity - Shared across renderer process components
 *
 * Represents the current state of the markdown editor including cursor position,
 * selection, scroll position, and UI configuration.
 */

import type { DocumentId } from './Document';

export interface CursorPosition {
  line: number; // 0-based line number
  column: number; // 0-based column number
}

export interface TextSelection {
  from: CursorPosition;
  to: CursorPosition;
  text: string; // Selected text content
}

export interface ScrollPosition {
  top: number; // Pixels from top
  left: number; // Pixels from left
}

export type ZoomLevel = number; // 0.5 to 3.0, default 1.0

export interface EditorState {
  documentId: DocumentId;
  cursorPosition: CursorPosition;
  selection: TextSelection;
  scrollPosition: ScrollPosition;
  isPreviewVisible: boolean;
  zoomLevel: ZoomLevel;
}

/**
 * EditorState validation and business rules
 */
export class EditorStateValidator {
  static validateCursorPosition(position: CursorPosition): void {
    if (position.line < 0 || position.column < 0) {
      throw new Error('Cursor position must be non-negative');
    }

    if (!Number.isInteger(position.line) || !Number.isInteger(position.column)) {
      throw new Error('Cursor position must be integers');
    }
  }

  static validateSelection(selection: TextSelection): void {
    this.validateCursorPosition(selection.from);
    this.validateCursorPosition(selection.to);

    if (selection.from.line > selection.to.line ||
        (selection.from.line === selection.to.line && selection.from.column > selection.to.column)) {
      throw new Error('Selection "from" position must be before "to" position');
    }
  }

  static validateScrollPosition(position: ScrollPosition): void {
    if (position.top < 0 || position.left < 0) {
      throw new Error('Scroll position must be non-negative');
    }
  }

  static validateZoomLevel(zoom: ZoomLevel): void {
    if (zoom < 0.5 || zoom > 3.0) {
      throw new Error('Zoom level must be between 0.5 and 3.0');
    }
  }

  static validateEditorState(state: EditorState): void {
    this.validateCursorPosition(state.cursorPosition);
    this.validateSelection(state.selection);
    this.validateScrollPosition(state.scrollPosition);
    this.validateZoomLevel(state.zoomLevel);

    if (!state.documentId) {
      throw new Error('Editor state must reference a valid document ID');
    }
  }
}

/**
 * EditorState utility functions
 */
export class EditorStateUtils {
  static createEmptyCursorPosition(): CursorPosition {
    return { line: 0, column: 0 };
  }

  static createEmptySelection(): TextSelection {
    const emptyPosition = this.createEmptyCursorPosition();
    return {
      from: emptyPosition,
      to: emptyPosition,
      text: '',
    };
  }

  static createEmptyScrollPosition(): ScrollPosition {
    return { top: 0, left: 0 };
  }

  static isSelectionEmpty(selection: TextSelection): boolean {
    return selection.from.line === selection.to.line &&
           selection.from.column === selection.to.column;
  }

  static getSelectionLength(selection: TextSelection): number {
    return selection.text.length;
  }

  static updateCursorPosition(state: EditorState, newPosition: CursorPosition): EditorState {
    EditorStateValidator.validateCursorPosition(newPosition);

    return {
      ...state,
      cursorPosition: newPosition,
      selection: {
        from: newPosition,
        to: newPosition,
        text: '',
      },
    };
  }

  static updateSelection(state: EditorState, newSelection: TextSelection): EditorState {
    EditorStateValidator.validateSelection(newSelection);

    return {
      ...state,
      selection: newSelection,
      cursorPosition: newSelection.to, // Cursor follows selection end
    };
  }

  static updateScrollPosition(state: EditorState, newPosition: ScrollPosition): EditorState {
    EditorStateValidator.validateScrollPosition(newPosition);

    return {
      ...state,
      scrollPosition: newPosition,
    };
  }

  static togglePreviewVisibility(state: EditorState): EditorState {
    return {
      ...state,
      isPreviewVisible: !state.isPreviewVisible,
    };
  }

  static updateZoomLevel(state: EditorState, newZoom: ZoomLevel): EditorState {
    EditorStateValidator.validateZoomLevel(newZoom);

    return {
      ...state,
      zoomLevel: newZoom,
    };
  }
}

/**
 * EditorState factory for creating initial states
 */
export class EditorStateFactory {
  static createInitial(documentId: DocumentId): EditorState {
    const state: EditorState = {
      documentId,
      cursorPosition: EditorStateUtils.createEmptyCursorPosition(),
      selection: EditorStateUtils.createEmptySelection(),
      scrollPosition: EditorStateUtils.createEmptyScrollPosition(),
      isPreviewVisible: true,
      zoomLevel: 1.0,
    };

    EditorStateValidator.validateEditorState(state);
    return state;
  }

  static createWithPosition(documentId: DocumentId, position: CursorPosition): EditorState {
    EditorStateValidator.validateCursorPosition(position);

    const state: EditorState = {
      documentId,
      cursorPosition: position,
      selection: {
        from: position,
        to: position,
        text: '',
      },
      scrollPosition: EditorStateUtils.createEmptyScrollPosition(),
      isPreviewVisible: true,
      zoomLevel: 1.0,
    };

    EditorStateValidator.validateEditorState(state);
    return state;
  }
}