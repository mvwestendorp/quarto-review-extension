# Changelog

All notable changes to the Quarto Review Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Math/LaTeX Rendering** - LaTeX expressions now render correctly after edits
  - Lazy-load KaTeX CSS from CDN when math content is detected
  - Fixed issue where math displayed as plain text after editing paragraphs
  - Automatic CSS injection with SRI integrity verification
  - Zero performance impact when no math is present
  - Supports inline math (`$...$`) and display math (`$$...$$`)

### Added
- **Translation Module (Phase 3-4)** - Comprehensive translation workflow with production-ready features
  - Side-by-side translation view with synchronized scrolling (optimized with throttling)
  - Sentence segmentation and alignment algorithms
  - Double-click editing for source and target segments
  - Translation status indicators with accessibility labels (🤖 auto, ✍️ manual, ✏️ edited, ⚠️ out-of-sync)
  - Inline progress feedback with ARIA-busy semantics
  - Translation providers: OpenAI, LocalAI (WebGPU), Manual mode
  - Provider registry with pluggable architecture
  - Translation cache service for performance optimization
  - Keyboard shortcuts (Ctrl/Cmd+S save, Ctrl/Cmd+T translate, Ctrl/Cmd+Z undo/redo)
  - Error states with inline banners and retry affordances
  - Export functionality (unified and separated formats)
  - TranslationChangesModule for edit tracking with undo/redo
  - Plugin lifecycle with ReviewUIPlugin interface
  - StateStore integration for cross-component state management
  - Comprehensive logging taxonomy (179 logging statements across translation modules)
  - Translation metrics system with optional analytics hooks
    - Operation metrics (success/failure rates, duration tracking)
    - Cache performance metrics (hit/miss ratios, lookup times)
    - Provider performance metrics (latency percentiles: p50, p95, p99)
    - User interaction tracking (manual edits, auto-translations, exports)
    - Analytics integration support (Google Analytics, Prometheus, custom backends)
  - 110+ unit tests covering all translation workflows
  - User documentation (1000+ line comprehensive guide)
  - Operator runbook with provider architecture documentation

- **Performance Optimizations**
  - Operation history limiting (max 100 operations, max 50 redo stack) to prevent unbounded memory growth
  - Throttled scroll synchronization (16ms for 60fps) in translation view
  - Performance utilities (debounce, throttle, RAF scheduler, batch execution)
  - Optimized event listener management

- Initial release of Quarto Review Extension
- In-browser markdown editing with live preview
- Deterministic element ID mapping via Lua filter
- Changes module for tracking operations in-memory
- Markdown module using markdown-it for rendering
- Comments module with full CriticMarkup support
- Git module with isomorphic-git integration
- Multi-provider git support (GitHub, GitLab, Gitea, Forgejo, Local)
- User module with role-based permissions (Viewer, Editor, Admin)
- Stateless UI module with modal editor
- Undo/redo functionality
- Unsaved changes indicator
- Comprehensive test suite (unit and E2E)
- CI/CD pipeline with GitHub Actions
- Example Quarto project demonstrating all features
- Automated build process that copies assets to extension directory
- Dev container support with Node 22 and Quarto 1.6

### Removed
- HTML-to-Markdown conversion (unnecessary - data flow is unidirectional)

### Features in Detail

#### Changes Module
- Operations-based change tracking (insert, delete, edit, move)
- .qmd file reconstruction from operations
- Undo/redo stacks
- Operation summaries

#### Markdown Module
- markdown-it integration
- Element-specific rendering
- HTML sanitization
- Plain text extraction
- Basic HTML-to-Markdown conversion

#### Comments Module
- Full CriticMarkup syntax support
  - Additions: `{++text++}`
  - Deletions: `{--text--}`
  - Substitutions: `{~~old~>new~~}`
  - Comments: `{>>comment<<}`
  - Highlights: `{==text==}{>>note<<}`
- Accept/reject individual or all changes
- Comment management (add, resolve, delete)

#### Git Module
- isomorphic-git for browser/Node.js compatibility
- Full git operations (init, commit, push, pull, branch)
- Provider-specific API integrations
- Authentication support

#### User Module
- Session management with timeout
- localStorage persistence
- Role-based permissions
- Permission checking utilities

#### UI Module
- Click-to-edit interface with Milkdown-based editor
- Modal editor with rich markdown editing
- Hover effects and visual feedback
- Floating toolbar with undo/redo
- Notifications system
- Loading indicators

#### Lua Filter
- Deterministic ID generation based on document structure
- Source position tracking
- Configurable editable elements
- Future-ready for translation features

## [0.1.0] - TBD

Initial release.
