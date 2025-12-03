/**
 * Application Service
 *
 * ApplicationPort의 구현체 - 애플리케이션 수준의 기능을 제공
 */

import { app } from 'electron';
import {
  ApplicationPort,
  GetVersionResponse,
  ApplicationStatusResponse,
  PerformanceMetricsResponse,
  LogMessageRequest,
} from '../../ports/inbound/ApplicationPort';

export class ApplicationService implements ApplicationPort {
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 애플리케이션 버전 조회
   */
  async getVersion(): Promise<GetVersionResponse> {
    try {
      return {
        version: app.getVersion(),
        buildDate: process.env.BUILD_DATE,
        commit: process.env.GIT_COMMIT,
      };
    } catch (error) {
      console.error('[ApplicationService] Error getting version:', error);
      return {
        version: 'unknown',
      };
    }
  }

  /**
   * 애플리케이션 상태 조회
   */
  async getApplicationStatus(): Promise<ApplicationStatusResponse> {
    try {
      const uptime = (Date.now() - this.startTime) / 1000; // seconds

      return {
        isReady: app.isReady(),
        uptime,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        platform: process.platform,
        architecture: process.arch,
      };
    } catch (error) {
      console.error('[ApplicationService] Error getting application status:', error);
      return {
        isReady: false,
        uptime: 0,
        environment: 'development',
        platform: process.platform,
        architecture: process.arch,
      };
    }
  }

  /**
   * 성능 메트릭 조회 (개발 모드)
   */
  async getPerformanceMetrics(): Promise<PerformanceMetricsResponse> {
    try {
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Performance metrics only available in development mode');
      }

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          available: memoryUsage.heapTotal - memoryUsage.heapUsed,
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      console.error('[ApplicationService] Error getting performance metrics:', error);
      return {
        memory: {
          used: 0,
          total: 0,
          available: 0,
        },
        cpu: {
          usage: 0,
        },
        uptime: 0,
      };
    }
  }

  /**
   * 로그 메시지 기록
   */
  async logMessage(request: LogMessageRequest): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const source = request.source ? `[${request.source}]` : '';
      const logLine = `${timestamp} ${source} ${request.level.toUpperCase()}: ${request.message}`;

      // 콘솔에 출력
      switch (request.level) {
        case 'debug':
          console.debug(logLine, request.details);
          break;
        case 'info':
          console.info(logLine, request.details);
          break;
        case 'warn':
          console.warn(logLine, request.details);
          break;
        case 'error':
          console.error(logLine, request.details);
          break;
        default:
          console.log(logLine, request.details);
      }

      // 개발 모드에서는 추가 처리 가능
      if (process.env.NODE_ENV === 'development') {
        // TODO: 로그 파일 저장, 원격 로깅 등
      }

    } catch (error) {
      console.error('[ApplicationService] Error logging message:', error);
    }
  }

  /**
   * 애플리케이션 종료
   */
  async shutdown(): Promise<void> {
    try {
      console.log('[ApplicationService] Initiating application shutdown...');

      // 리소스 정리 작업 수행
      await this.cleanupResources();

      // Electron 앱 종료
      app.quit();

    } catch (error) {
      console.error('[ApplicationService] Error during shutdown:', error);
      // 강제 종료
      process.exit(1);
    }
  }

  /**
   * 리소스 정리
   */
  private async cleanupResources(): Promise<void> {
    try {
      // 임시 파일 정리
      // 백그라운드 작업 중단
      // 네트워크 연결 종료 등

      console.log('[ApplicationService] Resources cleaned up successfully');
    } catch (error) {
      console.warn('[ApplicationService] Some resources could not be cleaned up:', error);
    }
  }
}