import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import { IPC_CHANNELS } from '../shared/contracts/ipc-contracts'
import type {
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
} from '../shared/contracts/ipc-contracts'
import { DocumentFactory } from '../shared/entities/Document'
import { FileSystemReference } from './entities/FileSystemReference'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  setupIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

/**
 * Setup IPC handlers for document and file operations
 */
function setupIpcHandlers(): void {
  // Document operations
  ipcMain.handle(IPC_CHANNELS.DOCUMENT_CREATE, async (_event, request: CreateDocumentRequest): Promise<CreateDocumentResponse> => {
    try {
      const document = DocumentFactory.createNew(request.initialContent || '');

      return {
        success: true,
        document: {
          id: document.id,
          content: document.content,
          filePath: document.filePath,
          metadata: {
            title: document.metadata.title,
            createdAt: document.metadata.createdAt.toISOString(),
            modifiedAt: document.metadata.modifiedAt.toISOString(),
            savedAt: document.metadata.savedAt?.toISOString(),
            isDirty: document.metadata.isDirty,
            characterCount: document.metadata.characterCount,
            wordCount: document.metadata.wordCount,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating document',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_SAVE, async (_event, request: SaveDocumentRequest): Promise<SaveDocumentResponse> => {
    try {
      let filePath = request.filePath;

      // If no file path provided, show save dialog
      if (!filePath) {
        const result = await dialog.showSaveDialog({
          title: 'Save Markdown Document',
          defaultPath: 'untitled.md',
          filters: [
            { name: 'Markdown Files', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return {
            success: false,
            error: 'Save operation cancelled',
          };
        }

        filePath = result.filePath;
      }

      // Ensure .md extension
      if (!filePath.endsWith('.md')) {
        filePath += '.md';
      }

      // Write file
      await fs.writeFile(filePath, request.content, 'utf8');

      return {
        success: true,
        filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving document',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_LOAD, async (_event, request: LoadDocumentRequest): Promise<LoadDocumentResponse> => {
    try {
      let filePath = request.filePath;

      // If no file path provided, show open dialog
      if (!filePath) {
        const result = await dialog.showOpenDialog({
          title: 'Open Markdown Document',
          filters: [
            { name: 'Markdown Files', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: false,
            error: 'Open operation cancelled',
          };
        }

        filePath = result.filePaths[0];
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');

      // Create document from file
      const document = DocumentFactory.createFromFile(
        crypto.randomUUID(), // Generate new ID for loaded document
        content,
        filePath
      );

      return {
        success: true,
        document: {
          id: document.id,
          content: document.content,
          filePath: document.filePath,
          metadata: {
            title: document.metadata.title,
            createdAt: document.metadata.createdAt.toISOString(),
            modifiedAt: document.metadata.modifiedAt.toISOString(),
            savedAt: document.metadata.savedAt?.toISOString(),
            isDirty: document.metadata.isDirty,
            characterCount: document.metadata.characterCount,
            wordCount: document.metadata.wordCount,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading document',
      };
    }
  });

  // File system operations
  ipcMain.handle(IPC_CHANNELS.FILE_SHOW_OPEN_DIALOG, async (_event, request: ShowOpenDialogRequest): Promise<ShowOpenDialogResponse> => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Open File',
        defaultPath: request.defaultPath,
        filters: request.filters || [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled) {
        return {
          success: true,
          cancelled: true,
        };
      }

      return {
        success: true,
        filePath: result.filePaths[0],
        cancelled: false,
      };
    } catch (error) {
      return {
        success: false,
        cancelled: false,
        error: error instanceof Error ? error.message : 'Unknown error showing open dialog',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SHOW_SAVE_DIALOG, async (_event, request: ShowSaveDialogRequest): Promise<ShowSaveDialogResponse> => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save File',
        defaultPath: request.defaultPath ? join(request.defaultPath, request.defaultName || 'untitled.md') : request.defaultName,
        filters: request.filters || [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled) {
        return {
          success: true,
          cancelled: true,
        };
      }

      return {
        success: true,
        filePath: result.filePath,
        cancelled: false,
      };
    } catch (error) {
      return {
        success: false,
        cancelled: false,
        error: error instanceof Error ? error.message : 'Unknown error showing save dialog',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_GET_METADATA, async (_event, request: GetFileMetadataRequest): Promise<GetFileMetadataResponse> => {
    try {
      const fileRef = await FileSystemReference.fromPath(request.filePath);

      return {
        success: true,
        metadata: {
          path: fileRef.path,
          permissions: {
            readable: fileRef.permissions.readable,
            writable: fileRef.permissions.writable,
            executable: fileRef.permissions.executable,
          },
          lastModified: fileRef.lastModified.toISOString(),
          size: fileRef.size,
          exists: fileRef.exists,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting file metadata',
      };
    }
  });

  // Application lifecycle
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async (): Promise<string> => {
    return app.getVersion();
  });

  // Application events
  ipcMain.on(IPC_CHANNELS.APP_READY, () => {
    console.log('[Main] Renderer process ready');
  });

  ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
    app.quit();
  });

  // Development helpers
  if (is.dev) {
    ipcMain.on('dev:log', (_event, { level, message, args }) => {
      console[level as keyof Console]('[Renderer]', message, ...args);
    });

    ipcMain.handle('dev:performance', async () => {
      return {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        arch: process.arch,
        versions: process.versions,
      };
    });

    ipcMain.on('dev:error', (_event, errorInfo) => {
      console.error('[Renderer Error]', errorInfo);
    });

    ipcMain.on('dev:unhandled-rejection', (_event, rejectionInfo) => {
      console.error('[Renderer Unhandled Rejection]', rejectionInfo);
    });
  }

  // Window lifecycle events
  ipcMain.on('renderer:before-unload', () => {
    console.log('[Main] Renderer about to unload');
  });

  console.log('[Main] IPC handlers registered successfully');
}
