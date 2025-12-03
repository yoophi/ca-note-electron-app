/**
 * Dialog Port (Outbound)
 *
 * 사용자 다이얼로그를 위한 포트 인터페이스
 * 특정 UI 프레임워크와 독립적
 */

import { FilePath } from '../../core/domain/value-objects/FilePath';

export interface DialogPort {
  /**
   * 파일 열기 다이얼로그 표시
   */
  showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>;

  /**
   * 파일 저장 다이얼로그 표시
   */
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult>;

  /**
   * 확인 다이얼로그 표시
   */
  showConfirmDialog(options: ConfirmDialogOptions): Promise<ConfirmDialogResult>;

  /**
   * 정보 다이얼로그 표시
   */
  showInfoDialog(options: InfoDialogOptions): Promise<void>;

  /**
   * 오류 다이얼로그 표시
   */
  showErrorDialog(options: ErrorDialogOptions): Promise<void>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: FilePath;
  filters?: FileFilter[];
  multiSelect?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: FilePath;
  defaultName?: string;
  filters?: FileFilter[];
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'error' | 'question';
}

export interface InfoDialogOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error';
}

export interface ErrorDialogOptions {
  title: string;
  message: string;
  detail?: string;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogResult {
  success: boolean;
  cancelled: boolean;
  filePaths: FilePath[];
  error?: string;
}

export interface SaveDialogResult {
  success: boolean;
  cancelled: boolean;
  filePath?: FilePath;
  error?: string;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  cancelled: boolean;
}