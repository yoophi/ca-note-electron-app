/**
 * File Path Value Object
 *
 * 파일 경로를 나타내는 값 객체 - 보안 검증 포함
 */

import { resolve, extname, basename } from 'path';

export class FilePath {
  private readonly _value: string;

  constructor(value: string) {
    this.validateFilePath(value);
    this._value = resolve(value); // Normalize path
  }

  get value(): string {
    return this._value;
  }

  private validateFilePath(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    if (value.trim().length === 0) {
      throw new Error('File path cannot be empty or whitespace');
    }

    // 디렉토리 순회 공격 방지
    if (value.includes('..')) {
      throw new Error('File path contains directory traversal');
    }

    // 경로 길이 제한 (Windows 호환성)
    if (value.length > 260) {
      throw new Error('File path too long (max 260 characters)');
    }

    // 마크다운 파일 확장자 검증
    if (!value.toLowerCase().endsWith('.md')) {
      throw new Error('File path must point to a markdown file (.md extension)');
    }
  }

  getExtension(): string {
    return extname(this._value);
  }

  getFileName(): string {
    return basename(this._value);
  }

  getFileNameWithoutExtension(): string {
    return basename(this._value, this.getExtension());
  }

  isMarkdownFile(): boolean {
    return this.getExtension().toLowerCase() === '.md';
  }

  equals(other: FilePath): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static fromString(value: string): FilePath {
    return new FilePath(value);
  }
}