/**
 * Load Document Use Case
 *
 * 문서 로딩 비즈니스 로직
 */

import { Document } from '../domain/entities/Document';
import { DocumentService } from '../domain/services/DocumentService';
import { FilePath } from '../domain/value-objects/FilePath';
import {
  LoadDocumentRequest,
  LoadDocumentResponse,
  DocumentResponse,
} from '../../ports/inbound/DocumentCommandPort';
import { DocumentRepositoryPort } from '../../ports/outbound/DocumentRepositoryPort';
import { DialogPort } from '../../ports/outbound/DialogPort';

export class LoadDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly dialogService: DialogPort
  ) {}

  /**
   * 문서 로딩 실행
   */
  async execute(request: LoadDocumentRequest): Promise<LoadDocumentResponse> {
    try {
      // 입력 검증
      this.validateRequest(request);

      // 파일 경로 결정
      const filePath = await this.determineFilePath(request);
      if (!filePath) {
        return {
          success: false,
          error: 'Load operation cancelled by user',
        };
      }

      // 파일 존재 여부 확인
      const fileExists = await this.documentRepository.exists(filePath);
      if (!fileExists) {
        return {
          success: false,
          error: `File does not exist: ${filePath.value}`,
        };
      }

      // 문서 로드
      const loadResult = await this.documentRepository.load(filePath);

      if (!loadResult.success || !loadResult.document) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load document',
        };
      }

      // 로드된 문서 검증
      const validation = DocumentService.validateDocument(loadResult.document);
      if (!validation.isValid) {
        // 경고가 있어도 로드는 허용하지만 사용자에게 알림
        console.warn('Document validation warnings:', validation.warnings);

        if (validation.errors.length > 0) {
          return {
            success: false,
            error: `Document validation failed: ${validation.errors.join(', ')}`,
          };
        }
      }

      return {
        success: true,
        document: this.mapDocumentToResponse(loadResult.document),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading document',
      };
    }
  }

  private validateRequest(request: LoadDocumentRequest): void {
    // 파일 경로 검증 (제공된 경우)
    if (request.filePath) {
      try {
        FilePath.fromString(request.filePath);
      } catch (error) {
        throw new Error(`Invalid file path: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async determineFilePath(request: LoadDocumentRequest): Promise<FilePath | null> {
    // 파일 경로가 이미 제공된 경우
    if (request.filePath && !request.showOpenDialog) {
      return FilePath.fromString(request.filePath);
    }

    // 다이얼로그를 통한 파일 선택
    const dialogResult = await this.dialogService.showOpenDialog({
      title: 'Open Markdown Document',
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      multiSelect: false,
    });

    if (!dialogResult.success || dialogResult.cancelled || dialogResult.filePaths.length === 0) {
      return null;
    }

    return dialogResult.filePaths[0];
  }

  private mapDocumentToResponse(document: Document): DocumentResponse {
    const metadata = document.metadata;

    return {
      id: document.id.value,
      content: document.content.value,
      filePath: document.filePath?.value,
      metadata: {
        title: metadata.title,
        createdAt: metadata.createdAt.toISOString(),
        modifiedAt: metadata.modifiedAt.toISOString(),
        savedAt: metadata.savedAt?.toISOString(),
        isDirty: metadata.isDirty,
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
      },
    };
  }
}