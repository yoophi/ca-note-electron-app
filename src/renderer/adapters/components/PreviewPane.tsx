/**
 * PreviewPane Component
 *
 * Interface adapter component that renders markdown content as HTML preview.
 * This component bridges the UI framework (React) with our markdown rendering
 * business logic while maintaining Clean Architecture principles.
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  createReactMarkdownProps,
  MarkdownUtils,
  type MarkdownConfig,
} from '../../frameworks/markdown/components';
import type { MarkdownContent } from '../../../shared/entities/Document';

/**
 * Props interface following Clean Architecture principles
 */
export interface PreviewPaneProps {
  // Core data
  content: MarkdownContent;

  // Configuration
  config?: Partial<MarkdownConfig>;

  // Behavior
  isLoading?: boolean;
  autoScroll?: boolean;
  syncScrollWithEditor?: boolean;

  // Event handlers (dependency inversion)
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onLinkClick?: (url: string, event: React.MouseEvent) => void;
  onImageLoad?: (src: string) => void;
  onImageError?: (src: string, error: Error) => void;
  onRenderComplete?: (renderTime: number, wordCount: number) => void;
  onRenderError?: (error: Error) => void;

  // Scroll control
  scrollPosition?: number;
  scrollToHeading?: string;

  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;

  // Styling
  className?: string;
  style?: React.CSSProperties;

  // Features
  enableTableOfContents?: boolean;
  showWordCount?: boolean;
  showReadingTime?: boolean;
  highlightCurrentHeading?: boolean;
}

/**
 * Table of Contents component
 */
interface TableOfContentsProps {
  content: string;
  onHeadingClick?: (id: string) => void;
  className?: string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  content,
  onHeadingClick,
  className = '',
}) => {
  const headings = useMemo(() => MarkdownUtils.extractHeadings(content), [content]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className={`table-of-contents ${className}`} aria-label="Table of contents">
      <h3 className="toc-title">Contents</h3>
      <ul className="toc-list">
        {headings.map((heading, index) => (
          <li
            key={`${heading.id}-${index}`}
            className={`toc-item toc-level-${heading.level}`}
            style={{ marginLeft: `${(heading.level - 1) * 1}rem` }}
          >
            <button
              type="button"
              className="toc-link"
              onClick={() => onHeadingClick?.(heading.id)}
              title={`Go to ${heading.text}`}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/**
 * Preview statistics component
 */
interface PreviewStatsProps {
  content: string;
  renderTime?: number;
  showWordCount?: boolean;
  showReadingTime?: boolean;
  className?: string;
}

const PreviewStats: React.FC<PreviewStatsProps> = ({
  content,
  renderTime,
  showWordCount = false,
  showReadingTime = false,
  className = '',
}) => {
  const stats = useMemo(() => {
    const wordCount = MarkdownUtils.countWords(content);
    const readingTime = MarkdownUtils.estimateReadingTime(content);

    return { wordCount, readingTime };
  }, [content]);

  if (!showWordCount && !showReadingTime && !renderTime) {
    return null;
  }

  return (
    <div className={`preview-stats ${className}`}>
      {showWordCount && (
        <span className="stat-item">
          {stats.wordCount} word{stats.wordCount !== 1 ? 's' : ''}
        </span>
      )}
      {showReadingTime && (
        <span className="stat-item">
          {stats.readingTime} min read
        </span>
      )}
      {renderTime && (
        <span className="stat-item">
          Rendered in {renderTime.toFixed(1)}ms
        </span>
      )}
    </div>
  );
};

/**
 * PreviewPane component implementation
 *
 * This component demonstrates Clean Architecture by:
 * 1. Depending on markdown configuration interfaces
 * 2. Isolating framework-specific code (react-markdown)
 * 3. Being testable through props injection
 */
export const PreviewPane: React.FC<PreviewPaneProps> = ({
  content = '',
  config = {},
  isLoading = false,
  autoScroll = true,
  syncScrollWithEditor = true,
  onScroll,
  onLinkClick,
  onImageLoad,
  onImageError,
  onRenderComplete,
  onRenderError,
  scrollPosition,
  scrollToHeading,
  ariaLabel = 'Markdown preview',
  ariaDescribedBy,
  className = '',
  style,
  enableTableOfContents = false,
  showWordCount = false,
  showReadingTime = false,
  highlightCurrentHeading = false,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderTime, setRenderTime] = useState<number | undefined>();
  const [currentHeading, setCurrentHeading] = useState<string>('');
  const renderStartRef = useRef<number>(0);

  // Memoize markdown configuration
  const markdownConfig = useMemo<MarkdownConfig>(() => ({
    enableGfm: true,
    enableSyntaxHighlighting: true,
    enableLineBreaks: true,
    enableHeadingAnchors: true,
    sanitizeHtml: true,
    openLinksInNewTab: true,
    allowDangerousHtml: false,
    ...config,
  }), [config]);

  // Create react-markdown props with custom components
  const reactMarkdownProps = useMemo(() => {
    const baseProps = createReactMarkdownProps(markdownConfig);

    // Enhance link component with click handler
    const originalLinkComponent = baseProps.components?.a;
    const enhancedLinkComponent = ({ href, children, ...props }: any) => {
      const handleClick = (event: React.MouseEvent) => {
        if (href && onLinkClick) {
          event.preventDefault();
          onLinkClick(href, event);
        }
      };

      return React.createElement(
        'a',
        {
          href,
          onClick: handleClick,
          ...props,
        },
        children
      );
    };

    // Enhance image component with load/error handlers
    const originalImgComponent = baseProps.components?.img;
    const enhancedImgComponent = ({ src, alt, ...props }: any) => {
      const handleLoad = () => {
        if (src && onImageLoad) {
          onImageLoad(src);
        }
      };

      const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (src && onImageError) {
          onImageError(src, new Error(`Failed to load image: ${src}`));
        }
      };

      return React.createElement('img', {
        src,
        alt,
        onLoad: handleLoad,
        onError: handleError,
        loading: 'lazy',
        ...props,
      });
    };

    return {
      ...baseProps,
      components: {
        ...baseProps.components,
        a: enhancedLinkComponent,
        img: enhancedImgComponent,
      },
    };
  }, [markdownConfig, onLinkClick, onImageLoad, onImageError]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!onScroll) return;

    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    onScroll(scrollTop, scrollHeight, clientHeight);

    // Update current heading if highlighting is enabled
    if (highlightCurrentHeading && contentRef.current) {
      const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let current = '';

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i] as HTMLElement;
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) { // 100px threshold
          current = heading.id;
          break;
        }
      }

      setCurrentHeading(current);
    }
  }, [onScroll, highlightCurrentHeading]);

  // Update scroll position when prop changes
  useEffect(() => {
    const container = previewRef.current;
    if (!container || scrollPosition === undefined || !syncScrollWithEditor) return;

    container.scrollTop = scrollPosition;
  }, [scrollPosition, syncScrollWithEditor]);

  // Scroll to specific heading
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !scrollToHeading) return;

    const heading = container.querySelector(`#${CSS.escape(scrollToHeading)}`);
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToHeading]);

  // Handle table of contents navigation
  const handleTocHeadingClick = useCallback((headingId: string) => {
    const container = contentRef.current;
    if (!container) return;

    const heading = container.querySelector(`#${CSS.escape(headingId)}`);
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Track rendering performance
  const handleRenderStart = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  const handleRenderEnd = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - renderStartRef.current;
    setRenderTime(duration);

    if (onRenderComplete) {
      const wordCount = MarkdownUtils.countWords(content);
      onRenderComplete(duration, wordCount);
    }
  }, [content, onRenderComplete]);

  // Effect to track render cycle
  useEffect(() => {
    handleRenderStart();

    // Use a timeout to call handleRenderEnd after render completes
    const timeoutId = setTimeout(() => {
      handleRenderEnd();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [content, handleRenderStart, handleRenderEnd]);

  // Error boundary for markdown rendering
  const [renderError, setRenderError] = useState<Error | null>(null);

  const handleRenderErrorInternal = useCallback((error: Error) => {
    setRenderError(error);
    onRenderError?.(error);
  }, [onRenderError]);

  // Reset error when content changes
  useEffect(() => {
    setRenderError(null);
  }, [content]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`preview-pane preview-loading ${className}`} style={style}>
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Loading preview" />
          <span className="loading-text">Rendering preview...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (renderError) {
    return (
      <div className={`preview-pane preview-error ${className}`} style={style}>
        <div className="error-container">
          <h3>Preview Error</h3>
          <p>Failed to render markdown preview:</p>
          <pre className="error-message">{renderError.message}</pre>
          <button
            type="button"
            onClick={() => setRenderError(null)}
            className="error-retry"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`preview-pane ${className}`} style={style}>
      {/* Table of Contents */}
      {enableTableOfContents && (
        <TableOfContents
          content={content}
          onHeadingClick={handleTocHeadingClick}
          className="preview-toc"
        />
      )}

      {/* Statistics */}
      <PreviewStats
        content={content}
        renderTime={renderTime}
        showWordCount={showWordCount}
        showReadingTime={showReadingTime}
        className="preview-stats-header"
      />

      {/* Main content area */}
      <div
        ref={previewRef}
        className="preview-content-container"
        onScroll={handleScroll}
        style={{ height: '100%', overflow: 'auto' }}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        role="document"
      >
        <div ref={contentRef} className="preview-content">
          {content ? (
            <ErrorBoundary onError={handleRenderErrorInternal}>
              <ReactMarkdown {...reactMarkdownProps}>
                {content}
              </ReactMarkdown>
            </ErrorBoundary>
          ) : (
            <div className="preview-empty">
              <p className="empty-message">Start typing to see your markdown rendered here.</p>
              <div className="empty-hints">
                <h4>Markdown Quick Reference:</h4>
                <ul>
                  <li><code># Heading 1</code></li>
                  <li><code>## Heading 2</code></li>
                  <li><code>**bold text**</code></li>
                  <li><code>*italic text*</code></li>
                  <li><code>`inline code`</code></li>
                  <li><code>[link text](URL)</code></li>
                  <li><code>![alt text](image URL)</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PreviewPane.displayName = 'PreviewPane';

/**
 * Error Boundary for markdown rendering
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Preview render error:', error, errorInfo);
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when children change
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="preview-error-boundary">
          <h3>Rendering Error</h3>
          <p>There was an error rendering this markdown content.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PreviewPane;