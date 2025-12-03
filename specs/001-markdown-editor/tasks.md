---

description: "Task list template for feature implementation"
---

# Tasks: Markdown Editor

**Input**: Design documents from `/specs/001-markdown-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include ESSENTIAL tests that demonstrate architectural boundaries and core business logic. Focus on educational value over coverage. Avoid excessive testing of UI details or trivial functionality.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Electron project**: `src/main/`, `src/renderer/`, `src/preload/` at repository root
- Paths follow Clean Architecture structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install required dependencies for markdown editor (CodeMirror 6, react-markdown, remark-gfm, rehype-sanitize)
- [x] T002 [P] Configure TypeScript with strict mode for Electron project
- [x] T003 [P] Setup ESLint and Prettier configuration for TypeScript/React
- [x] T004 Create shared entity definitions in src/shared/entities/Document.ts
- [x] T005 Create shared entity definitions in src/shared/entities/EditorState.ts
- [x] T006 [P] Create IPC contracts file at src/shared/contracts/ipc-contracts.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create base Document entity in src/main/entities/Document.ts
- [ ] T008 [P] Create base FileSystemReference entity in src/main/entities/FileSystemReference.ts
- [ ] T009 [P] Create base EditorState entity in src/renderer/entities/EditorState.ts
- [ ] T010 Setup IPC preload script with type-safe API in src/preload/index.ts
- [ ] T011 Create DocumentRepository interface in src/main/repositories/DocumentRepository.ts
- [ ] T012 [P] Create FileSystemRepository interface in src/main/repositories/FileSystemRepository.ts
- [ ] T013 Configure main process IPC handlers in src/main/index.ts
- [ ] T014 Setup basic React app structure in src/renderer/App.tsx
- [ ] T015 [P] Configure CodeMirror extensions helper in src/renderer/frameworks/codemirror/extensions.ts
- [ ] T016 [P] Configure react-markdown components in src/renderer/frameworks/markdown/components.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Write and Preview Markdown (Priority: P1) 🎯 MVP

**Goal**: Dual-pane markdown editor with real-time preview using CodeMirror and react-markdown

**Independent Test**: Can be fully tested by opening the app, typing markdown syntax (like `# Header` or `**bold**`), and verifying the preview pane shows properly formatted content in real-time.

### Essential Tests for User Story 1 (Educational Focus) ⚠️

> **NOTE: Write tests that demonstrate architectural boundaries and business logic. Focus on learning value over coverage.**

- [ ] T017 [P] [US1] Create EditDocument use case test in tests/unit/use-cases/EditDocument.test.ts
- [ ] T018 [P] [US1] Create RenderMarkdown use case test in tests/unit/use-cases/RenderMarkdown.test.ts
- [ ] T019 [P] [US1] Create Document entity validation test in tests/unit/entities/Document.test.ts

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create Document entity with validation in src/renderer/entities/Document.ts
- [ ] T021 [P] [US1] Create EditorState entity in src/renderer/entities/EditorState.ts
- [ ] T022 [US1] Create EditDocument use case in src/renderer/use-cases/EditDocument.ts (depends on T020)
- [ ] T023 [P] [US1] Create RenderMarkdown use case in src/renderer/use-cases/RenderMarkdown.ts
- [ ] T024 [US1] Create ManageEditorState use case in src/renderer/use-cases/ManageEditorState.ts (depends on T021)
- [ ] T025 [P] [US1] Create MarkdownEditor component in src/renderer/adapters/components/MarkdownEditor.tsx
- [ ] T026 [P] [US1] Create PreviewPane component in src/renderer/adapters/components/PreviewPane.tsx
- [ ] T027 [US1] Create useMarkdownEditor hook in src/renderer/adapters/hooks/useMarkdownEditor.ts (depends on T022, T023)
- [ ] T028 [US1] Create EditorPresenter in src/renderer/adapters/presenters/EditorPresenter.ts (depends on T024)
- [ ] T029 [US1] Integrate components in main App component src/renderer/App.tsx (depends on T025, T026, T027)
- [ ] T030 [US1] Add real-time preview synchronization with debouncing in src/renderer/adapters/hooks/useMarkdownEditor.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Save and Load Files (Priority: P2)

**Goal**: Persistent workflow with file system operations for .md files

**Independent Test**: Can be tested by creating markdown content, saving it to a chosen location, closing the app, reopening it, and loading the saved file to continue editing.

### Essential Tests for User Story 2 (Educational Focus) ⚠️

- [ ] T031 [P] [US2] Create SaveDocument use case test in tests/unit/use-cases/SaveDocument.test.ts
- [ ] T032 [P] [US2] Create LoadDocument use case test in tests/unit/use-cases/LoadDocument.test.ts
- [ ] T033 [P] [US2] Create FileSystem integration test in tests/integration/FileSystemOperations.test.ts

### Implementation for User Story 2

- [ ] T034 [P] [US2] Create Document entity in src/main/entities/Document.ts
- [ ] T035 [P] [US2] Create FileSystemReference entity in src/main/entities/FileSystemReference.ts
- [ ] T036 [US2] Create SaveDocument use case in src/main/use-cases/SaveDocument.ts (depends on T034)
- [ ] T037 [US2] Create LoadDocument use case in src/main/use-cases/LoadDocument.ts (depends on T034)
- [ ] T038 [P] [US2] Create CreateDocument use case in src/main/use-cases/CreateDocument.ts
- [ ] T039 [US2] Create FileSystemAdapter in src/main/adapters/FileSystemAdapter.ts (depends on T035)
- [ ] T040 [US2] Implement IPC handlers for file operations in src/main/index.ts (depends on T036, T037, T038, T039)
- [ ] T041 [P] [US2] Create FileMenu component in src/renderer/adapters/components/FileMenu.tsx
- [ ] T042 [US2] Create useFileOperations hook in src/renderer/adapters/hooks/useFileOperations.ts (depends on T040)
- [ ] T043 [US2] Create FilePresenter in src/renderer/adapters/presenters/FilePresenter.ts (depends on T042)
- [ ] T044 [US2] Integrate file operations in App component src/renderer/App.tsx (depends on T041, T042, T043)
- [ ] T045 [US2] Add file content fidelity validation in src/main/use-cases/SaveDocument.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - File Management (Priority: P3)

**Goal**: Enhanced UX with file status indicators, unsaved changes handling, and new document creation

**Independent Test**: Can be tested by creating new documents, switching between files, and verifying proper handling of unsaved changes with appropriate user warnings.

### Essential Tests for User Story 3 (Educational Focus) ⚠️

- [ ] T046 [P] [US3] Create document state management test in tests/unit/DocumentState.test.ts
- [ ] T047 [P] [US3] Create file status tracking test in tests/integration/FileStatusTracking.test.ts

### Implementation for User Story 3

- [ ] T048 [P] [US3] Enhance Document entity with dirty state tracking in src/renderer/entities/Document.ts
- [ ] T049 [P] [US3] Create DocumentManager service in src/renderer/use-cases/DocumentManager.ts
- [ ] T050 [US3] Add unsaved changes warning logic in src/renderer/adapters/presenters/FilePresenter.ts (depends on T048)
- [ ] T051 [US3] Create FileStatusIndicator component in src/renderer/adapters/components/FileStatusIndicator.tsx (depends on T049)
- [ ] T052 [US3] Enhance FileMenu with new document functionality in src/renderer/adapters/components/FileMenu.tsx (depends on T049)
- [ ] T053 [US3] Add unsaved changes dialog in src/renderer/adapters/components/UnsavedChangesDialog.tsx (depends on T050)
- [ ] T054 [US3] Integrate file management features in App component src/renderer/App.tsx (depends on T051, T052, T053)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T055 [P] Add error boundary component in src/renderer/adapters/components/ErrorBoundary.tsx
- [ ] T056 [P] Implement performance monitoring for preview updates in src/renderer/adapters/hooks/useMarkdownEditor.ts
- [ ] T057 [P] Add keyboard shortcuts configuration in src/renderer/frameworks/codemirror/keybindings.ts
- [ ] T058 [P] Create theme configuration for CodeMirror in src/renderer/frameworks/codemirror/themes.ts
- [ ] T059 [P] Add syntax highlighting for code blocks in src/renderer/frameworks/markdown/syntaxHighlighting.ts
- [ ] T060 Security hardening for file operations in src/main/adapters/FileSystemAdapter.ts
- [ ] T061 Performance optimization for large files (>1MB) in src/renderer/use-cases/RenderMarkdown.ts
- [ ] T062 [P] Add application menu setup in src/main/index.ts
- [ ] T063 [P] Configure window state persistence in src/main/index.ts
- [ ] T064 Run end-to-end validation per quickstart.md test scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories but integrates with US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 and US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Entities before use cases
- Use cases before adapters (components, hooks, presenters)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Entities within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create EditDocument use case test in tests/unit/use-cases/EditDocument.test.ts"
Task: "Create RenderMarkdown use case test in tests/unit/use-cases/RenderMarkdown.test.ts"
Task: "Create Document entity validation test in tests/unit/entities/Document.test.ts"

# Launch all entities for User Story 1 together:
Task: "Create Document entity with validation in src/renderer/entities/Document.ts"
Task: "Create EditorState entity in src/renderer/entities/EditorState.ts"

# Launch all independent components for User Story 1 together:
Task: "Create MarkdownEditor component in src/renderer/adapters/components/MarkdownEditor.tsx"
Task: "Create PreviewPane component in src/renderer/adapters/components/PreviewPane.tsx"
Task: "Create RenderMarkdown use case in src/renderer/use-cases/RenderMarkdown.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence