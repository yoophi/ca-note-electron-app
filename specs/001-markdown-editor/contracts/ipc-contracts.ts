/**
 * IPC Contracts for Markdown Editor
 *
 * Defines type-safe communication contracts between Electron main and renderer processes.
 * These contracts ensure Clean Architecture principles by defining clear boundaries
 * between the UI layer (renderer) and infrastructure layer (main process file operations).
 */

// ========================================
// Base Types
// ========================================

export type DocumentId = string;
export type FilePath = string;
export type MarkdownContent = string;

// ========================================
// Domain Transfer Objects (DTOs)
// ========================================

export interface DocumentDto {
  id: DocumentId;
  content: MarkdownContent;
  filePath?: FilePath;
  metadata: DocumentMetadataDto;
}

export interface DocumentMetadataDto {
  title: string;
  createdAt: string; // ISO string for serialization
  modifiedAt: string; // ISO string for serialization
  savedAt?: string; // ISO string for serialization
  isDirty: boolean;
  characterCount: number;
  wordCount: number;
}

export interface EditorStateDto {
  documentId: DocumentId;
  cursorPosition: CursorPositionDto;
  selection: TextSelectionDto;
  scrollPosition: ScrollPositionDto;
  isPreviewVisible: boolean;
  zoomLevel: number;
}

export interface CursorPositionDto {
  line: number;
  column: number;
}

export interface TextSelectionDto {
  from: CursorPositionDto;
  to: CursorPositionDto;
  text: string;
}

export interface ScrollPositionDto {
  top: number;
  left: number;
}

export interface FileSystemReferenceDto {
  path: FilePath;
  permissions: FilePermissionsDto;
  lastModified: string; // ISO string
  size: number;
  exists: boolean;
}

export interface FilePermissionsDto {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

// ========================================
// Request/Response Types
// ========================================

export interface SaveDocumentRequest {
  documentId: DocumentId;
  content: MarkdownContent;
  filePath?: FilePath; // If omitted, show save dialog
}

export interface SaveDocumentResponse {
  success: boolean;
  filePath?: FilePath;
  error?: string;
}

export interface LoadDocumentRequest {
  filePath?: FilePath; // If omitted, show open dialog
}

export interface LoadDocumentResponse {
  success: boolean;
  document?: DocumentDto;
  error?: string;
}

export interface CreateDocumentRequest {
  initialContent?: MarkdownContent;
}

export interface CreateDocumentResponse {
  success: boolean;
  document?: DocumentDto;
  error?: string;
}

export interface GetFileMetadataRequest {
  filePath: FilePath;
}

export interface GetFileMetadataResponse {
  success: boolean;
  metadata?: FileSystemReferenceDto;
  error?: string;
}

export interface ShowOpenDialogRequest {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface ShowOpenDialogResponse {
  success: boolean;
  filePath?: FilePath;
  cancelled: boolean;
  error?: string;
}

export interface ShowSaveDialogRequest {
  defaultPath?: string;
  defaultName?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface ShowSaveDialogResponse {
  success: boolean;
  filePath?: FilePath;
  cancelled: boolean;
  error?: string;
}

// ========================================
// Event Types
// ========================================

export interface DocumentChangedEvent {
  type: 'document-changed';
  documentId: DocumentId;
  content: MarkdownContent;
  timestamp: string; // ISO string
}

export interface DocumentSavedEvent {
  type: 'document-saved';
  documentId: DocumentId;
  filePath: FilePath;
  timestamp: string; // ISO string
}

export interface DocumentLoadedEvent {
  type: 'document-loaded';
  documentId: DocumentId;
  filePath: FilePath;
  timestamp: string; // ISO string
}

export interface FileExternallyModifiedEvent {
  type: 'file-externally-modified';
  filePath: FilePath;
  timestamp: string; // ISO string
}

export type DocumentEvent =
  | DocumentChangedEvent
  | DocumentSavedEvent
  | DocumentLoadedEvent
  | FileExternallyModifiedEvent;

// ========================================
// IPC Channel Definitions
// ========================================

export const IPC_CHANNELS = {
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

export type IpcChannelName = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// ========================================
// Type Guards
// ========================================

export function isDocumentDto(obj: any): obj is DocumentDto {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.content === 'string' &&
    obj.metadata &&
    typeof obj.metadata.title === 'string';
}

export function isSaveDocumentRequest(obj: any): obj is SaveDocumentRequest {
  return obj &&
    typeof obj.documentId === 'string' &&
    typeof obj.content === 'string';
}

export function isLoadDocumentRequest(obj: any): obj is LoadDocumentRequest {
  return obj && (
    obj.filePath === undefined ||
    typeof obj.filePath === 'string'
  );
}

export function isDocumentEvent(obj: any): obj is DocumentEvent {
  return obj &&
    typeof obj.type === 'string' &&
    ['document-changed', 'document-saved', 'document-loaded', 'file-externally-modified'].includes(obj.type) &&
    typeof obj.timestamp === 'string';
}

// ========================================
// Validation Schemas
// ========================================

export const VALIDATION_RULES = {
  DOCUMENT_ID: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    required: true,
  },
  FILE_PATH: {
    maxLength: 260, // Windows compatibility
    pattern: /.*\.md$/, // Must end with .md
    required: true,
  },
  CONTENT: {
    maxLength: 5_000_000, // 5MB character limit
    required: true,
  },
  TITLE: {
    maxLength: 200,
    minLength: 1,
    required: true,
  },
  ZOOM_LEVEL: {
    min: 0.5,
    max: 3.0,
  },
  CURSOR_POSITION: {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
  },
} as const;

// ========================================
// Error Codes
// ========================================

export enum IpcErrorCode {
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  // Document errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_INVALID = 'DOCUMENT_INVALID',
  DOCUMENT_ALREADY_EXISTS = 'DOCUMENT_ALREADY_EXISTS',

  // Validation errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
}

export interface IpcError {
  code: IpcErrorCode;
  message: string;
  details?: Record<string, any>;
}

// ========================================
// Preload API Type Definitions
// ========================================

/**
 * Type-safe API exposed to renderer process via preload script
 */
export interface ElectronApi {
  // Document operations
  createDocument: (request: CreateDocumentRequest) => Promise<CreateDocumentResponse>;
  saveDocument: (request: SaveDocumentRequest) => Promise<SaveDocumentResponse>;
  loadDocument: (request: LoadDocumentRequest) => Promise<LoadDocumentResponse>;

  // File operations
  showOpenDialog: (request: ShowOpenDialogRequest) => Promise<ShowOpenDialogResponse>;
  showSaveDialog: (request: ShowSaveDialogRequest) => Promise<ShowSaveDialogResponse>;
  getFileMetadata: (request: GetFileMetadataRequest) => Promise<GetFileMetadataResponse>;

  // Event listeners
  onDocumentEvent: (callback: (event: DocumentEvent) => void) => () => void;

  // Application
  getVersion: () => Promise<string>;
}

// ========================================
// Clean Architecture Boundary Contract
// ========================================

/**
 * Contract interface that defines the boundary between
 * the Use Cases layer and Infrastructure layer.
 *
 * This ensures Clean Architecture dependency inversion:
 * Use Cases depend on this interface, not on Electron-specific implementations.
 */
export interface FileSystemGateway {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  getFileMetadata(filePath: string): Promise<FileSystemReferenceDto>;
  showOpenDialog(options?: { defaultPath?: string }): Promise<string | null>;
  showSaveDialog(options?: { defaultPath?: string; defaultName?: string }): Promise<string | null>;
}

/**
 * Event publisher interface for domain events.
 * Infrastructure layer implements this, Use Cases depend on it.
 */
export interface DocumentEventPublisher {
  publish(event: DocumentEvent): void;
  subscribe(callback: (event: DocumentEvent) => void): () => void;
}

// ========================================
// Usage Examples and Documentation
// ========================================

/**
 * Example usage in renderer process:
 *
 * ```typescript
 * // Create new document
 * const createResponse = await window.electronApi.createDocument({
 *   initialContent: '# My New Document'
 * });
 *
 * if (createResponse.success) {
 *   console.log('Document created:', createResponse.document);
 * }
 *
 * // Save document
 * const saveResponse = await window.electronApi.saveDocument({
 *   documentId: document.id,
 *   content: '# Updated content',
 *   filePath: '/path/to/file.md'
 * });
 *
 * // Listen for events
 * const unsubscribe = window.electronApi.onDocumentEvent((event) => {
 *   if (event.type === 'document-saved') {
 *     console.log('Document saved:', event.filePath);
 *   }
 * });
 * ```
 */