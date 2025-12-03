/**
 * Create Document Use Case
 *
 * 새로운 문서 생성 비즈니스 로직
 */

import { Document } from '../domain/entities/Document';
import { DocumentService } from '../domain/services/DocumentService';
import { MarkdownContent } from '../domain/value-objects/MarkdownContent';
import {
  CreateDocumentRequest,
  CreateDocumentResponse,
  DocumentResponse,
} from '../../ports/inbound/DocumentCommandPort';

export class CreateDocumentUseCase {
  /**
   * 새로운 문서 생성 실행
   */
  async execute(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    try {
      // 입력 검증
      this.validateRequest(request);

      // 문서 생성
      const document = Document.createNew(request.initialContent);

      // 제목이 제공된 경우 설정
      if (request.title && request.title.trim().length > 0) {
        document.changeTitle(request.title.trim());
      }

      // 비즈니스 규칙 검증
      const validation = DocumentService.validateDocument(document);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Document validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // 성공 응답
      return {
        success: true,
        document: this.mapDocumentToResponse(document),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating document',
      };
    }
  }

  private validateRequest(request: CreateDocumentRequest): void {
    // 초기 내용 검증
    if (request.initialContent !== undefined) {
      try {
        MarkdownContent.fromString(request.initialContent);
      } catch (error) {
        throw new Error(`Invalid initial content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 제목 검증
    if (request.title !== undefined) {
      if (typeof request.title !== 'string') {
        throw new Error('Title must be a string');
      }

      if (request.title.length > 200) {
        throw new Error('Title too long (max 200 characters)');
      }
    }
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