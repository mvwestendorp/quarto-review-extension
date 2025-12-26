# Documentation Archive

This directory contains archived planning documents, completed implementation summaries, and historical development documentation.

## Purpose

Files in this archive are kept for reference and historical context but are no longer actively maintained. They document:
- Completed feature implementations
- Historical planning documents
- Superseded architecture decisions
- Session notes from major development phases

## Why Archive Instead of Delete?

While git preserves full history, keeping an archive directory makes it easier to:
- Find historical context for architectural decisions
- Reference completed planning documents
- Track the evolution of features over time
- Avoid cluttering the main documentation structure

## Archive Structure

### `/github-pages/`
Documentation related to GitHub Pages setup and deployment configuration.

**Key files:**
- `GITHUB_PAGES_SETUP.md` - Initial GitHub Pages configuration
- `GITHUB_PAGES_STATUS.md` - Deployment status tracking
- `README.md` - GitHub Pages documentation index

### `/translation-planning/`
Historical planning documents for the translation module implementation.

**Key files:**
- `TRANSLATION_MODULE_IMPLEMENTATION_PLAN.md` - Original translation feature plan
- `TRANSLATION_INTEGRATION.md` - Integration strategy
- `TRANSLATION_INTERACTIVE_DEMO.md` - Demo specifications
- Phase planning documents (phases 3-5)
- Task-specific implementation plans

## Finding Current Documentation

For up-to-date documentation, see:

- **User Documentation**: [`/docs/user/`](../user/) - Features, troubleshooting, FAQ
- **Developer Documentation**: [`/docs/dev/`](../dev/) - Setup, architecture, contributing
- **TODO & Planning**: [`/todo.md`](../../todo.md) - Current backlog and priorities
- **Main README**: [`/README.md`](../../README.md) - Project overview

## Document Lifecycle

Documents move to the archive when:
1. Implementation is complete and documented elsewhere
2. Planning documents are superseded by newer plans
3. Technical decisions are finalized and documented
4. Session notes are no longer actively referenced

## Note on Deleted Files

Some outdated documentation has been deleted entirely rather than archived:
- `/docs/archive/completed-plans/` - Superseded implementation summaries (deleted 2025-12-26)
- `/docs/archive/deployment-examples/` - Outdated deployment examples (deleted 2025-12-26)

These files are preserved in git history if needed for reference.

---

Last updated: 2025-12-26
