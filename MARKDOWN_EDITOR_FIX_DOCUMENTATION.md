# 마크다운 에디터 프리뷰 동기화 문제 해결 문서

## 문제 설명

Electron 애플리케이션의 마크다운 에디터에서 에디터에 입력한 텍스트가 프리뷰 창에 반영되지 않는 심각한 문제가 있었습니다. 사용자가 에디터에 텍스트를 입력해도 프리뷰는 정적인 상태로 남아있었고 새로운 내용으로 업데이트되지 않았습니다.

## 조사 과정

### 초기 디버깅 접근법

1. **포괄적인 로깅 추가**를 통해 컴포넌트 계층 전반의 데이터 흐름을 추적:
   - 에디터 래퍼 컴포넌트 (`src/renderer/src/components/MarkdownEditor.tsx`)
   - 클린 아키텍처 에디터 컴포넌트 (`src/renderer/adapters/components/MarkdownEditor.tsx`)
   - 앱 컴포넌트 (`src/renderer/src/App.tsx`)
   - 프리뷰 컴포넌트 (`src/renderer/src/components/PreviewPane.tsx`)

2. **관찰된 증상들**:
   - 에디터 내용 변경이 `onContentChange` 콜백을 트리거하지 않음
   - 콘솔 로그에서 에디터가 지속적으로 재생성되는 것을 확인
   - 프리뷰 창이 업데이트된 내용을 받지 못함

### 근본 원인 분석

체계적인 디버깅을 통해 **서로 연관된 3가지 문제**를 식별했습니다:

#### 문제 1: 불안정한 Config 객체 재생성
**위치**: `src/renderer/src/components/MarkdownEditor.tsx:46-52`

**문제점**: `editorConfig` 객체가 매 렌더링마다 재생성됨:
```typescript
// 이전 (문제가 있던 코드)
const editorConfig = {
  lineNumbers: true,
  lineWrapping: true,
  enableSearch: true,
  enableAutocompletion: true,
  highlightActiveLine: !readOnly,
};
```

**영향**: 이로 인해 하위 CodeMirror 에디터가 지속적으로 파괴되고 재생성됨.

#### 문제 2: 불안정한 useEffect 의존성
**위치**: `src/renderer/adapters/components/MarkdownEditor.tsx:143`

**문제점**: useEffect가 무한 재초기화를 트리거하는 동적 의존성을 가짐:
```typescript
// 이전 (문제가 있던 코드)
useEffect(() => {
  // 에디터 초기화 코드
}, [editorConfig.readOnly, editorConfig.placeholder, /* 기타 동적 값들 */]);
```

**영향**: 에디터가 매 렌더링마다 파괴되고 재생성되어 이벤트 리스너를 잃음.

#### 문제 3: 동적 설정 업데이트가 이벤트 리스너 덮어쓰기
**위치**: `src/renderer/adapters/components/MarkdownEditor.tsx:180-185`

**문제점**: 동적 설정 업데이트가 문서 업데이트 리스너를 덮어씀:
```typescript
// 이전 (문제가 있던 코드)
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  updateEditorConfig(view, dynamicConfig); // 이것이 updateListener를 덮어씀
}, [readOnly, enableVim, placeholder]);
```

**영향**: 문서 변경 리스너가 제거되어 내용 변경이 감지되지 않음.

## 해결 방법 구현

### 수정 1: useMemo로 Config 객체 안정화
**파일**: `src/renderer/src/components/MarkdownEditor.tsx`

```typescript
// 수정 후 (해결된 코드)
const editorConfig = useMemo(() => ({
  lineNumbers: true,
  lineWrapping: true,
  enableSearch: true,
  enableAutocompletion: true,
  highlightActiveLine: !readOnly,
}), [readOnly]);
```

**효과**: Config 객체가 이제 `readOnly`가 변경될 때만 변경되어 불필요한 리렌더링을 방지.

### 수정 2: 일회성 초기화를 위한 빈 의존성 배열 사용
**파일**: `src/renderer/adapters/components/MarkdownEditor.tsx`

```typescript
// 수정 후 (해결된 코드)
useEffect(() => {
  // 모든 이벤트 리스너를 포함한 에디터 초기화 코드
  // 컴포넌트 마운트시 한 번만 실행됨
}, []); // 일회성 초기화를 위한 빈 의존성 배열
```

**효과**: 에디터가 한 번만 생성되고 유지되어 모든 이벤트 리스너가 보존됨.

### 수정 3: 문제가 되는 동적 설정 업데이트 비활성화
**파일**: `src/renderer/adapters/components/MarkdownEditor.tsx`

```typescript
// 임시 비활성화: 동적으로 에디터 설정 업데이트
// 이것이 updateListener를 덮어쓰고 있었음 - 적절히 수정 필요
/*
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  updateEditorConfig(view, dynamicConfig);
}, [readOnly, enableVim, placeholder]);
*/
```

**효과**: 문서 업데이트 리스너가 덮어써지는 것을 방지.

## 기술적 세부사항

### CodeMirror 통합 아키텍처

수정사항은 클린 아키텍처 패턴을 유지합니다:

1. **표현 계층** (`src/renderer/src/components/MarkdownEditor.tsx`)
   - 단순화된 React 래퍼 컴포넌트
   - props와 상태 변환 관리
   - useMemo를 통한 안정적인 설정 제공

2. **어댑터 계층** (`src/renderer/adapters/components/MarkdownEditor.tsx`)
   - 클린 아키텍처 컴포넌트
   - 직접적인 CodeMirror 통합
   - 이벤트 리스너 관리
   - 문서 업데이트 감지

### 수정 후 이벤트 흐름

```
사용자 입력 → CodeMirror 에디터 → updateListener → onContentChange → 앱 상태 → 프리뷰 업데이트
```

1. 사용자가 CodeMirror 에디터에 입력
2. CodeMirror가 문서 업데이트 이벤트 트리거
3. `updateListener`(이제 보존됨)가 변경사항 캐치
4. 새 내용과 함께 `onContentChange` 콜백 호출
5. 앱 컴포넌트가 상태 업데이트
6. 프리뷰 컴포넌트가 새 내용으로 리렌더링

## 테스트 및 검증

### 검증 단계
1. ✅ 에디터의 텍스트 입력이 즉시 프리뷰에 반영됨
2. ✅ 에디터 성능 유지 (재생성 없음)
3. ✅ 모든 CodeMirror 기능 작동 (문법 강조, 줄 번호 등)
4. ✅ 콘솔 오류나 무한 리렌더링 없음

### 디버그 로그 증거
안정적인 에디터 라이프사이클 로그를 관찰하여 수정 확인:
```
[MarkdownEditor CA] Component rendered
[MarkdownEditor CA] Editor initialized successfully
[MarkdownEditor CA] Content changed: # Welcome to Markdown Editor...
[MarkdownEditor Wrapper] Content changed: # Welcome to Markdown Editor...
[App] Content change received: # Welcome to Markdown Editor...
[PreviewPane Wrapper] Content changed in effect: # Welcome to Markdown Editor...
```

## 향후 개선사항

### TODO: 적절한 동적 설정 업데이트
현재 솔루션은 동적 설정 업데이트를 임시로 비활성화했습니다. 향후 작업 사항:

1. 이벤트 리스너를 보존하는 설정 업데이트 메커니즘 구현
2. 안전한 설정 변경을 위해 CodeMirror의 `view.dispatch()`와 compartments 사용
3. 설정 관리와 이벤트 리스너 설정의 관심사 분리

### 성능 최적화
- 대용량 문서에 대한 내용 변경 이벤트 디바운싱 고려
- 매우 큰 마크다운 파일을 위한 가상 스크롤링 구현

## 배운 교훈

1. **React Hook 의존성**: useEffect의 불안정한 의존성은 무한 루프를 야기할 수 있음
2. **이벤트 리스너 보존**: 동적 설정 업데이트는 핵심 이벤트 핸들러를 덮어쓰면 안 됨
3. **객체 메모화**: props로 전달되는 객체에 useMemo를 사용하여 불필요한 리렌더링 방지
4. **클린 아키텍처의 이점**: 관심사의 분리로 인해 문제를 어댑터 계층에 국한시켜 디버깅이 훨씬 쉬워짐

## 관련 수정된 파일들

- `src/renderer/src/components/MarkdownEditor.tsx` - 설정 안정화
- `src/renderer/adapters/components/MarkdownEditor.tsx` - 핵심 수정 구현
- `src/renderer/src/App.tsx` - 디버그 로깅 (정리 예정)
- `src/renderer/src/components/PreviewPane.tsx` - 디버그 로깅 (정리 예정)

---

**수정 상태**: ✅ 완료 및 작동 확인됨
**문서 작성일**: 2025-12-03
**다음 단계**: 디버그 로그 정리 및 적절한 동적 설정 업데이트 구현