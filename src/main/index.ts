/**
 * Hexagonal Architecture Main Entry Point
 *
 * Clean한 애플리케이션 부트스트래핑과 의존성 주입 설정
 */

import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';

import { Container } from './infrastructure/container/Container';

// Global application container
let applicationContainer: Container;

/**
 * 메인 윈도우 생성
 */
function createWindow(): void {
  console.log('[Main Hexagonal] Creating main window...');

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    console.log('[Main Hexagonal] Main window displayed');
  });

  // 윈도우 종료 버튼 클릭 처리
  mainWindow.on('close', (event) => {
    console.log('[Main Hexagonal] Main window close requested');

    // 이미 종료 처리 중이면 그대로 진행
    if (isShuttingDown) {
      console.log('[Main Hexagonal] Already shutting down, allowing window close');
      return;
    }

    // 종료 처리 시작
    event.preventDefault();
    console.log('[Main Hexagonal] Starting shutdown process from window close');

    // 앱 종료 요청 (before-quit 이벤트 트리거)
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 개발/프로덕션 환경에 따른 로딩
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    console.log('[Main Hexagonal] Loaded development URL');
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    console.log('[Main Hexagonal] Loaded production HTML');
  }
}

/**
 * 애플리케이션 초기화
 */
async function initializeApplication(): Promise<void> {
  console.log('[Main Hexagonal] Initializing application...');

  try {
    // Dependency Injection Container 초기화
    applicationContainer = Container.getInstance();
    applicationContainer.initialize();

    console.log('[Main Hexagonal] Application initialized successfully');

  } catch (error) {
    console.error('[Main Hexagonal] Failed to initialize application:', error);
    throw error;
  }
}

/**
 * 애플리케이션 종료 처리
 */
async function shutdownApplication(): Promise<void> {
  console.log('[Main Hexagonal] Shutting down application...');

  try {
    if (applicationContainer) {
      applicationContainer.shutdown();
    }
    console.log('[Main Hexagonal] Application shutdown complete');

  } catch (error) {
    console.error('[Main Hexagonal] Error during application shutdown:', error);
  }
}

/**
 * Electron 애플리케이션 준비 완료
 */
app.whenReady().then(async () => {
  console.log('[Main Hexagonal] Electron app ready');

  // 앱 사용자 모델 ID 설정 (Windows)
  electronApp.setAppUserModelId('com.electron.markdown-editor');

  // 개발 도구 단축키 설정
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  try {
    // 애플리케이션 초기화
    await initializeApplication();

    // 메인 윈도우 생성
    createWindow();

    console.log('[Main Hexagonal] Application startup complete');

  } catch (error) {
    console.error('[Main Hexagonal] Application startup failed:', error);
    app.quit();
  }

  // macOS: Dock 아이콘 클릭 시 윈도우 재생성
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 모든 윈도우가 닫혔을 때
 */
app.on('window-all-closed', async () => {
  console.log('[Main Hexagonal] All windows closed');

  // macOS가 아닌 경우 애플리케이션 종료
  if (process.platform !== 'darwin') {
    await shutdownApplication();
    app.quit();
  }
});

// 종료 처리 상태 추적
let isShuttingDown = false;

/**
 * 애플리케이션 종료 전 처리
 */
app.on('before-quit', async (event) => {
  console.log('[Main Hexagonal] Application will quit');

  // 이미 종료 처리 중이면 기본 동작 허용
  if (isShuttingDown) {
    console.log('[Main Hexagonal] Already shutting down, allowing default quit');
    return;
  }

  // 첫 번째 종료 시도시에만 정리 작업 수행
  event.preventDefault();
  isShuttingDown = true;

  try {
    await shutdownApplication();
    console.log('[Main Hexagonal] Shutdown complete');
  } catch (error) {
    console.error('[Main Hexagonal] Error during shutdown:', error);
  }

  // 모든 정리 작업 완료 후 프로세스 종료
  console.log('[Main Hexagonal] Exiting process');
  process.exit(0);
});

/**
 * 처리되지 않은 예외 처리
 */
process.on('uncaughtException', (error) => {
  console.error('[Main Hexagonal] Uncaught exception:', error);

  // 개발 모드에서는 스택 트레이스 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', error.stack);
  }

  // 애플리케이션 종료
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main Hexagonal] Unhandled promise rejection at:', promise, 'reason:', reason);

  // 개발 모드에서만 프로세스 종료
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

console.log('[Main Hexagonal] Main process script loaded');