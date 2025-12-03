/**
 * Electron File System Adapter
 *
 * FileSystemPort의 Electron 구현체
 */

import { promises as fs } from 'fs';
import { resolve, dirname, extname, basename, join } from 'path';
import { tmpdir } from 'os';
import { FilePath } from '../../../core/domain/value-objects/FilePath';
import {
  FileSystemPort,
  ReadFileResult,
  WriteFileResult,
  FileMetadataResult,
  FileMetadata,
  DirectoryResult,
} from '../../../ports/outbound/FileSystemPort';

export class ElectronFileSystemAdapter implements FileSystemPort {
  /**
   * 파일 읽기
   */
  async readFile(path: FilePath): Promise<ReadFileResult> {
    try {
      const content = await fs.readFile(path.value, 'utf8');

      return {
        success: true,
        content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.formatError('read', path.value, error),
      };
    }
  }

  /**
   * 파일 쓰기
   */
  async writeFile(path: FilePath, content: string): Promise<WriteFileResult> {
    try {
      // 디렉토리가 존재하는지 확인하고 없으면 생성
      const directory = dirname(path.value);
      await this.ensureDirectoryExists(directory);

      // 파일 쓰기
      await fs.writeFile(path.value, content, 'utf8');

      // 쓰여진 바이트 수 계산 (대략적)
      const bytesWritten = Buffer.byteLength(content, 'utf8');

      return {
        success: true,
        bytesWritten,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.formatError('write', path.value, error),
      };
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(path: FilePath): Promise<boolean> {
    try {
      await fs.access(path.value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 파일 메타데이터 조회
   */
  async getFileMetadata(path: FilePath): Promise<FileMetadataResult> {
    try {
      const stats = await fs.stat(path.value);
      const permissions = await this.checkPermissions(path.value);

      const metadata: FileMetadata = {
        path,
        size: stats.size,
        lastModified: stats.mtime,
        isDirectory: stats.isDirectory(),
        permissions,
      };

      return {
        success: true,
        metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.formatError('stat', path.value, error),
      };
    }
  }

  /**
   * 디렉토리 생성 (재귀적)
   */
  async ensureDirectory(path: FilePath): Promise<DirectoryResult> {
    try {
      await this.ensureDirectoryExists(path.value);

      return {
        success: true,
        path,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.formatError('mkdir', path.value, error),
      };
    }
  }

  /**
   * 고유한 파일명 생성
   */
  async generateUniqueFileName(basePath: FilePath, fileName: string): Promise<string> {
    const extension = extname(fileName);
    const nameWithoutExt = basename(fileName, extension);
    let counter = 1;
    let uniqueName = fileName;

    while (await this.fileExists(FilePath.fromString(join(basePath.value, uniqueName)))) {
      uniqueName = `${nameWithoutExt}-${counter}${extension}`;
      counter++;

      // 무한 루프 방지
      if (counter > 1000) {
        uniqueName = `${nameWithoutExt}-${Date.now()}${extension}`;
        break;
      }
    }

    return uniqueName;
  }

  /**
   * 임시 디렉토리 경로 반환
   */
  async getTempDirectory(): Promise<FilePath> {
    const tempDir = tmpdir();
    const appTempDir = join(tempDir, 'markdown-editor');

    // 앱 임시 디렉토리 생성
    await this.ensureDirectoryExists(appTempDir);

    return FilePath.fromString(appTempDir);
  }

  /**
   * 파일 권한 확인
   */
  private async checkPermissions(filePath: string): Promise<{ readable: boolean; writable: boolean; executable: boolean }> {
    try {
      const checks = await Promise.allSettled([
        fs.access(filePath, fs.constants.R_OK),
        fs.access(filePath, fs.constants.W_OK),
        fs.access(filePath, fs.constants.X_OK),
      ]);

      return {
        readable: checks[0].status === 'fulfilled',
        writable: checks[1].status === 'fulfilled',
        executable: checks[2].status === 'fulfilled',
      };
    } catch {
      return { readable: false, writable: false, executable: false };
    }
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 에러 메시지 포맷팅
   */
  private formatError(operation: string, path: string, error: any): string {
    const message = error?.message || 'Unknown error';

    switch (error?.code) {
      case 'ENOENT':
        return `File not found: ${path}`;
      case 'EACCES':
        return `Permission denied: ${path}`;
      case 'EISDIR':
        return `Path is a directory: ${path}`;
      case 'ENOTDIR':
        return `Path is not a directory: ${path}`;
      case 'ENOSPC':
        return 'No space left on device';
      case 'EMFILE':
        return 'Too many open files';
      case 'ENAMETOOLONG':
        return `File name too long: ${path}`;
      default:
        return `Failed to ${operation} file: ${message}`;
    }
  }
}