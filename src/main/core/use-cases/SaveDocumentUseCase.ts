/**
 * Save Document Use Case
 *
 * 문서 저장 비즈니스 로직 - 복잡한 조정 로직 포함
 */

import { Document } from '../domain/entities/Document';
import { DocumentService } from '../domain/services/DocumentService';
import { FilePath } from '../domain/value-objects/FilePath';
import { MarkdownContent } from '../domain/value-objects/MarkdownContent';
import { DocumentId } from '../domain/value-objects/DocumentId';
import {
  SaveDocumentRequest,
  SaveDocumentResponse,
} from '../../ports/inbound/DocumentCommandPort';
import { DocumentRepositoryPort } from '../../ports/outbound/DocumentRepositoryPort';
import { DialogPort } from '../../ports/outbound/DialogPort';

export class SaveDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly dialogService: DialogPort
  ) {}

  /**
   * 문서 저장 실행
   */
  async execute(request: SaveDocumentRequest): Promise<SaveDocumentResponse> {
    try {
      // 입력 검증
      this.validateRequest(request);

      // 문서 재구성
      const document = this.reconstructDocument(request);

      // 비즈니스 규칙 검증
      const validation = DocumentService.validateDocument(document);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Document validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // 파일 경로 결정
      const targetPath = await this.determineFilePath(document, request);
      if (!targetPath) {
        return {
          success: false,
          error: 'Save operation cancelled by user',
        };
      }

      // 백업 필요 여부 확인
      if (DocumentService.shouldCreateBackup(document)) {
        await this.createBackupIfNeeded(document);
      }

      // 문서 저장
      const saveResult = await this.documentRepository.save(document, targetPath);

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error || 'Failed to save document',
        };
      }

      // 문서 상태 업데이트
      if (saveResult.filePath) {
        document.markAsSaved(saveResult.filePath);
      }

      return {
        success: true,
        filePath: saveResult.filePath?.value,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving document',
      };
    }
  }

  private validateRequest(request: SaveDocumentRequest): void {
    if (!request.documentId || typeof request.documentId !== 'string') {
      throw new Error('Document ID is required');
    }

    if (typeof request.content !== 'string') {
      throw new Error('Document content must be a string');
    }

    // 내용 검증
    try {
      MarkdownContent.fromString(request.content);
    } catch (error) {
      throw new Error(`Invalid document content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 파일 경로 검증 (제공된 경우)
    if (request.filePath) {
      try {
        FilePath.fromString(request.filePath);
      } catch (error) {
        throw new Error(`Invalid file path: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private reconstructDocument(request: SaveDocumentRequest): Document {
    return Document.reconstitute(
      request.documentId,
      request.content,
      {
        title: 'Document', // 실제로는 기존 메타데이터에서 가져와야 함
        createdAt: new Date(), // 실제로는 기존 메타데이터에서 가져와야 함
        modifiedAt: new Date(),
        isDirty: true,
        wordCount: 0,
        characterCount: 0,
      },
      request.filePath
    );
  }

  private async determineFilePath(
    document: Document,
    request: SaveDocumentRequest
  ): Promise<FilePath | null> {
    // 파일 경로가 이미 제공된 경우
    if (request.filePath && !request.showSaveDialog) {
      return FilePath.fromString(request.filePath);
    }

    // 문서에 기존 파일 경로가 있고 다이얼로그를 강제로 표시하지 않는 경우
    if (document.hasFilePath() && !request.showSaveDialog) {
      return document.filePath!;
    }

    // 다이얼로그를 통한 파일 경로 선택
    const dialogResult = await this.dialogService.showSaveDialog({
      title: 'Save Markdown Document',
      defaultName: this.generateDefaultFileName(document),
      defaultPath: document.filePath,
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!dialogResult.success || dialogResult.cancelled || !dialogResult.filePath) {
      return null;
    }

    return dialogResult.filePath;
  }

  private generateDefaultFileName(document: Document): string {
    const safeFileName = DocumentService.generateSafeFileName(document);
    return safeFileName + '.md';
  }

  private async createBackupIfNeeded(document: Document): Promise<void> {
    try {
      await this.documentRepository.createBackup(document);
    } catch (error) {
      // 백업 실패는 저장 과정을 중단시키지 않음
      console.warn('Failed to create backup:', error);
    }
  }
}