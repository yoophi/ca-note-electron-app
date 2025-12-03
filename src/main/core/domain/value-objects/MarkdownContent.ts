/**
 * Markdown Content Value Object
 *
 * 마크다운 콘텐츠를 나타내는 값 객체
 */

export class MarkdownContent {
  private readonly _value: string;

  constructor(value: string) {
    this.validateContent(value);
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  private validateContent(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('Markdown content must be a string');
    }

    // 최대 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes (assuming 2 bytes per char average)
    if (value.length * 2 > maxSize) {
      throw new Error('Markdown content too large (max 5MB)');
    }
  }

  isEmpty(): boolean {
    return this._value.trim().length === 0;
  }

  getWordCount(): number {
    if (this.isEmpty()) {
      return 0;
    }

    return this._value
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  getCharacterCount(): number {
    return this._value.replace(/\s/g, '').length;
  }

  getLineCount(): number {
    if (this.isEmpty()) {
      return 0;
    }

    return this._value.split('\n').length;
  }

  getPreview(maxLength: number = 100): string {
    if (this._value.length <= maxLength) {
      return this._value;
    }

    return this._value.substring(0, maxLength).trim() + '...';
  }

  equals(other: MarkdownContent): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static fromString(value: string): MarkdownContent {
    return new MarkdownContent(value);
  }

  static empty(): MarkdownContent {
    return new MarkdownContent('');
  }
}