/**
 * Document Repository Adapter
 *
 * DocumentRepositoryPort의 파일시스템 기반 구현체
 */

import { join } from 'path';
import { Document } from '../../../core/domain/entities/Document';
import { DocumentId } from '../../../core/domain/value-objects/DocumentId';
import { FilePath } from '../../../core/domain/value-objects/FilePath';
import {
  DocumentRepositoryPort,
  SaveResult,
  LoadResult,
  BackupResult,
} from '../../../ports/outbound/DocumentRepositoryPort';
import { FileSystemPort } from '../../../ports/outbound/FileSystemPort';

export class DocumentRepositoryAdapter implements DocumentRepositoryPort {
  constructor(
    private readonly fileSystem: FileSystemPort
  ) {}

  /**
   * 문서를 파일 시스템에 저장
   */
  async save(document: Document, targetPath?: FilePath): Promise<SaveResult> {
    try {
      // 대상 경로 결정
      let filePath = targetPath || document.filePath;

      if (!filePath) {
        return {
          success: false,
          error: 'No file path specified for saving document',
        };
      }

      // 파일 확장자 확인 및 추가
      if (!filePath.value.endsWith('.md')) {
        filePath = FilePath.fromString(filePath.value + '.md');
      }

      // 문서 내용을 파일로 저장
      const writeResult = await this.fileSystem.writeFile(filePath, document.content.value);

      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error || 'Failed to write document to file',
        };
      }

      return {
        success: true,
        filePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving document',
      };
    }
  }

  /**
   * 파일에서 문서 로드
   */
  async load(filePath: FilePath): Promise<LoadResult> {
    try {
      // 파일 존재 여부 확인
      const fileExists = await this.fileSystem.fileExists(filePath);
      if (!fileExists) {
        return {
          success: false,
          error: `File does not exist: ${filePath.value}`,
        };
      }

      // 파일 내용 읽기
      const readResult = await this.fileSystem.readFile(filePath);
      if (!readResult.success || readResult.content === undefined) {
        return {
          success: false,
          error: readResult.error || 'Failed to read file content',
        };
      }

      // Document 엔티티 생성
      const document = Document.createFromFile(readResult.content, filePath);

      return {
        success: true,
        document,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading document',
      };
    }
  }

  /**
   * 문서가 존재하는지 확인
   */
  async exists(filePath: FilePath): Promise<boolean> {
    return await this.fileSystem.fileExists(filePath);
  }

  /**
   * 문서 백업 생성
   */
  async createBackup(document: Document): Promise<BackupResult> {
    try {
      if (!document.hasFilePath() || !document.filePath) {
        return {
          success: false,
          error: 'Document has no file path for backup',
        };
      }

      // 백업 파일명 생성
      const originalPath = document.filePath.value;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${document.filePath.getFileNameWithoutExtension()}.backup.${timestamp}.md`;

      // 백업 디렉토리 생성 (원본 파일과 같은 디렉토리에 .backups 폴더)
      const backupDir = join(originalPath, '..', '.backups');
      const backupDirPath = FilePath.fromString(backupDir);

      const ensureDirResult = await this.fileSystem.ensureDirectory(backupDirPath);
      if (!ensureDirResult.success) {
        return {
          success: false,
          error: ensureDirResult.error || 'Failed to create backup directory',
        };
      }

      // 백업 파일 경로
      const backupPath = FilePath.fromString(join(backupDir, backupFileName));

      // 백업 저장
      const saveResult = await this.save(document, backupPath);

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error || 'Failed to save backup',
        };
      }

      return {
        success: true,
        backupPath: saveResult.filePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating backup',
      };
    }
  }

  /**
   * 임시 문서 저장 (자동저장용)
   */
  async saveTemporary(document: Document): Promise<SaveResult> {
    try {
      // 임시 디렉토리 가져오기
      const tempDir = await this.fileSystem.getTempDirectory();

      // 임시 파일명 생성
      const tempFileName = `autosave-${document.id.value}.md`;
      const tempFilePath = FilePath.fromString(join(tempDir.value, tempFileName));

      // 임시 저장
      return await this.save(document, tempFilePath);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving temporary document',
      };
    }
  }

  /**
   * 임시 문서 복구
   */
  async recoverTemporary(documentId: DocumentId): Promise<LoadResult> {
    try {
      // 임시 디렉토리에서 파일 찾기
      const tempDir = await this.fileSystem.getTempDirectory();
      const tempFileName = `autosave-${documentId.value}.md`;
      const tempFilePath = FilePath.fromString(join(tempDir.value, tempFileName));

      // 임시 파일 존재 여부 확인
      const fileExists = await this.fileSystem.fileExists(tempFilePath);
      if (!fileExists) {
        return {
          success: false,
          error: 'No temporary file found for recovery',
        };
      }

      // 임시 파일 로드
      return await this.load(tempFilePath);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error recovering temporary document',
      };
    }
  }
}