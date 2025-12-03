/**
 * Document Repository Port (Outbound)
 *
 * 문서 영속성을 위한 포트 인터페이스
 * 구체적인 저장 방식(파일시스템, 데이터베이스 등)과 독립적
 */

import { Document } from '../../core/domain/entities/Document';
import { DocumentId } from '../../core/domain/value-objects/DocumentId';
import { FilePath } from '../../core/domain/value-objects/FilePath';

export interface DocumentRepositoryPort {
  /**
   * 문서를 파일 시스템에 저장
   */
  save(document: Document, targetPath?: FilePath): Promise<SaveResult>;

  /**
   * 파일에서 문서 로드
   */
  load(filePath: FilePath): Promise<LoadResult>;

  /**
   * 문서가 존재하는지 확인
   */
  exists(filePath: FilePath): Promise<boolean>;

  /**
   * 문서 백업 생성
   */
  createBackup(document: Document): Promise<BackupResult>;

  /**
   * 임시 문서 저장 (자동저장용)
   */
  saveTemporary(document: Document): Promise<SaveResult>;

  /**
   * 임시 문서 복구
   */
  recoverTemporary(documentId: DocumentId): Promise<LoadResult>;
}

export interface SaveResult {
  success: boolean;
  filePath?: FilePath;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  document?: Document;
  error?: string;
}

export interface BackupResult {
  success: boolean;
  backupPath?: FilePath;
  error?: string;
}