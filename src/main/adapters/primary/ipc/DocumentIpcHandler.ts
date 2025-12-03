/**
 * Document IPC Handler
 *
 * IPC 요청을 DocumentCommandPort로 전달하는 Primary Adapter
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../../../shared/contracts/ipc-contracts';
import {
  DocumentCommandPort,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  SaveDocumentRequest,
  LoadDocumentRequest,
  DeleteDocumentRequest,
  DuplicateDocumentRequest,
} from '../../../ports/inbound/DocumentCommandPort';

export class DocumentIpcHandler {
  constructor(
    private readonly documentCommandService: DocumentCommandPort
  ) {}

  /**
   * IPC 핸들러 등록
   */
  registerHandlers(): void {
    // 문서 생성
    ipcMain.handle(
      IPC_CHANNELS.DOCUMENT_CREATE,
      this.handleCreateDocument.bind(this)
    );

    // 문서 저장
    ipcMain.handle(
      IPC_CHANNELS.DOCUMENT_SAVE,
      this.handleSaveDocument.bind(this)
    );

    // 문서 로드
    ipcMain.handle(
      IPC_CHANNELS.DOCUMENT_LOAD,
      this.handleLoadDocument.bind(this)
    );

    console.log('[DocumentIpcHandler] IPC handlers registered successfully');
  }

  /**
   * 문서 생성 핸들러
   */
  private async handleCreateDocument(
    _event: IpcMainInvokeEvent,
    request: CreateDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Creating document:', request);

      const result = await this.documentCommandService.createDocument(request);

      console.log('[DocumentIpcHandler] Document creation result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error creating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating document',
      };
    }
  }

  /**
   * 문서 저장 핸들러
   */
  private async handleSaveDocument(
    _event: IpcMainInvokeEvent,
    request: SaveDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Saving document:', {
        documentId: request.documentId,
        hasFilePath: !!request.filePath,
        contentLength: request.content?.length || 0,
      });

      const result = await this.documentCommandService.saveDocument(request);

      console.log('[DocumentIpcHandler] Document save result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error saving document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving document',
      };
    }
  }

  /**
   * 문서 로드 핸들러
   */
  private async handleLoadDocument(
    _event: IpcMainInvokeEvent,
    request: LoadDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Loading document:', {
        hasFilePath: !!request.filePath,
        showOpenDialog: request.showOpenDialog,
      });

      const result = await this.documentCommandService.loadDocument(request);

      console.log('[DocumentIpcHandler] Document load result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error loading document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading document',
      };
    }
  }

  /**
   * 문서 업데이트 핸들러
   */
  private async handleUpdateDocument(
    _event: IpcMainInvokeEvent,
    request: UpdateDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Updating document:', {
        documentId: request.documentId,
        contentLength: request.content?.length || 0,
      });

      const result = await this.documentCommandService.updateDocument(request);

      console.log('[DocumentIpcHandler] Document update result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error updating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating document',
      };
    }
  }

  /**
   * 문서 삭제 핸들러
   */
  private async handleDeleteDocument(
    _event: IpcMainInvokeEvent,
    request: DeleteDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Deleting document:', request.documentId);

      const result = await this.documentCommandService.deleteDocument(request);

      console.log('[DocumentIpcHandler] Document deletion result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting document',
      };
    }
  }

  /**
   * 문서 복제 핸들러
   */
  private async handleDuplicateDocument(
    _event: IpcMainInvokeEvent,
    request: DuplicateDocumentRequest
  ) {
    try {
      console.log('[DocumentIpcHandler] Duplicating document:', request.sourceDocumentId);

      const result = await this.documentCommandService.duplicateDocument(request);

      console.log('[DocumentIpcHandler] Document duplication result:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentIpcHandler] Error duplicating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error duplicating document',
      };
    }
  }

  /**
   * IPC 핸들러 해제
   */
  unregisterHandlers(): void {
    ipcMain.removeHandler(IPC_CHANNELS.DOCUMENT_CREATE);
    ipcMain.removeHandler(IPC_CHANNELS.DOCUMENT_SAVE);
    ipcMain.removeHandler(IPC_CHANNELS.DOCUMENT_LOAD);

    console.log('[DocumentIpcHandler] IPC handlers unregistered');
  }
}