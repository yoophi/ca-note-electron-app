/**
 * Main Application Component
 *
 * Root component for the markdown editor application.
 * Manages global application state and layout.
 */

import { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PreviewPane } from './components/PreviewPane';
import { FileMenu } from './components/FileMenu';
import { StatusBar } from './components/StatusBar';
import type { Document } from '../../shared/entities/Document';
import type { EditorState } from '../entities/EditorState';
import { EditorStateFactory } from '../../shared/entities/EditorState';
import './App.css';

interface AppState {
  currentDocument: Document | null;
  editorState: EditorState | null;
  isLoading: boolean;
  error: string | null;
  isPreviewVisible: boolean;
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    currentDocument: null,
    editorState: null,
    isLoading: false,
    error: null,
    isPreviewVisible: true,
  });

  /**
   * Create a new document
   */
  const handleNewDocument = useCallback(async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await window.electronApi.createDocument({
        initialContent: '# Welcome to Markdown Editor\n\nThis is a **sample** markdown document to test the preview functionality.\n\n## Features\n\n- Real-time preview\n- Syntax highlighting\n- Clean Architecture design\n\n```javascript\nconsole.log("Hello, World!");\n```\n\n> This is a blockquote to test rendering.',
      });

      if (response.success && response.document) {
        const editorState = EditorStateFactory.createInitial(response.document.id);

        setAppState(prev => ({
          ...prev,
          currentDocument: {
            ...response.document!,
            metadata: {
              ...response.document!.metadata,
              createdAt: new Date(response.document!.metadata.createdAt),
              modifiedAt: new Date(response.document!.metadata.modifiedAt),
              savedAt: response.document!.metadata.savedAt
                ? new Date(response.document!.metadata.savedAt)
                : undefined,
            },
          },
          editorState,
          isLoading: false,
        }));
      } else {
        setAppState(prev => ({
          ...prev,
          error: response.error || 'Failed to create document',
          isLoading: false,
        }));
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Open an existing document
   */
  const handleOpenDocument = useCallback(async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await window.electronApi.loadDocument({});

      if (response.success && response.document) {
        const editorState = EditorStateFactory.createInitial(response.document.id);

        setAppState(prev => ({
          ...prev,
          currentDocument: {
            ...response.document!,
            metadata: {
              ...response.document!.metadata,
              createdAt: new Date(response.document!.metadata.createdAt),
              modifiedAt: new Date(response.document!.metadata.modifiedAt),
              savedAt: response.document!.metadata.savedAt
                ? new Date(response.document!.metadata.savedAt)
                : undefined,
            },
          },
          editorState,
          isLoading: false,
        }));
      } else {
        setAppState(prev => ({
          ...prev,
          error: response.error || 'Failed to load document',
          isLoading: false,
        }));
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Save the current document
   */
  const handleSaveDocument = useCallback(async () => {
    if (!appState.currentDocument) {
      return;
    }

    try {
      setAppState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await window.electronApi.saveDocument({
        documentId: appState.currentDocument.id,
        content: appState.currentDocument.content,
        filePath: appState.currentDocument.filePath,
      });

      if (response.success) {
        setAppState(prev => ({
          ...prev,
          currentDocument: prev.currentDocument
            ? {
                ...prev.currentDocument,
                filePath: response.filePath,
                metadata: {
                  ...prev.currentDocument.metadata,
                  isDirty: false,
                  savedAt: new Date(),
                },
              }
            : null,
          isLoading: false,
        }));
      } else {
        setAppState(prev => ({
          ...prev,
          error: response.error || 'Failed to save document',
          isLoading: false,
        }));
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, [appState.currentDocument]);

  /**
   * Handle content changes in the editor
   */
  const handleContentChange = useCallback((newContent: string) => {
    setAppState(prev => ({
      ...prev,
      currentDocument: prev.currentDocument
        ? {
            ...prev.currentDocument,
            content: newContent,
            metadata: {
              ...prev.currentDocument.metadata,
              isDirty: true,
              modifiedAt: new Date(),
              wordCount: newContent.split(/\s+/).filter(word => word.length > 0).length,
              characterCount: newContent.replace(/\s/g, '').length,
            },
          }
        : null,
    }));
  }, []);

  /**
   * Toggle preview pane visibility
   */
  const handleTogglePreview = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      isPreviewVisible: !prev.isPreviewVisible,
    }));
  }, []);

  /**
   * Clear any errors
   */
  const handleClearError = useCallback(() => {
    setAppState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Initialize app with a new document on first load
   */
  useEffect(() => {
    handleNewDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <ErrorBoundary>
        <header className="app-header">
          <FileMenu
            onNewDocument={handleNewDocument}
            onOpenDocument={handleOpenDocument}
            onSaveDocument={handleSaveDocument}
            hasUnsavedChanges={appState.currentDocument?.metadata.isDirty || false}
            isLoading={appState.isLoading}
          />
        </header>

        <main className="app-main">
          {appState.error && (
            <div className="error-banner">
              <span>{appState.error}</span>
              <button onClick={handleClearError} className="error-dismiss">
                ×
              </button>
            </div>
          )}

          {appState.isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          <div className="editor-container">
            <div className="editor-pane">
              <MarkdownEditor
                content={appState.currentDocument?.content || ''}
                onContentChange={handleContentChange}
                readOnly={appState.isLoading}
                placeholder="Start typing your markdown content..."
              />
            </div>

            {appState.isPreviewVisible && (
              <div className="preview-pane">
                <PreviewPane
                  content={appState.currentDocument?.content || ''}
                  isLoading={appState.isLoading}
                />
              </div>
            )}
          </div>
        </main>

        <footer className="app-footer">
          <StatusBar
            document={appState.currentDocument}
            isPreviewVisible={appState.isPreviewVisible}
            onTogglePreview={handleTogglePreview}
            isLoading={appState.isLoading}
          />
        </footer>
      </ErrorBoundary>
    </div>
  );
}

export default App;
