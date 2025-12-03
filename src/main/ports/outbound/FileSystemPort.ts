/**
 * File System Port (Outbound)
 *
 * 파일 시스템 작업을 위한 포트 인터페이스
 * 특정 파일 시스템 구현과 독립적
 */

import { FilePath } from '../../core/domain/value-objects/FilePath';

export interface FileSystemPort {
  /**
   * 파일 읽기
   */
  readFile(path: FilePath): Promise<ReadFileResult>;

  /**
   * 파일 쓰기
   */
  writeFile(path: FilePath, content: string): Promise<WriteFileResult>;

  /**
   * 파일 존재 여부 확인
   */
  fileExists(path: FilePath): Promise<boolean>;

  /**
   * 파일 메타데이터 조회
   */
  getFileMetadata(path: FilePath): Promise<FileMetadataResult>;

  /**
   * 디렉토리 생성 (재귀적)
   */
  ensureDirectory(path: FilePath): Promise<DirectoryResult>;

  /**
   * 고유한 파일명 생성
   */
  generateUniqueFileName(basePath: FilePath, fileName: string): Promise<string>;

  /**
   * 임시 디렉토리 경로 반환
   */
  getTempDirectory(): Promise<FilePath>;
}

export interface ReadFileResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface WriteFileResult {
  success: boolean;
  bytesWritten?: number;
  error?: string;
}

export interface FileMetadataResult {
  success: boolean;
  metadata?: FileMetadata;
  error?: string;
}

export interface FileMetadata {
  path: FilePath;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  permissions: FilePermissions;
}

export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export interface DirectoryResult {
  success: boolean;
  path?: FilePath;
  error?: string;
}