/**
 * PreviewPane Wrapper Component
 *
 * Simplified wrapper around our Clean Architecture PreviewPane component
 * for use in the main App component
 */

import React, { useCallback, useEffect } from 'react';
import { PreviewPane as CAPreviewPane } from '../../adapters/components/PreviewPane';

export interface PreviewPaneProps {
  content: string;
  isLoading?: boolean;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  content,
  isLoading = false,
}) => {
  console.log('[PreviewPane Wrapper] Received content:', content.substring(0, 50) + '...');

  React.useEffect(() => {
    console.log('[PreviewPane Wrapper] Content changed in effect:', content.substring(0, 50) + '...');
  }, [content]);

  const handleLinkClick = useCallback((url: string, event: React.MouseEvent) => {
    // Handle external link clicks
    event.preventDefault();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    }
  }, []);

  const handleImageLoad = useCallback((src: string) => {
    console.debug('Image loaded:', src);
  }, []);

  const handleImageError = useCallback((src: string, error: Error) => {
    console.warn('Failed to load image:', src, error);
  }, []);

  const handleRenderComplete = useCallback((renderTime: number, wordCount: number) => {
    console.debug('Preview rendered in', renderTime, 'ms, word count:', wordCount);
  }, []);

  const handleRenderError = useCallback((error: Error) => {
    console.error('Preview render error:', error);
  }, []);

  return (
    <div className="preview-pane-wrapper" style={{ height: '100%' }}>
      <CAPreviewPane
        content={content}
        isLoading={isLoading}
        onLinkClick={handleLinkClick}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
        onRenderComplete={handleRenderComplete}
        onRenderError={handleRenderError}
        className="preview-pane-main"
        style={{ height: '100%' }}
        config={{
          enableGfm: true,
          enableSyntaxHighlighting: true,
          enableLineBreaks: true,
          enableHeadingAnchors: true,
          sanitizeHtml: true,
          openLinksInNewTab: true,
        }}
        enableTableOfContents={false}
        showWordCount={false}
        showReadingTime={false}
        autoScroll={true}
        syncScrollWithEditor={false}
      />
    </div>
  );
};

export default PreviewPane;