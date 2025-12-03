/**
 * Electron Dialog Adapter
 *
 * DialogPort의 Electron 구현체
 */

import { dialog, BrowserWindow } from 'electron';
import { FilePath } from '../../../core/domain/value-objects/FilePath';
import {
  DialogPort,
  OpenDialogOptions,
  SaveDialogOptions,
  ConfirmDialogOptions,
  InfoDialogOptions,
  ErrorDialogOptions,
  OpenDialogResult,
  SaveDialogResult,
  ConfirmDialogResult,
} from '../../../ports/outbound/DialogPort';

export class ElectronDialogAdapter implements DialogPort {
  /**
   * 파일 열기 다이얼로그 표시
   */
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    try {
      const result = await dialog.showOpenDialog(this.getCurrentWindow(), {
        title: options.title || 'Open File',
        defaultPath: options.defaultPath?.value,
        filters: options.filters || [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: options.multiSelect ? ['openFile', 'multiSelections'] : ['openFile'],
      });

      if (result.canceled) {
        return {
          success: true,
          cancelled: true,
          filePaths: [],
        };
      }

      return {
        success: true,
        cancelled: false,
        filePaths: result.filePaths.map(path => FilePath.fromString(path)),
      };

    } catch (error) {
      return {
        success: false,
        cancelled: false,
        filePaths: [],
        error: error instanceof Error ? error.message : 'Unknown error showing open dialog',
      };
    }
  }

  /**
   * 파일 저장 다이얼로그 표시
   */
  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    try {
      const defaultPath = options.defaultPath?.value || '';
      const defaultName = options.defaultName || 'untitled.md';

      const result = await dialog.showSaveDialog(this.getCurrentWindow(), {
        title: options.title || 'Save File',
        defaultPath: defaultPath ? `${defaultPath}/${defaultName}` : defaultName,
        filters: options.filters || [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return {
          success: true,
          cancelled: true,
        };
      }

      return {
        success: true,
        cancelled: false,
        filePath: FilePath.fromString(result.filePath),
      };

    } catch (error) {
      return {
        success: false,
        cancelled: false,
        error: error instanceof Error ? error.message : 'Unknown error showing save dialog',
      };
    }
  }

  /**
   * 확인 다이얼로그 표시
   */
  async showConfirmDialog(options: ConfirmDialogOptions): Promise<ConfirmDialogResult> {
    try {
      const result = await dialog.showMessageBox(this.getCurrentWindow(), {
        type: this.mapDialogType(options.type),
        title: options.title,
        message: options.message,
        buttons: [
          options.confirmLabel || 'OK',
          options.cancelLabel || 'Cancel',
        ],
        defaultId: 0,
        cancelId: 1,
      });

      return {
        confirmed: result.response === 0,
        cancelled: result.response === 1,
      };

    } catch (error) {
      console.error('Failed to show confirm dialog:', error);
      return {
        confirmed: false,
        cancelled: true,
      };
    }
  }

  /**
   * 정보 다이얼로그 표시
   */
  async showInfoDialog(options: InfoDialogOptions): Promise<void> {
    try {
      await dialog.showMessageBox(this.getCurrentWindow(), {
        type: this.mapDialogType(options.type),
        title: options.title,
        message: options.message,
        buttons: ['OK'],
      });
    } catch (error) {
      console.error('Failed to show info dialog:', error);
    }
  }

  /**
   * 오류 다이얼로그 표시
   */
  async showErrorDialog(options: ErrorDialogOptions): Promise<void> {
    try {
      await dialog.showErrorBox(options.title, options.message + (options.detail ? `\n\n${options.detail}` : ''));
    } catch (error) {
      console.error('Failed to show error dialog:', error);
    }
  }

  /**
   * 현재 포커스된 윈도우 반환
   */
  private getCurrentWindow(): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  }

  /**
   * 다이얼로그 타입 맵핑
   */
  private mapDialogType(type?: 'info' | 'warning' | 'error' | 'question'): 'none' | 'info' | 'error' | 'question' | 'warning' {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'question':
        return 'question';
      default:
        return 'info';
    }
  }
}