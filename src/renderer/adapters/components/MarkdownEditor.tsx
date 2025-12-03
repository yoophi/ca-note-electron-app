/**
 * MarkdownEditor Component
 *
 * Interface adapter component that provides a CodeMirror-based markdown editor.
 * This component bridges the UI framework (React) with our business logic
 * while maintaining Clean Architecture principles.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import {
  createMarkdownEditorExtensions,
  EditorUtils,
  updateEditorConfig,
  type EditorConfig,
} from '../../frameworks/codemirror/extensions';
import type { CursorPosition, TextSelection } from '../../../shared/entities/EditorState';

/**
 * Props interface following Clean Architecture principles
 */
export interface MarkdownEditorProps {
  // Core data
  content: string;
  placeholder?: string;

  // Behavior configuration
  readOnly?: boolean;
  autoFocus?: boolean;

  // Editor configuration
  config?: Partial<EditorConfig>;

  // Event handlers (dependency inversion - UI passes behavior to component)
  onContentChange?: (content: string) => void;
  onCursorPositionChange?: (position: CursorPosition) => void;
  onSelectionChange?: (selection: TextSelection) => void;
  onScrollChange?: (scrollTop: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;

  // Editor state management
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
  scrollPosition?: number;

  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;

  // Styling
  className?: string;
  style?: React.CSSProperties;

  // Advanced features
  enableVim?: boolean;
  enableEmmet?: boolean;
  spellCheck?: boolean;
}

/**
 * MarkdownEditor component implementation
 *
 * This component demonstrates Clean Architecture by:
 * 1. Depending on interfaces rather than concrete implementations
 * 2. Isolating framework-specific code (CodeMirror) from business logic
 * 3. Being testable through props injection
 */
export const MarkdownEditor = React.memo<MarkdownEditorProps>(({
  content = '',
  placeholder = '',
  readOnly = false,
  autoFocus = false,
  config = {},
  onContentChange,
  onCursorPositionChange,
  onSelectionChange,
  onScrollChange,
  onFocus,
  onBlur,
  cursorPosition,
  selection,
  scrollPosition,
  ariaLabel = 'Markdown editor',
  ariaDescribedBy,
  className = '',
  style,
  enableVim = false,
  enableEmmet = false,
  spellCheck = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const ignoreNextChangeRef = useRef(false);

  // Use refs for callbacks to prevent recreation
  const onContentChangeRef = useRef(onContentChange);
  const onCursorPositionChangeRef = useRef(onCursorPositionChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onScrollChangeRef = useRef(onScrollChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);

  // Update refs when props change
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
    onCursorPositionChangeRef.current = onCursorPositionChange;
    onSelectionChangeRef.current = onSelectionChange;
    onScrollChangeRef.current = onScrollChange;
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  });

  // Memoize editor configuration to prevent unnecessary reconfiguration
  const editorConfig = useMemo<EditorConfig>(() => {
    const config_obj = {
      readOnly,
      placeholder,
      enableSearch: true,
      enableAutocompletion: true,
      lineNumbers: true,
      lineWrapping: true,
      highlightActiveLine: !readOnly,
      vimMode: enableVim,
      darkTheme: false, // TODO: Get from theme context
      ...config,
    };
    console.log('[Clean Architecture MarkdownEditor] Editor config recreated');
    console.log('[Clean Architecture MarkdownEditor] Config recreated because deps changed:', {
      readOnly,
      placeholder,
      enableVim,
      configIsObject: typeof config === 'object',
      configStringified: JSON.stringify(config),
      placeholderLength: placeholder?.length
    });
    return config_obj;
  }, [readOnly, enableVim, JSON.stringify(config)]);

  // Initialize CodeMirror editor ONCE (no dependencies to prevent recreation)
  useEffect(() => {
    console.log('[Clean Architecture MarkdownEditor] ONE-TIME editor initialization');
    if (!editorRef.current) {
      console.log('[Clean Architecture MarkdownEditor] editorRef.current is null, skipping initialization');
      return;
    }

    console.log('[Clean Architecture MarkdownEditor] Creating extensions for one-time setup...');
    const baseExtensions = createMarkdownEditorExtensions({
      readOnly: false, // Will be updated dynamically
      placeholder: '',  // Will be updated dynamically
      enableSearch: true,
      enableAutocompletion: true,
      lineNumbers: true,
      lineWrapping: true,
      highlightActiveLine: true,
      vimMode: false,
      darkTheme: false,
    });

    console.log('[Clean Architecture MarkdownEditor] Setting up updateListener...');

    // Add document change listener - clean and optimized
    const updateListener = EditorView.updateListener.of((update) => {
      const isDocChanged = update.docChanged;
      const isIgnored = ignoreNextChangeRef.current;

      console.log('[Clean Architecture MarkdownEditor] Update event - docChanged:', isDocChanged, 'ignoreNextChangeRef:', isIgnored);

      // Only handle document changes from user input, not programmatic updates
      if (update.docChanged && !ignoreNextChangeRef.current) {
        const newContent = update.state.doc.toString();
        console.log('[Clean Architecture MarkdownEditor] Processing user document change:', newContent.substring(0, 50) + '...');
        if (newContent !== contentRef.current) {
          contentRef.current = newContent;
          console.log('[Clean Architecture MarkdownEditor] Content differs - calling onContentChange callback');

          // Use setTimeout to prevent focus issues during rapid typing
          setTimeout(() => {
            console.log('[Clean Architecture MarkdownEditor] Executing onContentChange callback now');
            onContentChangeRef.current?.(newContent);
          }, 0);
        } else {
          console.log('[Clean Architecture MarkdownEditor] Content same as contentRef - skipping callback');
        }
      } else if (update.docChanged) {
        console.log('[Clean Architecture MarkdownEditor] Document changed but ignoring (ignoreNextChangeRef.current is true) - this was a programmatic update');
      }

      // Handle cursor position changes
      if (update.selectionSet && onCursorPositionChangeRef.current) {
        const cursor = update.state.selection.main.head;
        const line = update.state.doc.lineAt(cursor);
        const position: CursorPosition = {
          line: line.number - 1, // Convert to 0-based
          column: cursor - line.from,
        };
        onCursorPositionChangeRef.current(position);
      }

      // Handle selection changes
      if (update.selectionSet && onSelectionChangeRef.current) {
        const selection = update.state.selection.main;
        const selectionData: TextSelection = {
          from: EditorUtils.getCursorPosition(viewRef.current!),
          to: EditorUtils.getCursorPosition(viewRef.current!),
          text: update.state.doc.sliceString(selection.from, selection.to),
        };
        onSelectionChangeRef.current(selectionData);
      }
    });

    // Add scroll listener
    const scrollListener = EditorView.domEventHandlers({
      scroll: (event, view) => {
        const scrollTop = (event.target as HTMLElement).scrollTop;
        onScrollChangeRef.current?.(scrollTop);
        return false;
      },
    });

    console.log('[Clean Architecture MarkdownEditor] Creating initial state with content:', content.substring(0, 50) + '...');
    console.log('[Clean Architecture MarkdownEditor] Extensions count - base:', baseExtensions.length, 'total with listeners:', baseExtensions.length + 3);

    const allExtensions = [
      ...baseExtensions,
      updateListener,
      scrollListener,
      EditorView.contentAttributes.of({
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        'spellcheck': spellCheck.toString(),
      }),
    ];

    console.log('[Clean Architecture MarkdownEditor] Final extensions array length:', allExtensions.length);

    // Create editor state
    const initialState = EditorState.create({
      doc: content,
      extensions: allExtensions,
    });

    console.log('[Clean Architecture MarkdownEditor] Creating editor view...');
    // Create editor view
    const view = new EditorView({
      state: initialState,
      parent: editorRef.current,
    });

    console.log('[Clean Architecture MarkdownEditor] Editor view created successfully');
    viewRef.current = view;

    // Use editorElement reference for focus/blur events only
    const editorElement = view.dom;

    // Auto focus if requested
    console.log('[Clean Architecture MarkdownEditor] autoFocus:', autoFocus);
    if (autoFocus) {
      console.log('[Clean Architecture MarkdownEditor] Focusing editor...');
      view.focus();
    }

    // Focus/blur event handlers
    const handleFocus = () => onFocusRef.current?.();
    const handleBlur = () => onBlurRef.current?.();

    // Use existing editorElement (declared above)
    editorElement.addEventListener('focus', handleFocus);
    editorElement.addEventListener('blur', handleBlur);

    // Cleanup - only when component unmounts
    return () => {
      console.log('[Clean Architecture MarkdownEditor] Component unmounting - cleaning up editor');
      editorElement.removeEventListener('focus', handleFocus);
      editorElement.removeEventListener('blur', handleBlur);
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Empty dependency array - initialize only once

  // Update content when prop changes
  useEffect(() => {
    const view = viewRef.current;
    console.log('[Clean Architecture MarkdownEditor] Content prop changed. Current content ref:', contentRef.current?.substring(0, 50) + '...', 'New content:', content.substring(0, 50) + '...');

    if (!view || content === contentRef.current) {
      console.log('[Clean Architecture MarkdownEditor] Skipping content update - no view or content unchanged');
      return;
    }

    console.log('[Clean Architecture MarkdownEditor] Setting ignoreNextChangeRef = true for programmatic update');
    ignoreNextChangeRef.current = true;

    // Update document content
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });

    contentRef.current = content;

    // Reset the flag in the next event loop to ensure CodeMirror events are processed first
    setTimeout(() => {
      console.log('[Clean Architecture MarkdownEditor] Setting ignoreNextChangeRef = false after programmatic update (delayed)');
      ignoreNextChangeRef.current = false;
    }, 0);
  }, [content]);

  // Update cursor position when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !cursorPosition) return;

    try {
      const doc = view.state.doc;
      const line = doc.line(cursorPosition.line + 1); // Convert from 0-based
      const position = line.from + Math.min(cursorPosition.column, line.length);

      view.dispatch({
        selection: { anchor: position, head: position },
        scrollIntoView: false,
      });
    } catch (error) {
      console.warn('Failed to update cursor position:', error);
    }
  }, [cursorPosition]);

  // TEMPORARILY DISABLED: Update editor configuration dynamically
  // This was overriding the updateListener - need to fix this properly
  /*
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    console.log('[Clean Architecture MarkdownEditor] Dynamically updating editor config:', { readOnly, enableVim, placeholder });

    const dynamicConfig = {
      readOnly,
      placeholder,
      enableSearch: true,
      enableAutocompletion: true,
      lineNumbers: true,
      lineWrapping: true,
      highlightActiveLine: !readOnly,
      vimMode: enableVim,
      darkTheme: false,
    };

    updateEditorConfig(view, dynamicConfig);
  }, [readOnly, enableVim, placeholder]);
  */

  // Update scroll position when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || scrollPosition === undefined) return;

    const editorElement = view.scrollDOM;
    editorElement.scrollTop = scrollPosition;
  }, [scrollPosition]);

  // Imperative API through ref
  const editorApi = useMemo(() => ({
    focus: () => viewRef.current?.focus(),
    blur: () => viewRef.current?.dom.blur(),
    insertText: (text: string) => {
      const view = viewRef.current;
      if (view) EditorUtils.insertText(view, text);
    },
    replaceSelection: (text: string) => {
      const view = viewRef.current;
      if (view) EditorUtils.replaceSelection(view, text);
    },
    scrollToLine: (line: number) => {
      const view = viewRef.current;
      if (view) EditorUtils.scrollToLine(view, line + 1); // Convert to 1-based
    },
    getCursorPosition: () => {
      const view = viewRef.current;
      return view ? EditorUtils.getCursorPosition(view) : null;
    },
    getSelectionInfo: () => {
      const view = viewRef.current;
      return view ? EditorUtils.getSelectionInfo(view) : null;
    },
    // Markdown formatting helpers
    format: {
      bold: () => {
        const view = viewRef.current;
        if (view) EditorUtils.insertMarkdown.bold(view);
      },
      italic: () => {
        const view = viewRef.current;
        if (view) EditorUtils.insertMarkdown.italic(view);
      },
      code: () => {
        const view = viewRef.current;
        if (view) EditorUtils.insertMarkdown.code(view);
      },
      link: () => {
        const view = viewRef.current;
        if (view) EditorUtils.insertMarkdown.link(view);
      },
      heading: (level: number) => {
        const view = viewRef.current;
        if (view) EditorUtils.insertMarkdown.heading(view, level);
      },
    },
  }), []);

  // Note: This component doesn't currently expose an imperative API via forwardRef
  // If needed, this could be refactored to use forwardRef properly

  return (
    <div
      className={`markdown-editor ${className}`}
      style={style}
      data-testid="markdown-editor"
    >
      <div
        ref={editorRef}
        className="markdown-editor-container"
        style={{
          height: '100%',
          overflow: 'auto',
        }}
      />
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';

/**
 * Hook for programmatic editor control
 */
export const useMarkdownEditorRef = () => {
  const ref = useRef<{
    focus: () => void;
    blur: () => void;
    insertText: (text: string) => void;
    replaceSelection: (text: string) => void;
    scrollToLine: (line: number) => void;
    getCursorPosition: () => CursorPosition | null;
    getSelectionInfo: () => { text: string; from: number; to: number; empty: boolean } | null;
    format: {
      bold: () => void;
      italic: () => void;
      code: () => void;
      link: () => void;
      heading: (level: number) => void;
    };
  } | null>(null);

  return ref;
};

/**
 * Toolbar component for markdown formatting
 */
interface MarkdownToolbarProps {
  editorRef: React.RefObject<any>;
  disabled?: boolean;
  className?: string;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  editorRef,
  disabled = false,
  className = '',
}) => {
  const handleFormat = useCallback((formatType: string, level?: number) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;

    switch (formatType) {
      case 'bold':
        editor.format.bold();
        break;
      case 'italic':
        editor.format.italic();
        break;
      case 'code':
        editor.format.code();
        break;
      case 'link':
        editor.format.link();
        break;
      case 'heading':
        editor.format.heading(level || 1);
        break;
    }

    editor.focus();
  }, [editorRef, disabled]);

  return (
    <div className={`markdown-toolbar ${className}`} role="toolbar" aria-label="Markdown formatting">
      <button
        type="button"
        onClick={() => handleFormat('bold')}
        disabled={disabled}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>

      <button
        type="button"
        onClick={() => handleFormat('italic')}
        disabled={disabled}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <em>I</em>
      </button>

      <button
        type="button"
        onClick={() => handleFormat('code')}
        disabled={disabled}
        title="Inline Code"
        aria-label="Inline Code"
      >
        {'<>'}
      </button>

      <button
        type="button"
        onClick={() => handleFormat('link')}
        disabled={disabled}
        title="Link"
        aria-label="Insert Link"
      >
        🔗
      </button>

      <div className="toolbar-separator" />

      <button
        type="button"
        onClick={() => handleFormat('heading', 1)}
        disabled={disabled}
        title="Heading 1"
        aria-label="Heading 1"
      >
        H1
      </button>

      <button
        type="button"
        onClick={() => handleFormat('heading', 2)}
        disabled={disabled}
        title="Heading 2"
        aria-label="Heading 2"
      >
        H2
      </button>

      <button
        type="button"
        onClick={() => handleFormat('heading', 3)}
        disabled={disabled}
        title="Heading 3"
        aria-label="Heading 3"
      >
        H3
      </button>
    </div>
  );
};

export default MarkdownEditor;