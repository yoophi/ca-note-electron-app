<!--
Sync Impact Report:
Version change: 2.0.0 → 2.1.0
Modified principles: None
Added sections: VI. Hexagonal Architecture for Main Process
Removed sections: None
Templates requiring updates:
⚠ .specify/templates/plan-template.md - Constitution Check may need updates
⚠ .specify/templates/spec-template.md - Architecture requirements alignment needed
⚠ .specify/templates/tasks-template.md - Task categorization may need architecture tasks
Follow-up TODOs: None
-->

# CA-Note Electron App Constitution

## Learning Purpose

This project serves as an educational exploration of Clean Architecture principles in an Electron/React/TypeScript environment. The primary goal is understanding architectural patterns through practical implementation of a markdown editor with plaintext authoring, preview capabilities, filesystem persistence, and file loading/editing functionality.

**Focus**: Architecture comprehension over production-ready completeness. Learning through controlled complexity and essential testing rather than exhaustive coverage.

## Core Principles

### I. Clean Architecture First
Every feature MUST follow Clean Architecture principles with clear layer separation: Entities (business logic) → Use Cases (application logic) → Interface Adapters (controllers/presenters) → Frameworks & Drivers (UI/DB). Dependencies MUST point inward only. No framework code in business logic layers.

**Rationale**: Primary learning objective. Demonstrates separation of concerns and dependency inversion in a real application context.

### II. Feature-Driven Development
Features MUST be developed as independent vertical slices from UI to data layer. Each feature slice MUST be independently testable and deliverable. No horizontal layer-first development.

**Rationale**: Reinforces architectural understanding by implementing complete use cases that demonstrate all layers working together.

### III. Essential Testing (Learning-Focused)
Testing MUST be essential and educational, not excessive. Write tests that demonstrate architectural boundaries and core business logic. Focus on: (1) Entity/Use Case unit tests for business rules, (2) Integration tests for critical user journeys, (3) Contract tests for layer boundaries. Avoid over-testing of UI details, trivial getters/setters, or framework code.

**Rationale**: Tests serve as executable documentation of architecture. Quality learning comes from understanding what to test and why, not from achieving high coverage percentages.

### IV. TypeScript Strictness
TypeScript strict mode MUST be enabled. All code MUST have explicit types. No `any` types except for well-documented external library integrations. Type safety MUST extend through all architectural layers.

**Rationale**: Static typing reveals architectural boundaries and prevents runtime errors during learning experiments.

### V. Electron Process Isolation
Main and renderer processes MUST communicate only through well-defined IPC contracts. No shared state between processes. Preload scripts MUST expose minimal, type-safe APIs. Security-first approach to inter-process communication.

**Rationale**: Demonstrates proper separation of concerns in multi-process architectures and teaches secure application design.

### VI. Hexagonal Architecture for Main Process
Main process code MUST follow hexagonal architecture principles with clear separation between business logic core and external adapters. External concerns (filesystem, IPC, OS APIs) MUST be abstracted through ports and adapters. The business logic core MUST be framework-agnostic and testable in isolation.

**Rationale**: Reinforces architectural learning by demonstrating how to isolate core business logic from external dependencies in the main process, complementing the Clean Architecture principles applied to the overall application structure.

## Learning Standards

Code MUST be readable and self-documenting for educational review. Complexity MUST be justified in terms of architectural learning value. Performance requirements are relaxed in favor of clear, understandable implementations. Cross-platform compatibility SHOULD be maintained but is secondary to architectural clarity.

**Rationale**: Optimizes for learning outcomes over production readiness while maintaining professional development practices.

## Development Workflow

Feature development MUST follow: Specification → Essential Test Design → Implementation → Architectural Review. Focus on understanding why each architectural decision was made. Code reviews MUST verify Clean Architecture compliance and learning objective alignment. Direct commits to main branch are acceptable for learning experiments.

**Rationale**: Emphasizes understanding over process overhead while maintaining architectural discipline.

## Governance

This constitution prioritizes learning and architectural understanding. Amendments should enhance educational value while maintaining Clean Architecture principles. Excessive testing or production-level complexity MUST be avoided unless it serves a specific learning purpose. Learning documentation takes precedence over exhaustive documentation.

**Version**: 2.1.0 | **Ratified**: 2025-12-03 | **Last Amended**: 2025-12-03