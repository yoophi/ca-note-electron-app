/**
 * StatusBar Component
 *
 * Status bar showing document stats and preview toggle
 */

import React from 'react';
import type { Document } from '../../../shared/entities/Document';

export interface StatusBarProps {
  document: Document | null;
  isPreviewVisible?: boolean;
  onTogglePreview?: () => void;
  isLoading?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  document,
  isPreviewVisible = true,
  onTogglePreview,
  isLoading = false,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="status-bar">
      <div className="status-info">
        {document ? (
          <>
            <span className="status-item">
              📄 {document.title || 'Untitled'}
            </span>

            <span className="status-item">
              📊 {document.metadata.wordCount || 0} words
            </span>

            <span className="status-item">
              📝 {document.metadata.characterCount || 0} characters
            </span>

            <span className="status-item">
              📏 {formatFileSize(document.content.length)}
            </span>

            {document.metadata.isDirty && (
              <span className="status-item modified">
                ⚫ Modified
              </span>
            )}

            {document.filePath && (
              <span className="status-item file-path">
                📍 {document.filePath}
              </span>
            )}
          </>
        ) : (
          <span className="status-item">
            No document loaded
          </span>
        )}
      </div>

      <div className="status-actions">
        {isLoading && (
          <span className="status-item loading">
            ⏳ Loading...
          </span>
        )}

        <button
          onClick={onTogglePreview}
          className={`preview-toggle ${isPreviewVisible ? 'active' : ''}`}
          title={`${isPreviewVisible ? 'Hide' : 'Show'} Preview (Ctrl+P)`}
          disabled={isLoading}
        >
          {isPreviewVisible ? '👁️ Hide Preview' : '👁️ Show Preview'}
        </button>
      </div>
    </div>
  );
};

export default StatusBar;