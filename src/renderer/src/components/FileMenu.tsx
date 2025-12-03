/**
 * FileMenu Component
 *
 * File menu for document operations (new, open, save)
 */

import React from 'react';

export interface FileMenuProps {
  onNewDocument: () => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  hasUnsavedChanges?: boolean;
  isLoading?: boolean;
}

export const FileMenu: React.FC<FileMenuProps> = ({
  onNewDocument,
  onOpenDocument,
  onSaveDocument,
  hasUnsavedChanges = false,
  isLoading = false,
}) => {
  return (
    <div className="file-menu">
      <div className="app-title">
        <h1>Markdown Editor</h1>
      </div>

      <div className="menu-actions">
        <button
          onClick={onNewDocument}
          disabled={isLoading}
          className="menu-button new-button"
          title="New Document (Ctrl+N)"
        >
          📄 New
        </button>

        <button
          onClick={onOpenDocument}
          disabled={isLoading}
          className="menu-button open-button"
          title="Open Document (Ctrl+O)"
        >
          📂 Open
        </button>

        <button
          onClick={onSaveDocument}
          disabled={isLoading}
          className={`menu-button save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
          title="Save Document (Ctrl+S)"
        >
          💾 Save {hasUnsavedChanges ? '*' : ''}
        </button>
      </div>
    </div>
  );
};

export default FileMenu;