/**
 * Document Domain Entity
 *
 * 마크다운 문서의 핵심 도메인 모델 - 순수 비즈니스 로직만 포함
 */

import { DocumentId } from '../value-objects/DocumentId';
import { FilePath } from '../value-objects/FilePath';
import { MarkdownContent } from '../value-objects/MarkdownContent';

export interface DocumentMetadata {
  title: string;
  createdAt: Date;
  modifiedAt: Date;
  savedAt?: Date;
  isDirty: boolean;
  wordCount: number;
  characterCount: number;
}

export class Document {
  private readonly _id: DocumentId;
  private _content: MarkdownContent;
  private _filePath?: FilePath;
  private _metadata: DocumentMetadata;

  constructor(
    id: DocumentId,
    content: MarkdownContent,
    metadata: DocumentMetadata,
    filePath?: FilePath
  ) {
    this._id = id;
    this._content = content;
    this._filePath = filePath;
    this._metadata = { ...metadata };
  }

  // Getters
  get id(): DocumentId {
    return this._id;
  }

  get content(): MarkdownContent {
    return this._content;
  }

  get filePath(): FilePath | undefined {
    return this._filePath;
  }

  get metadata(): DocumentMetadata {
    return { ...this._metadata };
  }

  // 비즈니스 메서드

  /**
   * 문서 내용 변경 - 비즈니스 규칙 적용
   */
  changeContent(newContent: MarkdownContent): void {
    if (this._content.equals(newContent)) {
      return; // 변경사항 없음
    }

    this._content = newContent;
    this._metadata = {
      ...this._metadata,
      modifiedAt: new Date(),
      isDirty: true,
      wordCount: newContent.getWordCount(),
      characterCount: newContent.getCharacterCount(),
    };
  }

  /**
   * 파일 경로 설정
   */
  setFilePath(filePath: FilePath): void {
    this._filePath = filePath;

    // 파일명에서 제목 추출
    const fileName = filePath.getFileNameWithoutExtension();
    if (fileName && fileName !== 'untitled') {
      this._metadata = {
        ...this._metadata,
        title: this.formatTitle(fileName),
      };
    }
  }

  /**
   * 문서를 저장됨으로 표시
   */
  markAsSaved(filePath?: FilePath): void {
    if (filePath) {
      this.setFilePath(filePath);
    }

    this._metadata = {
      ...this._metadata,
      savedAt: new Date(),
      isDirty: false,
    };
  }

  /**
   * 문서 제목 변경
   */
  changeTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Document title cannot be empty');
    }

    if (title.length > 200) {
      throw new Error('Document title too long (max 200 characters)');
    }

    this._metadata = {
      ...this._metadata,
      title: title.trim(),
      modifiedAt: new Date(),
      isDirty: true,
    };
  }

  // 도메인 쿼리 메서드

  /**
   * 저장 필요 여부 확인
   */
  needsSaving(): boolean {
    return this._metadata.isDirty;
  }

  /**
   * 파일과 연결되어 있는지 확인
   */
  hasFilePath(): boolean {
    return this._filePath !== undefined;
  }

  /**
   * 내용이 비어있는지 확인
   */
  isEmpty(): boolean {
    return this._content.isEmpty();
  }

  /**
   * 대용량 문서인지 확인
   */
  isLargeDocument(): boolean {
    return this._content.getCharacterCount() > 100000; // 100K chars
  }

  /**
   * 문서의 파일명 반환
   */
  getFileName(): string {
    if (this._filePath) {
      return this._filePath.getFileName();
    }

    return this._metadata.title.length > 0
      ? `${this._metadata.title}.md`
      : 'untitled.md';
  }

  /**
   * 문서 미리보기 텍스트 반환
   */
  getPreview(maxLength: number = 100): string {
    return this._content.getPreview(maxLength);
  }

  // 프라이빗 헬퍼 메서드

  private formatTitle(fileName: string): string {
    return fileName
      .replace(/[-_]/g, ' ') // 하이픈, 언더스코어를 공백으로
      .replace(/\b\w/g, l => l.toUpperCase()) // 각 단어의 첫 글자 대문자
      .trim();
  }

  // 팩토리 메서드

  /**
   * 새로운 빈 문서 생성
   */
  static createNew(initialContent?: string): Document {
    const content = MarkdownContent.fromString(initialContent || '');

    return new Document(
      DocumentId.generate(),
      content,
      {
        title: 'Untitled Document',
        createdAt: new Date(),
        modifiedAt: new Date(),
        isDirty: true,
        wordCount: content.getWordCount(),
        characterCount: content.getCharacterCount(),
      }
    );
  }

  /**
   * 파일에서 문서 생성
   */
  static createFromFile(
    content: string,
    filePath: FilePath
  ): Document {
    const markdownContent = MarkdownContent.fromString(content);
    const fileName = filePath.getFileNameWithoutExtension();

    return new Document(
      DocumentId.generate(),
      markdownContent,
      {
        title: fileName && fileName !== 'untitled' ? fileName.replace(/[-_]/g, ' ') : 'Untitled Document',
        createdAt: new Date(),
        modifiedAt: new Date(),
        savedAt: new Date(),
        isDirty: false,
        wordCount: markdownContent.getWordCount(),
        characterCount: markdownContent.getCharacterCount(),
      },
      filePath
    );
  }

  /**
   * 기존 데이터에서 문서 재구성
   */
  static reconstitute(
    id: string,
    content: string,
    metadata: DocumentMetadata,
    filePath?: string
  ): Document {
    return new Document(
      DocumentId.fromString(id),
      MarkdownContent.fromString(content),
      metadata,
      filePath ? FilePath.fromString(filePath) : undefined
    );
  }
}