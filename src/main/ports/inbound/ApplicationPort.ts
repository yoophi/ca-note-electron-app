/**
 * Application Port (Inbound)
 *
 * 애플리케이션 수준의 명령을 처리하는 인터페이스
 */

export interface ApplicationPort {
  /**
   * 애플리케이션 버전 조회
   */
  getVersion(): Promise<GetVersionResponse>;

  /**
   * 애플리케이션 상태 조회
   */
  getApplicationStatus(): Promise<ApplicationStatusResponse>;

  /**
   * 성능 메트릭 조회 (개발 모드)
   */
  getPerformanceMetrics(): Promise<PerformanceMetricsResponse>;

  /**
   * 로그 메시지 기록
   */
  logMessage(request: LogMessageRequest): Promise<void>;

  /**
   * 애플리케이션 종료
   */
  shutdown(): Promise<void>;
}

// Request DTOs
export interface LogMessageRequest {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: any;
  source?: string;
}

// Response DTOs
export interface GetVersionResponse {
  version: string;
  buildDate?: string;
  commit?: string;
}

export interface ApplicationStatusResponse {
  isReady: boolean;
  uptime: number;
  environment: 'development' | 'production';
  platform: string;
  architecture: string;
}

export interface PerformanceMetricsResponse {
  memory: {
    used: number;
    total: number;
    available: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
}