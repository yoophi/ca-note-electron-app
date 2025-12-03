# Main Process Hexagonal Architecture Design

## 목표 구조

```
src/main/
├── core/                    # 핵심 비즈니스 로직 (Framework-agnostic)
│   ├── domain/             # 도메인 모델과 비즈니스 규칙
│   │   ├── entities/       # Document, FileReference 등
│   │   ├── services/       # DocumentService, ValidationService 등
│   │   └── value-objects/  # FilePath, DocumentId 등
│   └── use-cases/          # 애플리케이션 서비스 (유스케이스)
│       ├── CreateDocumentUseCase.ts
│       ├── SaveDocumentUseCase.ts
│       ├── LoadDocumentUseCase.ts
│       └── GetFileMetadataUseCase.ts
├── ports/                  # 인터페이스 정의 (계약)
│   ├── inbound/           # 앱으로 들어오는 요청 인터페이스
│   │   ├── DocumentCommandPort.ts
│   │   ├── FileOperationPort.ts
│   │   └── ApplicationPort.ts
│   └── outbound/          # 앱에서 나가는 요청 인터페이스
│       ├── DocumentRepositoryPort.ts
│       ├── FileSystemPort.ts
│       └── DialogPort.ts
├── adapters/              # 어댑터 구현
│   ├── primary/           # 외부에서 앱으로의 요청을 처리
│   │   ├── ipc/          # IPC 핸들러들
│   │   │   ├── DocumentIpcHandler.ts
│   │   │   ├── FileIpcHandler.ts
│   │   │   └── AppIpcHandler.ts
│   │   └── index.ts      # 모든 IPC 핸들러 등록
│   └── secondary/         # 앱에서 외부로의 요청을 처리
│       ├── filesystem/   # 파일시스템 어댑터
│       │   ├── ElectronFileSystemAdapter.ts
│       │   └── DocumentRepositoryAdapter.ts
│       ├── dialog/       # 다이얼로그 어댑터
│       │   └── ElectronDialogAdapter.ts
│       └── index.ts      # 모든 어댑터 등록
├── infrastructure/        # 인프라 설정과 의존성 주입
│   ├── container/        # DI 컨테이너
│   └── config/           # 설정 관리
└── index.ts              # 애플리케이션 부트스트래핑만 담당
```

## 핵심 원칙

### 1. Core Domain (중심부)
- **순수 비즈니스 로직**: 외부 프레임워크나 라이브러리에 의존하지 않음
- **도메인 모델**: Document, FileReference 등의 핵심 엔티티
- **유스케이스**: 비즈니스 요구사항을 구현하는 애플리케이션 서비스

### 2. Ports (포트)
- **Inbound Ports**: 외부에서 앱으로 들어오는 요청의 인터페이스
- **Outbound Ports**: 앱에서 외부로 나가는 요청의 인터페이스
- **의존성 역전**: Core는 Ports에만 의존, 구체적 구현은 모름

### 3. Adapters (어댑터)
- **Primary Adapters**: IPC 핸들러, API 엔드포인트 등
- **Secondary Adapters**: 데이터베이스, 파일시스템, 외부 API 등
- **구현 세부사항**: 특정 기술에 종속적인 코드

## 의존성 방향

```
Primary Adapters -> Inbound Ports -> Use Cases -> Outbound Ports <- Secondary Adapters
                                  ↑
                               Domain Models
```

- **내향 의존성**: 모든 의존성이 Core 방향으로 흐름
- **의존성 역전**: Core는 인터페이스에만 의존, 구현체는 모름
- **테스트 용이성**: 모든 외부 종속성을 Mock으로 대체 가능

## 구현 순서

1. **Core Domain**: 비즈니스 엔티티와 서비스 정의
2. **Ports**: 인바운드/아웃바운드 인터페이스 정의
3. **Use Cases**: 비즈니스 로직 구현
4. **Secondary Adapters**: 외부 시스템과의 연동 구현
5. **Primary Adapters**: IPC 핸들러 구현
6. **Infrastructure**: 의존성 주입과 설정
7. **Migration**: 기존 코드를 새 구조로 이전

## 기대 효과

- **테스트 용이성**: 각 레이어를 독립적으로 테스트 가능
- **유지보수성**: 관심사의 분리로 변경 영향 범위 최소화
- **확장성**: 새로운 어댑터 추가가 용이
- **재사용성**: Core 로직을 다른 환경에서도 사용 가능