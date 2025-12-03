# Research: Markdown Editor Implementation

**Date**: 2025-12-03
**Feature**: Markdown Editor with CodeMirror 6 and react-markdown
**Context**: Clean Architecture Electron application for educational purposes

## Overview

This research document consolidates findings on implementing a dual-pane markdown editor using CodeMirror 6 for editing and react-markdown for preview rendering in a Clean Architecture Electron application.

## Technology Decisions

### CodeMirror 6 for Markdown Editing

**Decision**: Use @uiw/react-codemirror as primary React wrapper for CodeMirror 6
**Rationale**:
- Mature, well-maintained wrapper with TypeScript support
- 433+ dependent projects, active community
- Handles React integration concerns automatically
- Educational value through modular extension system

**Alternatives considered**:
- Direct CodeMirror 6 integration: Requires significant boilerplate
- CodeMirror 5: Legacy version, not TypeScript-native
- Monaco Editor: Too heavy for educational focus

### react-markdown for Preview Rendering

**Decision**: Use react-markdown with remark-gfm and rehype-sanitize plugins
**Rationale**:
- Secure by default (no dangerouslySetInnerHTML)
- Virtual DOM approach enables <100ms updates
- Extensive plugin ecosystem for customization
- Excellent TypeScript support

**Alternatives considered**:
- marked + DOMPurify: Security concerns with innerHTML
- markdown-it: Requires additional sanitization
- MDX: Too complex for note-taking use case

## Implementation Architecture

### Package Dependencies

```json
{
  "dependencies": {
    "@uiw/react-codemirror": "^4.25.3",
    "@codemirror/lang-markdown": "^6.3.2",
    "@codemirror/language-data": "^6.7.0",
    "@codemirror/commands": "^6.7.4",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.0",
    "rehype-sanitize": "^6.0.0",
    "react-syntax-highlighter": "^15.5.0"
  }
}
```

### Clean Architecture Integration

**Entity Layer**:
```typescript
// Document entity with content, file path, modification tracking
interface Document {
  id: string;
  content: string;
  filePath?: string;
  modifiedAt: Date;
  isDirty: boolean;
}
```

**Use Cases Layer**:
```typescript
// EditDocument, RenderMarkdown, SaveDocument use cases
// Business logic for content validation, auto-save triggers
```

**Interface Adapters Layer**:
```typescript
// React components (MarkdownEditor, PreviewPane)
// Custom hooks (useMarkdownEditor, useFileOperations)
// Presenters for view model transformation
```

**Frameworks Layer**:
```typescript
// CodeMirror 6 extensions configuration
// react-markdown plugins and components
// Electron IPC for file operations
```

## Performance Optimization

### Critical Performance Patterns

1. **Extension Memoization** (CodeMirror 6 requirement):
```typescript
const extensions = useMemo(() => [
  markdown({ codeLanguages: languages }),
  darkTheme
], []);
```

2. **Debounced Preview Updates**:
```typescript
const updatePreview = useDebouncedCallback((content: string) => {
  setPreviewContent(content);
}, 100); // Meets <100ms SC-001 requirement
```

3. **Component Memoization**:
```typescript
export const MarkdownPreview = memo<{ content: string }>(
  ({ content }) => <ReactMarkdown>{content}</ReactMarkdown>,
  (prev, next) => prev.content === next.content
);
```

### Meeting Success Criteria

- **SC-001** (Preview updates <100ms): Virtual DOM + debouncing
- **SC-002** (100% content fidelity): Raw string handling, no transformations
- **SC-003** (5MB file performance): Lazy loading, virtualization for large documents
- **SC-004** (95% markdown syntax support): CommonMark + GFM via remark-gfm

## Security Implementation

### react-markdown Security Features

**Built-in Protection**:
- No `dangerouslySetInnerHTML` usage
- URI sanitization (neutralizes javascript:, vbscript:, file: protocols)
- Optional HTML skipping with `skipHtml={true}`

**Additional Security Layers**:
```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeSanitize]}
  skipHtml={true} // Prevents HTML injection
>
  {content}
</ReactMarkdown>
```

## TypeScript Configuration

### Key Type Patterns

**Custom Component Typing**:
```typescript
import type { Components, ExtraProps } from 'react-markdown';
import { ComponentPropsWithoutRef } from 'react';

type CodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps & {
  inline?: boolean;
};
```

**Extension Type Safety**:
```typescript
import { Extension } from '@codemirror/state';

export function createMarkdownExtensions(): Extension[] {
  return [
    markdown({ codeLanguages: languages }),
    autocompletion(),
    history()
  ];
}
```

## Educational Focus Areas

### Learning Objectives

1. **Clean Architecture Principles**:
   - Dependency inversion through IPC abstractions
   - Entity-Use Case-Adapter separation
   - Framework isolation in outer layers

2. **React Performance**:
   - Understanding why CodeMirror requires more memoization
   - Virtual DOM vs innerHTML trade-offs
   - Debouncing for expensive operations

3. **TypeScript Boundaries**:
   - Type safety across architectural layers
   - Plugin system type composition
   - React component type patterns

4. **Electron Architecture**:
   - Process isolation for file operations
   - IPC contract design
   - Security considerations

## Implementation Milestones

### Phase 1: Core Editor (P1 User Story)
- Basic CodeMirror 6 integration
- react-markdown preview pane
- Real-time synchronization
- Essential markdown syntax support

### Phase 2: File Operations (P2 User Story)
- Electron IPC for file system access
- Save/load document functionality
- File path management
- Content fidelity validation

### Phase 3: Enhanced UX (P3 User Story)
- Unsaved changes tracking
- Multiple document support
- File status indicators
- Error handling and recovery

## Risk Mitigation

### Identified Challenges

**CodeMirror 6 React Integration**:
- Risk: Performance degradation with frequent re-renders
- Mitigation: Strict memoization patterns, extension stability

**Large File Handling**:
- Risk: UI freezing with 5MB+ markdown files
- Mitigation: Virtualization, incremental parsing, background processing

**Security Vulnerabilities**:
- Risk: XSS through markdown content
- Mitigation: react-markdown's safe defaults, rehype-sanitize plugin

**Learning Curve**:
- Risk: Complex architecture overwhelming educational goals
- Mitigation: Incremental implementation, focused testing on boundaries

## Success Validation

### Testing Strategy

**Essential Tests** (per constitution):
1. **Entity Tests**: Document validation, state transitions
2. **Use Case Tests**: Business logic for editing, saving, rendering
3. **Integration Tests**: Editor-preview synchronization, file operations
4. **Contract Tests**: IPC boundary validation

**Architectural Validation**:
- Dependency direction enforcement
- Framework isolation verification
- Type safety across all layers
- Performance benchmark achievement

## References

- [CodeMirror 6 React Integration Guide](https://uiwjs.github.io/react-codemirror/)
- [react-markdown Security Best Practices](https://github.com/remarkjs/react-markdown/blob/main/readme.md#security)
- [Clean Architecture for React Applications](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Electron Security Best Practices](https://electronjs.org/docs/latest/tutorial/security)