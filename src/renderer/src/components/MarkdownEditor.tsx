/**
 * MarkdownEditor Wrapper Component
 *
 * Simplified wrapper around our Clean Architecture MarkdownEditor component
 * for use in the main App component
 */

import React, { useCallback } from 'react';
import { MarkdownEditor as CAMarkdownEditor } from '../../adapters/components/MarkdownEditor';
import type { CursorPosition } from '../../../shared/entities/EditorState';

export interface MarkdownEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onContentChange,
  readOnly = false,
  placeholder = 'Start writing your markdown...',
  autoFocus = false,
}) => {
  const handleContentChange = useCallback((newContent: string) => {
    onContentChange?.(newContent);
  }, [onContentChange]);

  const handleCursorPositionChange = useCallback((position: CursorPosition) => {
    // This could be used for status bar updates or other features
    console.debug('Cursor position changed:', position);
  }, []);

  return (
    <div className="markdown-editor-wrapper" style={{ height: '100%' }}>
      <CAMarkdownEditor
        content={content}
        onContentChange={handleContentChange}
        onCursorPositionChange={handleCursorPositionChange}
        readOnly={readOnly}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="markdown-editor-main"
        style={{ height: '100%' }}
        config={{
          lineNumbers: true,
          lineWrapping: true,
          enableSearch: true,
          enableAutocompletion: true,
          highlightActiveLine: !readOnly,
        }}
      />
    </div>
  );
};

export default MarkdownEditor;