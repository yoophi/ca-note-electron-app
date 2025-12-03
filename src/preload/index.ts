/**
 * Preload Script - Electron IPC Bridge
 *
 * Provides type-safe API to the renderer process while maintaining
 * security by exposing only necessary APIs through contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ElectronApi,
  CreateDocumentRequest,
  CreateDocumentResponse,
  SaveDocumentRequest,
  SaveDocumentResponse,
  LoadDocumentRequest,
  LoadDocumentResponse,
  ShowOpenDialogRequest,
  ShowOpenDialogResponse,
  ShowSaveDialogRequest,
  ShowSaveDialogResponse,
  GetFileMetadataRequest,
  GetFileMetadataResponse,
  DocumentEvent,
} from '../shared/contracts/ipc-contracts';

// Define IPC channels locally to avoid import issues during build
const IPC_CHANNELS = {
  // Document operations
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_SAVE: 'document:save',
  DOCUMENT_LOAD: 'document:load',
  DOCUMENT_GET_METADATA: 'document:get-metadata',

  // File system operations
  FILE_SHOW_OPEN_DIALOG: 'file:show-open-dialog',
  FILE_SHOW_SAVE_DIALOG: 'file:show-save-dialog',
  FILE_CHECK_EXISTS: 'file:check-exists',
  FILE_GET_METADATA: 'file:get-metadata',

  // Events (main -> renderer)
  EVENT_DOCUMENT_CHANGED: 'event:document-changed',
  EVENT_DOCUMENT_SAVED: 'event:document-saved',
  EVENT_DOCUMENT_LOADED: 'event:document-loaded',
  EVENT_FILE_EXTERNALLY_MODIFIED: 'event:file-externally-modified',

  // Application lifecycle
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',
  APP_GET_VERSION: 'app:get-version',
} as const;

/**
 * Type-safe IPC API implementation
 */
const electronApi: ElectronApi = {
  // Document operations
  createDocument: async (request: CreateDocumentRequest): Promise<CreateDocumentResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_CREATE, request);
  },

  saveDocument: async (request: SaveDocumentRequest): Promise<SaveDocumentResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_SAVE, request);
  },

  loadDocument: async (request: LoadDocumentRequest): Promise<LoadDocumentResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_LOAD, request);
  },

  // File operations
  showOpenDialog: async (request: ShowOpenDialogRequest): Promise<ShowOpenDialogResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.FILE_SHOW_OPEN_DIALOG, request);
  },

  showSaveDialog: async (request: ShowSaveDialogRequest): Promise<ShowSaveDialogResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.FILE_SHOW_SAVE_DIALOG, request);
  },

  getFileMetadata: async (request: GetFileMetadataRequest): Promise<GetFileMetadataResponse> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_METADATA, request);
  },

  // Event listeners
  onDocumentEvent: (callback: (event: DocumentEvent) => void): (() => void) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: DocumentEvent) => {
      callback(data);
    };

    // Register listeners for all document events
    ipcRenderer.on(IPC_CHANNELS.EVENT_DOCUMENT_CHANGED, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.EVENT_DOCUMENT_SAVED, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.EVENT_DOCUMENT_LOADED, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.EVENT_FILE_EXTERNALLY_MODIFIED, wrappedCallback);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_DOCUMENT_CHANGED, wrappedCallback);
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_DOCUMENT_SAVED, wrappedCallback);
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_DOCUMENT_LOADED, wrappedCallback);
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_FILE_EXTERNALLY_MODIFIED, wrappedCallback);
    };
  },

  // Application
  getVersion: async (): Promise<string> => {
    return await ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION);
  },
};

/**
 * Enhanced API with additional utilities for development and debugging
 */
const devApi = {
  /**
   * Check if running in development mode
   */
  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Get platform information
   */
  getPlatform: (): NodeJS.Platform => {
    return process.platform;
  },

  /**
   * Log message to main process console (development only)
   */
  logToMain: (level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void => {
    if (process.env.NODE_ENV === 'development') {
      ipcRenderer.send('dev:log', { level, message, args });
    }
  },

  /**
   * Get performance metrics (development only)
   */
  getPerformanceMetrics: async (): Promise<any> => {
    if (process.env.NODE_ENV === 'development') {
      return await ipcRenderer.invoke('dev:performance');
    }
    return null;
  },
};

/**
 * Safe API wrapper with error handling
 */
const createSafeApi = (api: ElectronApi): ElectronApi => {
  const safeHandler = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((error: Error) => {
            console.error('IPC API Error:', error);
            throw new Error(`IPC operation failed: ${error.message}`);
          });
        }
        return result;
      } catch (error) {
        console.error('IPC API Error:', error);
        throw new Error(`IPC operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }) as T;
  };

  return {
    createDocument: safeHandler(api.createDocument),
    saveDocument: safeHandler(api.saveDocument),
    loadDocument: safeHandler(api.loadDocument),
    showOpenDialog: safeHandler(api.showOpenDialog),
    showSaveDialog: safeHandler(api.showSaveDialog),
    getFileMetadata: safeHandler(api.getFileMetadata),
    onDocumentEvent: safeHandler(api.onDocumentEvent),
    getVersion: safeHandler(api.getVersion),
  };
};

/**
 * Expose APIs to renderer process via contextBridge
 */
try {
  // Main API - always exposed
  contextBridge.exposeInMainWorld('electronApi', createSafeApi(electronApi));

  // Development API - only in development mode
  if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('electronDevApi', devApi);
  }

  // Type information for TypeScript (attached to window)
  contextBridge.exposeInMainWorld('electronApiVersion', '1.0.0');

  console.info('[Preload] APIs exposed successfully');
} catch (error) {
  console.error('[Preload] Failed to expose APIs:', error);
}

/**
 * Window event handlers for application lifecycle
 */
window.addEventListener('DOMContentLoaded', () => {
  console.info('[Preload] DOM content loaded');

  // Notify main process that renderer is ready
  ipcRenderer.send(IPC_CHANNELS.APP_READY);
});

window.addEventListener('beforeunload', (event) => {
  console.info('[Preload] Window about to unload');

  // Allow main process to handle unsaved changes
  event.preventDefault();
  ipcRenderer.send('renderer:before-unload');

  // Return undefined to allow normal unload if main process doesn't prevent it
  return undefined;
});

/**
 * Error handling for uncaught errors in renderer
 */
window.addEventListener('error', (event) => {
  console.error('[Preload] Uncaught error in renderer:', event.error);

  if (process.env.NODE_ENV === 'development') {
    ipcRenderer.send('dev:error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Preload] Unhandled promise rejection in renderer:', event.reason);

  if (process.env.NODE_ENV === 'development') {
    ipcRenderer.send('dev:unhandled-rejection', {
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
    });
  }
});

/**
 * TypeScript declarations for global APIs
 */
declare global {
  interface Window {
    electronApi: ElectronApi;
    electronDevApi?: typeof devApi;
    electronApiVersion: string;
  }
}

export type { ElectronApi };
