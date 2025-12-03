/**
 * MarkdownEditor Component
 *
 * Interface adapter component that provides a CodeMirror-based markdown editor.
 * This component bridges the UI framework (React) with our business logic
 * while maintaining Clean Architecture principles.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
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

  // Memoize editor configuration to prevent unnecessary reconfiguration
  const editorConfig = useMemo<EditorConfig>(() => ({
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
  }), [readOnly, placeholder, enableVim, config]);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = createMarkdownEditorExtensions(editorConfig);

    // Add document change listener - with clear debug logs
    const updateListener = EditorView.updateListener.of((update) => {
      console.log('🔍 Update listener called');
      console.log('   docChanged:', update.docChanged);
      console.log('   ignoreNext:', ignoreNextChangeRef.current);
      console.log('   hasOnContentChange:', !!onContentChange);

      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        console.log('📝 Content check');
        console.log('   newLength:', newContent.length);
        console.log('   currentLength:', contentRef.current?.length || 0);
        console.log('   isDifferent:', newContent !== contentRef.current);

        if (newContent !== contentRef.current) {
          console.log('✅ Calling onContentChange!');
          contentRef.current = newContent;
          onContentChange?.(newContent);
        } else {
          console.log('❌ Content same, not calling onContentChange');
        }
      } else {
        console.log('❌ Conditions not met');
        console.log('   docChanged:', update.docChanged);
        console.log('   ignoreNext:', ignoreNextChangeRef.current);
      }

      // Handle cursor position changes
      if (update.selectionSet && onCursorPositionChange) {
        const cursor = update.state.selection.main.head;
        const line = update.state.doc.lineAt(cursor);
        const position: CursorPosition = {
          line: line.number - 1, // Convert to 0-based
          column: cursor - line.from,
        };
        onCursorPositionChange(position);
      }

      // Handle selection changes
      if (update.selectionSet && onSelectionChange) {
        const selection = update.state.selection.main;
        const selectionData: TextSelection = {
          from: EditorUtils.getCursorPosition(viewRef.current!),
          to: EditorUtils.getCursorPosition(viewRef.current!),
          text: update.state.doc.sliceString(selection.from, selection.to),
        };
        onSelectionChange(selectionData);
      }
    });

    // Add scroll listener
    const scrollListener = EditorView.domEventHandlers({
      scroll: (event, view) => {
        const scrollTop = (event.target as HTMLElement).scrollTop;
        onScrollChange?.(scrollTop);
        return false;
      },
    });

    // Create editor state
    const initialState = EditorState.create({
      doc: content,
      extensions: [
        ...extensions,
        updateListener,
        scrollListener,
        EditorView.contentAttributes.of({
          'aria-label': ariaLabel,
          'aria-describedby': ariaDescribedBy,
          'spellcheck': spellCheck.toString(),
        }),
      ],
    });

    // Create editor view
    const view = new EditorView({
      state: initialState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // BACKUP: Direct DOM event listener for input changes
    const editorElement = view.dom;
    let lastContent = content;

    const handleDirectInput = () => {
      const currentContent = view.state.doc.toString();
      if (currentContent !== lastContent) {
        console.log('🔥 Direct input detected! New content:', currentContent.substring(0, 50) + '...');
        lastContent = currentContent;
        contentRef.current = currentContent;
        onContentChange?.(currentContent);
      }
    };

    // Listen to multiple input events
    editorElement.addEventListener('input', handleDirectInput);
    editorElement.addEventListener('keyup', handleDirectInput);
    editorElement.addEventListener('paste', handleDirectInput);

    // Auto focus if requested
    if (autoFocus) {
      view.focus();
    }

    // Focus/blur event handlers
    const handleFocus = () => onFocus?.();
    const handleBlur = () => onBlur?.();

    // Use existing editorElement (declared above)
    editorElement.addEventListener('focus', handleFocus);
    editorElement.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      editorElement.removeEventListener('focus', handleFocus);
      editorElement.removeEventListener('blur', handleBlur);
      // Remove backup input listeners
      editorElement.removeEventListener('input', handleDirectInput);
      editorElement.removeEventListener('keyup', handleDirectInput);
      editorElement.removeEventListener('paste', handleDirectInput);
      view.destroy();
      viewRef.current = null;
    };
  }, [
    editorConfig,
    ariaLabel,
    ariaDescribedBy,
    spellCheck,
    autoFocus,
    onContentChange,
    onCursorPositionChange,
    onSelectionChange,
    onScrollChange,
    onFocus,
    onBlur,
  ]);

  // Update content when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || content === contentRef.current) return;

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
    ignoreNextChangeRef.current = false;
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

  // Update scroll position when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || scrollPosition === undefined) return;

    const editorElement = view.scrollDOM;
    editorElement.scrollTop = scrollPosition;
  }, [scrollPosition]);

  // Update configuration when it changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    updateEditorConfig(view, editorConfig);
  }, [editorConfig]);

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