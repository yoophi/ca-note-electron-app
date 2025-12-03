/**
 * CodeMirror Extensions Configuration
 *
 * Configures CodeMirror 6 extensions for the markdown editor.
 * Provides a clean interface for setting up editor features
 * while isolating framework-specific code.
 */

import { Extension, StateEffect, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, indentUnit, bracketMatching } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorSelection } from '@codemirror/state';

/**
 * Configuration options for CodeMirror setup
 */
export interface EditorConfig {
  /**
   * Whether to use dark theme
   */
  darkTheme?: boolean;

  /**
   * Whether to show line numbers
   */
  lineNumbers?: boolean;

  /**
   * Whether to enable code folding
   */
  foldGutter?: boolean;

  /**
   * Whether the editor is read-only
   */
  readOnly?: boolean;

  /**
   * Tab size for indentation
   */
  tabSize?: number;

  /**
   * Whether to wrap lines
   */
  lineWrapping?: boolean;

  /**
   * Whether to highlight the active line
   */
  highlightActiveLine?: boolean;

  /**
   * Whether to enable search functionality
   */
  enableSearch?: boolean;

  /**
   * Whether to enable autocompletion
   */
  enableAutocompletion?: boolean;

  /**
   * Placeholder text for empty editor
   */
  placeholder?: string;

  /**
   * Font size in pixels
   */
  fontSize?: number;

  /**
   * Font family
   */
  fontFamily?: string;

  /**
   * Whether to enable Vim mode
   */
  vimMode?: boolean;
}

/**
 * Default editor configuration
 */
const defaultConfig: Required<EditorConfig> = {
  darkTheme: false,
  lineNumbers: true,
  foldGutter: true,
  readOnly: false,
  tabSize: 2,
  lineWrapping: true,
  highlightActiveLine: true,
  enableSearch: true,
  enableAutocompletion: true,
  placeholder: '',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  vimMode: false,
};

/**
 * Create basic editor extensions
 */
export function createBasicExtensions(config: EditorConfig = {}): Extension[] {
  const mergedConfig = { ...defaultConfig, ...config };
  const extensions: Extension[] = [];

  // Language support
  extensions.push(markdown());

  // History support
  extensions.push(history());

  // Basic editing features
  extensions.push(
    indentOnInput(),
    bracketMatching(),
    closeBrackets()
  );

  // Indentation
  extensions.push(indentUnit.of(' '.repeat(mergedConfig.tabSize)));

  // Line wrapping
  if (mergedConfig.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }

  // Line numbers
  if (mergedConfig.lineNumbers) {
    extensions.push(lineNumbers());
  }

  // Fold gutter
  if (mergedConfig.foldGutter) {
    extensions.push(foldGutter());
  }

  // Active line highlighting
  if (mergedConfig.highlightActiveLine) {
    extensions.push(highlightActiveLineGutter());
  }

  // Search functionality
  if (mergedConfig.enableSearch) {
    extensions.push(highlightSelectionMatches());
  }

  // Autocompletion
  if (mergedConfig.enableAutocompletion) {
    extensions.push(autocompletion());
  }

  // Read-only mode
  if (mergedConfig.readOnly) {
    extensions.push(EditorView.editable.of(false));
  }

  // Placeholder
  if (mergedConfig.placeholder) {
    extensions.push(EditorView.theme({
      '.cm-editor .cm-placeholder': {
        color: 'var(--text-muted, #999)',
        fontStyle: 'italic',
      }
    }));
  }

  return extensions;
}

/**
 * Create theme extensions
 */
export function createThemeExtensions(config: EditorConfig = {}): Extension[] {
  const mergedConfig = { ...defaultConfig, ...config };
  const extensions: Extension[] = [];

  // Dark theme
  if (mergedConfig.darkTheme) {
    extensions.push(oneDark);
  }

  // Custom typography theme
  extensions.push(EditorView.theme({
    '.cm-editor': {
      fontSize: `${mergedConfig.fontSize}px`,
      fontFamily: mergedConfig.fontFamily,
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-content': {
      padding: '16px',
      lineHeight: '1.6',
    },
    '.cm-line': {
      paddingLeft: '0',
      paddingRight: '16px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-secondary, #f8f9fa)',
      borderRight: '1px solid var(--border, #dee2e6)',
      color: 'var(--text-muted, #6c757d)',
      fontSize: '12px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px',
      minWidth: '32px',
      textAlign: 'right',
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      cursor: 'pointer',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--bg-tertiary, #e9ecef)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'var(--accent, #0d6efd)',
      color: 'white',
    },
    '.cm-searchMatch': {
      backgroundColor: 'var(--warning, #ffc107)',
      color: 'black',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-primary, #212529)',
    },
    '.cm-placeholder': {
      color: 'var(--text-muted, #6c757d)',
      fontStyle: 'italic',
    },
  }));

  return extensions;
}

/**
 * Create keymap extensions
 */
export function createKeymapExtensions(config: EditorConfig = {}): Extension[] {
  const mergedConfig = { ...defaultConfig, ...config };
  const extensions: Extension[] = [];

  // Default keymaps
  extensions.push(
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
    ])
  );

  // Search keymap
  if (mergedConfig.enableSearch) {
    extensions.push(keymap.of(searchKeymap));
  }

  // Autocompletion keymap
  if (mergedConfig.enableAutocompletion) {
    extensions.push(keymap.of(completionKeymap));
  }

  return extensions;
}

/**
 * Create all extensions for the markdown editor
 */
export function createMarkdownEditorExtensions(config: EditorConfig = {}): Extension[] {
  const mergedConfig = { ...defaultConfig, ...config };

  return [
    ...createBasicExtensions(mergedConfig),
    ...createThemeExtensions(mergedConfig),
    ...createKeymapExtensions(mergedConfig),
  ];
}

/**
 * Update editor configuration dynamically
 */
export function updateEditorConfig(view: EditorView, newConfig: Partial<EditorConfig>): void {
  // Get current configuration (this would need to be stored somewhere in real implementation)
  const currentConfig = { ...defaultConfig }; // In real app, this should come from state
  const updatedConfig = { ...currentConfig, ...newConfig };

  // Reconfigure the editor with new extensions
  view.dispatch({
    effects: [
      StateEffect.reconfigure.of([
        ...createMarkdownEditorExtensions(updatedConfig),
      ])
    ],
  });
}

/**
 * Utility functions for editor interactions
 */
export const EditorUtils = {
  /**
   * Insert text at current cursor position
   */
  insertText(view: EditorView, text: string): void {
    const selection = view.state.selection;
    view.dispatch({
      changes: {
        from: selection.main.from,
        to: selection.main.to,
        insert: text,
      },
      selection: EditorSelection.cursor(selection.main.from + text.length),
    });
  },

  /**
   * Replace selected text or insert at cursor
   */
  replaceSelection(view: EditorView, text: string): void {
    const selection = view.state.selection;
    view.dispatch({
      changes: {
        from: selection.main.from,
        to: selection.main.to,
        insert: text,
      },
      selection: EditorSelection.cursor(selection.main.from + text.length),
    });
  },

  /**
   * Get current selection or cursor position info
   */
  getSelectionInfo(view: EditorView): {
    text: string;
    from: number;
    to: number;
    empty: boolean;
  } {
    const selection = view.state.selection.main;
    return {
      text: view.state.doc.sliceString(selection.from, selection.to),
      from: selection.from,
      to: selection.to,
      empty: selection.empty,
    };
  },

  /**
   * Focus the editor
   */
  focus(view: EditorView): void {
    view.focus();
  },

  /**
   * Scroll to a specific line
   */
  scrollToLine(view: EditorView, line: number): void {
    const lineBlock = view.state.doc.line(line);
    view.dispatch({
      selection: EditorSelection.cursor(lineBlock.from),
      effects: EditorView.scrollIntoView(lineBlock.from, {
        y: 'center',
      }),
    });
  },

  /**
   * Get current line and column
   */
  getCursorPosition(view: EditorView): { line: number; column: number } {
    const cursor = view.state.selection.main.head;
    const line = view.state.doc.lineAt(cursor);
    return {
      line: line.number,
      column: cursor - line.from,
    };
  },

  /**
   * Insert markdown formatting
   */
  insertMarkdown: {
    bold(view: EditorView): void {
      const selection = EditorUtils.getSelectionInfo(view);
      if (selection.empty) {
        EditorUtils.insertText(view, '****');
        // Move cursor between asterisks
        const cursor = view.state.selection.main.head;
        view.dispatch({
          selection: EditorSelection.cursor(cursor - 2),
        });
      } else {
        EditorUtils.replaceSelection(view, `**${selection.text}**`);
      }
    },

    italic(view: EditorView): void {
      const selection = EditorUtils.getSelectionInfo(view);
      if (selection.empty) {
        EditorUtils.insertText(view, '**');
        const cursor = view.state.selection.main.head;
        view.dispatch({
          selection: EditorSelection.cursor(cursor - 1),
        });
      } else {
        EditorUtils.replaceSelection(view, `*${selection.text}*`);
      }
    },

    code(view: EditorView): void {
      const selection = EditorUtils.getSelectionInfo(view);
      if (selection.empty) {
        EditorUtils.insertText(view, '``');
        const cursor = view.state.selection.main.head;
        view.dispatch({
          selection: EditorSelection.cursor(cursor - 1),
        });
      } else {
        EditorUtils.replaceSelection(view, `\`${selection.text}\``);
      }
    },

    link(view: EditorView): void {
      const selection = EditorUtils.getSelectionInfo(view);
      const linkText = selection.empty ? 'link text' : selection.text;
      EditorUtils.replaceSelection(view, `[${linkText}](url)`);
    },

    heading(view: EditorView, level: number = 1): void {
      const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
      const selection = EditorUtils.getSelectionInfo(view);
      if (selection.empty) {
        EditorUtils.insertText(view, `${hashes} `);
      } else {
        EditorUtils.replaceSelection(view, `${hashes} ${selection.text}`);
      }
    },
  },
};

/**
 * Export configuration types for use in components
 */
export type { EditorConfig };
export { defaultConfig };