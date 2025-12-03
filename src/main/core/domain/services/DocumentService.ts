/**
 * Document Domain Service
 *
 * 복잡한 비즈니스 로직이나 여러 엔티티 간 조정이 필요한 도메인 서비스
 */

import { Document } from '../entities/Document';
import { FilePath } from '../value-objects/FilePath';
import { MarkdownContent } from '../value-objects/MarkdownContent';

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DocumentService {
  /**
   * 문서 유효성 검사 - 복합적인 비즈니스 규칙 적용
   */
  static validateDocument(document: Document): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 기본 검증
    if (document.isEmpty()) {
      warnings.push('Document is empty');
    }

    if (document.isLargeDocument()) {
      warnings.push('Document is very large and may impact performance');
    }

    // 제목 검증
    const metadata = document.metadata;
    if (!metadata.title || metadata.title.trim().length === 0) {
      errors.push('Document must have a title');
    }

    if (metadata.title && metadata.title.length > 200) {
      errors.push('Document title is too long');
    }

    // 내용 검증
    const content = document.content;
    if (content.getCharacterCount() > 1000000) {
      errors.push('Document content exceeds maximum size limit');
    }

    // 파일 경로 검증 (있는 경우)
    if (document.hasFilePath() && document.filePath) {
      if (!document.filePath.isMarkdownFile()) {
        errors.push('Document file must have .md extension');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 두 문서 내용이 실질적으로 같은지 비교
   */
  static isContentEquivalent(doc1: Document, doc2: Document): boolean {
    // 공백 정규화 후 비교
    const normalize = (content: MarkdownContent) =>
      content.value
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return normalize(doc1.content) === normalize(doc2.content);
  }

  /**
   * 문서 병합 - 충돌 해결 로직
   */
  static mergeDocuments(
    baseDocument: Document,
    incomingChanges: MarkdownContent,
    strategy: 'overwrite' | 'append' | 'smart' = 'smart'
  ): Document {
    const baseContent = baseDocument.content.value;
    const incomingContent = incomingChanges.value;

    let mergedContent: string;

    switch (strategy) {
      case 'overwrite':
        mergedContent = incomingContent;
        break;

      case 'append':
        mergedContent = baseContent + '\n\n' + incomingContent;
        break;

      case 'smart':
      default:
        // 간단한 스마트 병합 - 실제로는 더 복잡한 로직 필요
        if (baseContent.trim() === '') {
          mergedContent = incomingContent;
        } else if (incomingContent.trim() === '') {
          mergedContent = baseContent;
        } else {
          // 내용이 겹치는 부분이 있는지 확인
          if (baseContent.includes(incomingContent) || incomingContent.includes(baseContent)) {
            // 더 긴 내용을 선택
            mergedContent = baseContent.length > incomingContent.length ? baseContent : incomingContent;
          } else {
            // 두 내용을 구분자와 함께 병합
            mergedContent = baseContent + '\n\n---\n\n' + incomingContent;
          }
        }
        break;
    }

    // 새로운 문서 생성
    const newDocument = Document.createNew();
    newDocument.changeContent(MarkdownContent.fromString(mergedContent));

    // 기존 메타데이터 상속 (제목, 파일 경로 등)
    if (baseDocument.metadata.title !== 'Untitled Document') {
      newDocument.changeTitle(baseDocument.metadata.title);
    }

    if (baseDocument.hasFilePath() && baseDocument.filePath) {
      newDocument.setFilePath(baseDocument.filePath);
    }

    return newDocument;
  }

  /**
   * 문서 백업이 필요한지 판단
   */
  static shouldCreateBackup(document: Document): boolean {
    const metadata = document.metadata;

    // 큰 문서는 항상 백업
    if (document.isLargeDocument()) {
      return true;
    }

    // 저장된 지 오래된 문서 (24시간)
    if (metadata.savedAt) {
      const hoursSinceSave = (Date.now() - metadata.savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        return true;
      }
    }

    // 많이 수정된 문서 (생성 후 1시간 이상 지나고 여러 번 수정)
    const hoursOld = (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60);
    const hasSignificantChanges = Math.abs(metadata.modifiedAt.getTime() - metadata.createdAt.getTime()) > 1000 * 60 * 5; // 5분 이상 차이

    return hoursOld > 1 && hasSignificantChanges;
  }

  /**
   * 안전한 파일명 생성
   */
  static generateSafeFileName(document: Document): string {
    const title = document.metadata.title;

    // 특수문자 제거 및 공백을 하이픈으로 변환
    const safeTitle = title
      .replace(/[^\w\s-]/g, '') // 특수문자 제거
      .replace(/\s+/g, '-') // 공백을 하이픈으로
      .toLowerCase()
      .substring(0, 50); // 길이 제한

    return safeTitle || 'untitled';
  }

  /**
   * 문서 통계 계산
   */
  static calculateStatistics(document: Document): {
    wordCount: number;
    characterCount: number;
    lineCount: number;
    paragraphCount: number;
    estimatedReadingTime: number; // minutes
  } {
    const content = document.content;

    const wordCount = content.getWordCount();
    const characterCount = content.getCharacterCount();
    const lineCount = content.getLineCount();

    // 문단 수 계산 (빈 줄로 구분)
    const paragraphs = content.value.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // 읽기 시간 추정 (평균 200단어/분)
    const estimatedReadingTime = Math.ceil(wordCount / 200);

    return {
      wordCount,
      characterCount,
      lineCount,
      paragraphCount,
      estimatedReadingTime,
    };
  }
}