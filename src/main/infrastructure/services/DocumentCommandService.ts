/**
 * Document Command Service
 *
 * DocumentCommandPort의 구현체 - Use Cases를 조정하는 Application Service
 */

import {
  DocumentCommandPort,
  CreateDocumentRequest,
  CreateDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  SaveDocumentRequest,
  SaveDocumentResponse,
  LoadDocumentRequest,
  LoadDocumentResponse,
  DeleteDocumentRequest,
  DeleteDocumentResponse,
  DuplicateDocumentRequest,
  DuplicateDocumentResponse,
} from '../../ports/inbound/DocumentCommandPort';

import { CreateDocumentUseCase } from '../../core/use-cases/CreateDocumentUseCase';
import { SaveDocumentUseCase } from '../../core/use-cases/SaveDocumentUseCase';
import { LoadDocumentUseCase } from '../../core/use-cases/LoadDocumentUseCase';

export class DocumentCommandService implements DocumentCommandPort {
  constructor(
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly saveDocumentUseCase: SaveDocumentUseCase,
    private readonly loadDocumentUseCase: LoadDocumentUseCase
  ) {}

  /**
   * 새로운 문서 생성
   */
  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    console.log('[DocumentCommandService] Creating document with request:', request);

    try {
      const result = await this.createDocumentUseCase.execute(request);

      console.log('[DocumentCommandService] Document creation completed:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentCommandService] Error in createDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document creation service',
      };
    }
  }

  /**
   * 문서 내용 업데이트
   */
  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    console.log('[DocumentCommandService] Updating document:', request.documentId);

    try {
      // TODO: UpdateDocumentUseCase 구현 후 연결
      // 현재는 간단한 구현으로 대체
      return {
        success: false,
        error: 'UpdateDocument use case not implemented yet',
      };

    } catch (error) {
      console.error('[DocumentCommandService] Error in updateDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document update service',
      };
    }
  }

  /**
   * 문서 저장
   */
  async saveDocument(request: SaveDocumentRequest): Promise<SaveDocumentResponse> {
    console.log('[DocumentCommandService] Saving document:', request.documentId);

    try {
      const result = await this.saveDocumentUseCase.execute(request);

      console.log('[DocumentCommandService] Document save completed:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentCommandService] Error in saveDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document save service',
      };
    }
  }

  /**
   * 문서 로드
   */
  async loadDocument(request: LoadDocumentRequest): Promise<LoadDocumentResponse> {
    console.log('[DocumentCommandService] Loading document:', request.filePath || 'with dialog');

    try {
      const result = await this.loadDocumentUseCase.execute(request);

      console.log('[DocumentCommandService] Document load completed:', result.success);
      return result;

    } catch (error) {
      console.error('[DocumentCommandService] Error in loadDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document load service',
      };
    }
  }

  /**
   * 문서 삭제
   */
  async deleteDocument(request: DeleteDocumentRequest): Promise<DeleteDocumentResponse> {
    console.log('[DocumentCommandService] Deleting document:', request.documentId);

    try {
      // TODO: DeleteDocumentUseCase 구현 후 연결
      // 현재는 간단한 구현으로 대체
      return {
        success: false,
        error: 'DeleteDocument use case not implemented yet',
      };

    } catch (error) {
      console.error('[DocumentCommandService] Error in deleteDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document delete service',
      };
    }
  }

  /**
   * 문서 복사
   */
  async duplicateDocument(request: DuplicateDocumentRequest): Promise<DuplicateDocumentResponse> {
    console.log('[DocumentCommandService] Duplicating document:', request.sourceDocumentId);

    try {
      // TODO: DuplicateDocumentUseCase 구현 후 연결
      // 현재는 간단한 구현으로 대체
      return {
        success: false,
        error: 'DuplicateDocument use case not implemented yet',
      };

    } catch (error) {
      console.error('[DocumentCommandService] Error in duplicateDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in document duplicate service',
      };
    }
  }
}