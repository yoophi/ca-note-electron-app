/**
 * Document ID Value Object
 *
 * 고유한 문서 식별자를 나타내는 값 객체
 */

export class DocumentId {
  private readonly _value: string;

  constructor(value: string) {
    this.validateDocumentId(value);
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  private validateDocumentId(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Document ID must be a non-empty string');
    }

    if (value.trim().length === 0) {
      throw new Error('Document ID cannot be empty or whitespace');
    }

    // UUID 형식 검증 (간단한 형태)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(value)) {
      throw new Error('Document ID must be a valid UUID');
    }
  }

  equals(other: DocumentId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static generate(): DocumentId {
    return new DocumentId(crypto.randomUUID());
  }

  static fromString(value: string): DocumentId {
    return new DocumentId(value);
  }
}