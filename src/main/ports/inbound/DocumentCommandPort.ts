/**
 * Document Command Port (Inbound)
 *
 * 문서 관련 명령을 처리하는 인터페이스
 * 외부(IPC, API 등)에서 문서 작업을 요청할 때 사용
 */

import { Document } from '../../core/domain/entities/Document';
import { DocumentId } from '../../core/domain/value-objects/DocumentId';
import { FilePath } from '../../core/domain/value-objects/FilePath';
import { MarkdownContent } from '../../core/domain/value-objects/MarkdownContent';

export interface DocumentCommandPort {
  /**
   * 새로운 문서 생성
   */
  createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse>;

  /**
   * 문서 내용 업데이트
   */
  updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse>;

  /**
   * 문서 저장
   */
  saveDocument(request: SaveDocumentRequest): Promise<SaveDocumentResponse>;

  /**
   * 문서 로드
   */
  loadDocument(request: LoadDocumentRequest): Promise<LoadDocumentResponse>;

  /**
   * 문서 삭제
   */
  deleteDocument(request: DeleteDocumentRequest): Promise<DeleteDocumentResponse>;

  /**
   * 문서 복사
   */
  duplicateDocument(request: DuplicateDocumentRequest): Promise<DuplicateDocumentResponse>;
}

// Request DTOs
export interface CreateDocumentRequest {
  initialContent?: string;
  title?: string;
}

export interface UpdateDocumentRequest {
  documentId: string;
  content: string;
  title?: string;
}

export interface SaveDocumentRequest {
  documentId: string;
  content: string;
  filePath?: string;
  showSaveDialog?: boolean;
}

export interface LoadDocumentRequest {
  filePath?: string;
  showOpenDialog?: boolean;
}

export interface DeleteDocumentRequest {
  documentId: string;
  deleteFile?: boolean;
}

export interface DuplicateDocumentRequest {
  sourceDocumentId: string;
  newTitle?: string;
}

// Response DTOs
export interface DocumentResponse {
  id: string;
  content: string;
  filePath?: string;
  metadata: {
    title: string;
    createdAt: string;
    modifiedAt: string;
    savedAt?: string;
    isDirty: boolean;
    wordCount: number;
    characterCount: number;
  };
}

export interface CreateDocumentResponse {
  success: boolean;
  document?: DocumentResponse;
  error?: string;
}

export interface UpdateDocumentResponse {
  success: boolean;
  document?: DocumentResponse;
  error?: string;
}

export interface SaveDocumentResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface LoadDocumentResponse {
  success: boolean;
  document?: DocumentResponse;
  error?: string;
}

export interface DeleteDocumentResponse {
  success: boolean;
  error?: string;
}

export interface DuplicateDocumentResponse {
  success: boolean;
  document?: DocumentResponse;
  error?: string;
}