# Changelog

All notable changes to the Quarto Review Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
