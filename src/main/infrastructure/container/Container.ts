/**
 * Dependency Injection Container
 *
 * Hexagonal Architecture의 모든 의존성을 관리하는 컨테이너
 */

// Core Use Cases
import { CreateDocumentUseCase } from '../../core/use-cases/CreateDocumentUseCase';
import { SaveDocumentUseCase } from '../../core/use-cases/SaveDocumentUseCase';
import { LoadDocumentUseCase } from '../../core/use-cases/LoadDocumentUseCase';

// Ports
import { DocumentCommandPort } from '../../ports/inbound/DocumentCommandPort';
import { ApplicationPort } from '../../ports/inbound/ApplicationPort';
import { DocumentRepositoryPort } from '../../ports/outbound/DocumentRepositoryPort';
import { FileSystemPort } from '../../ports/outbound/FileSystemPort';
import { DialogPort } from '../../ports/outbound/DialogPort';

// Secondary Adapters
import { ElectronFileSystemAdapter } from '../../adapters/secondary/filesystem/ElectronFileSystemAdapter';
import { DocumentRepositoryAdapter } from '../../adapters/secondary/filesystem/DocumentRepositoryAdapter';
import { ElectronDialogAdapter } from '../../adapters/secondary/dialog/ElectronDialogAdapter';

// Primary Adapters
import { DocumentIpcHandler } from '../../adapters/primary/ipc/DocumentIpcHandler';

// Application Services
import { DocumentCommandService } from '../services/DocumentCommandService';
import { ApplicationService } from '../services/ApplicationService';

/**
 * Main application container
 */
export class Container {
  private static instance: Container;

  // Secondary Adapters (Infrastructure)
  private readonly fileSystemAdapter: FileSystemPort;
  private readonly documentRepositoryAdapter: DocumentRepositoryPort;
  private readonly dialogAdapter: DialogPort;

  // Use Cases
  private readonly createDocumentUseCase: CreateDocumentUseCase;
  private readonly saveDocumentUseCase: SaveDocumentUseCase;
  private readonly loadDocumentUseCase: LoadDocumentUseCase;

  // Application Services
  private readonly documentCommandService: DocumentCommandPort;
  private readonly applicationService: ApplicationPort;

  // Primary Adapters
  private readonly documentIpcHandler: DocumentIpcHandler;

  private constructor() {
    console.log('[Container] Initializing dependency injection container...');

    // Secondary Adapters 초기화
    this.fileSystemAdapter = new ElectronFileSystemAdapter();
    this.documentRepositoryAdapter = new DocumentRepositoryAdapter(this.fileSystemAdapter);
    this.dialogAdapter = new ElectronDialogAdapter();

    // Use Cases 초기화
    this.createDocumentUseCase = new CreateDocumentUseCase();
    this.saveDocumentUseCase = new SaveDocumentUseCase(
      this.documentRepositoryAdapter,
      this.dialogAdapter
    );
    this.loadDocumentUseCase = new LoadDocumentUseCase(
      this.documentRepositoryAdapter,
      this.dialogAdapter
    );

    // Application Services 초기화
    this.documentCommandService = new DocumentCommandService(
      this.createDocumentUseCase,
      this.saveDocumentUseCase,
      this.loadDocumentUseCase
    );
    this.applicationService = new ApplicationService();

    // Primary Adapters 초기화
    this.documentIpcHandler = new DocumentIpcHandler(this.documentCommandService);

    console.log('[Container] Dependency injection container initialized successfully');
  }

  /**
   * 컨테이너 싱글톤 인스턴스 반환
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * 애플리케이션 시작 - 모든 어댑터 등록
   */
  initialize(): void {
    console.log('[Container] Initializing application components...');

    // IPC 핸들러 등록
    this.documentIpcHandler.registerHandlers();

    console.log('[Container] Application components initialized successfully');
  }

  /**
   * 애플리케이션 종료 - 모든 리소스 정리
   */
  shutdown(): void {
    console.log('[Container] Shutting down application components...');

    // IPC 핸들러 해제
    this.documentIpcHandler.unregisterHandlers();

    console.log('[Container] Application components shut down successfully');
  }

  // Getters for dependency access (if needed for testing or special cases)

  getDocumentCommandService(): DocumentCommandPort {
    return this.documentCommandService;
  }

  getApplicationService(): ApplicationPort {
    return this.applicationService;
  }

  getFileSystemAdapter(): FileSystemPort {
    return this.fileSystemAdapter;
  }

  getDocumentRepositoryAdapter(): DocumentRepositoryPort {
    return this.documentRepositoryAdapter;
  }

  getDialogAdapter(): DialogPort {
    return this.dialogAdapter;
  }
}