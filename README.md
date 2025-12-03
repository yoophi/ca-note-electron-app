# CA Note Electron App

**Clean Architecture**와 **Hexagonal Architecture** 원칙으로 구축된 현대적인 마크다운 에디터 데스크탑 애플리케이션입니다.

![Electron](https://img.shields.io/badge/Electron-38+-9FEAF9.svg?style=flat-square&logo=Electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=React&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6.svg?style=flat-square&logo=TypeScript&logoColor=white)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-orange.svg?style=flat-square)

## ✨ 주요 기능

- 🖊️ **실시간 마크다운 에디터** - CodeMirror 6을 통한 구문 강조와 실시간 편집
- 👁️ **실시간 미리보기** - react-markdown을 사용한 즉시 마크다운 미리보기
- 💾 **파일 작업** - 마크다운 파일 열기, 저장, 생성
- 🏗️ **Clean Architecture** - 렌더러 프로세스는 Clean Architecture 원칙을 따름
- 🔷 **Hexagonal Architecture** - 메인 프로세스는 Hexagonal (Ports & Adapters) 패턴을 구현
- 🎯 **타입 안전성** - strict 모드가 활성화된 완전한 TypeScript 커버리지
- 🖥️ **크로스 플랫폼** - Windows, macOS, Linux 지원

## 🏛️ 아키텍처

### Renderer Process (Clean Architecture)
```
src/renderer/
├── adapters/          # Interface adapters (React components)
├── application/       # Application services & use cases
├── domain/           # Core business logic & entities
└── infrastructure/   # External concerns (file system, etc.)
```

### Main Process (Hexagonal Architecture)
```
src/main/
├── core/
│   ├── domain/       # Domain entities & value objects
│   └── services/     # Domain services
├── ports/
│   ├── inbound/      # Application interfaces
│   └── outbound/     # Infrastructure interfaces
├── adapters/
│   ├── primary/      # IPC handlers (entry points)
│   └── secondary/    # File system, dialogs (infrastructure)
├── application/      # Use cases & application services
└── infrastructure/   # DI container & configuration
```

## 🚀 시작하기

### 전제 조건

- Node.js 18+
- npm 9+

### 설치

```bash
# 저장소 클론
git clone https://github.com/yoophi/ca-note-electron-app.git
cd ca-note-electron-app

# 의존성 설치
npm install
```

### 개발

```bash
# 핫 리로드가 포함된 개발 서버 시작
npm run dev
```

### 빌드

```bash
# 현재 플랫폼용 빌드
npm run build

# 플랫폼별 빌드
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### 테스트 및 린팅

```bash
# 테스트와 린팅 실행
npm test && npm run lint
```

## 🛠️ 기술 스택

### 핵심 기술
- **Electron 38+** - 크로스 플랫폼 데스크탑 앱 프레임워크
- **React 19** - 현대적인 동시성 기능을 가진 UI 라이브러리
- **TypeScript 5.9+** - strict 모드가 적용된 타입 안전 JavaScript
- **CodeMirror 6** - 구문 강조 기능을 가진 고급 코드 에디터
- **react-markdown** - 마크다운 렌더링 컴포넌트

### 아키텍처 및 패턴
- **Clean Architecture** - 의존성 역전을 통한 관심사 분리
- **Hexagonal Architecture** - 메인 프로세스를 위한 Ports & Adapters 패턴
- **Dependency Injection** - 느슨한 결합을 위한 커스텀 DI 컨테이너
- **CQRS** - 명령과 쿼리 책임 분리

### 개발 도구
- **Vite** - 빠른 빌드 도구 및 개발 서버
- **ESLint** - 코드 린팅 및 스타일 검사
- **Prettier** - 코드 포맷팅

## 📖 개발 가이드라인

### 아키텍처 원칙

1. **의존성 규칙** - 의존성은 비즈니스 로직을 향해 안쪽으로 향함
2. **인터페이스 분리** - 작고 집중된 인터페이스(포트) 사용
3. **단일 책임** - 각 컴포넌트는 변경되는 이유가 하나뿐
4. **개방/폐쇄 원칙** - 확장에는 열려있고 수정에는 닫혀있음

### 코드 구성

- **도메인 레이어** - 외부 의존성이 없는 순수한 비즈니스 로직
- **애플리케이션 레이어** - 도메인 객체를 조율하는 유스케이스
- **인프라스트럭처 레이어** - 파일 I/O, 대화상자 등의 외부 관심사
- **프레젠테이션 레이어** - React 컴포넌트와 UI 로직

### 주요 설계 결정사항

- **프로세스 분리** - 메인과 렌더러에 서로 다른 아키텍처 패턴 적용
- **타입 안전성** - strict TypeScript 설정으로 런타임 오류 방지
- **이벤트 기반** - IPC와 내부 이벤트 패턴을 통한 느슨한 결합
- **테스트 용이성** - 의존성 주입을 통한 쉬운 단위 테스트

## 📁 프로젝트 구조

```
ca-note-electron-app/
├── src/
│   ├── main/              # Main process (Hexagonal Architecture)
│   │   ├── core/          # Domain layer
│   │   ├── ports/         # Application interfaces
│   │   ├── adapters/      # Infrastructure implementations
│   │   ├── application/   # Use cases
│   │   └── infrastructure/# DI container & setup
│   ├── renderer/          # Renderer process (Clean Architecture)
│   │   ├── adapters/      # React components & UI
│   │   ├── application/   # Application services
│   │   ├── domain/        # Business entities & rules
│   │   └── infrastructure/# External services
│   └── preload/          # Preload scripts for secure IPC
├── resources/            # Application assets
├── docs/                # Documentation
└── tests/               # Test files
```

## 🤝 기여하기

1. 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 아키텍처 가이드라인을 따르고 테스트 커버리지를 유지합니다
4. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
5. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
6. Pull Request를 생성합니다

## 📄 라이센스

이 프로젝트는 MIT 라이센스로 제공됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🔗 관련 문서

- [Clean Architecture 원칙](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Electron 공식 문서](https://www.electronjs.org/docs)
- [CodeMirror 6 가이드](https://codemirror.net/docs/)
