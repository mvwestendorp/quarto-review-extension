# Roadmap & Planning

Development roadmap and planned features for the Quarto Review Extension.

## Current Status

**Latest Version:** 0.1.0 (pre-release)
**Release Target:** TBD
**Status:** In active development 🚧

## Implemented Features ✅

### Core Functionality

- ✅ In-browser editing powered by Milkdown
- ✅ Change tracking with operations history
- ✅ Undo/Redo stacks with history limits
- ✅ CriticMarkup rendering and resolution helpers
- 🚧 Comments UI integration with new modules
- 🚧 User permission flows beyond local storage

### Recently Landed

- ✅ **Translation Module (Phase 3-4)** - Production-ready translation workflow
  - Side-by-side translation view with synchronized scrolling
  - Translation providers (OpenAI, LocalAI, Manual)
  - Sentence segmentation and alignment
  - Status indicators, progress feedback, error handling
  - Export functionality (unified and separated)
  - Translation metrics and analytics
  - 110+ unit tests, comprehensive documentation
- ✅ **Performance Optimizations (Phase 1 Quick Wins)**
  - Operation history limiting to prevent memory growth
  - Throttled scroll synchronization
  - Performance utilities (debounce, throttle, RAF scheduler)
- ✅ Change Summary Dashboard (statistics, export)
- ✅ Search & Find with regex and whole-word toggles
- ✅ Debug mode configuration surfaced via YAML
- ✅ Dev container refresh for Node 22 + Quarto 1.8

## Planned Features

### High Priority (Next 1-2 Months)

#### Feature #6: Side-by-Side Comparison View

- **Status:** Detailed plan complete (implementation pending)
- **Effort:** 70 hours / 3 weeks
- **Description:** Show original and edited versions side-by-side with synchronized scrolling
- **Features:**
  - Grid layout with draggable divider
  - Line number gutters
  - Visual diff markers
  - Zoom controls
  - Responsive tabs on mobile
- **Planning Document:** [FEATURE_PLAN_06_SIDEBYSIDE.md](./FEATURE_PLAN_06_SIDEBYSIDE.md)

### Medium Priority (1-3 Months)

#### Feature #6: Side-by-Side Comparison (Continued)

- Implementation of planned features
- Performance optimization for large documents
- User testing and feedback

#### Performance Optimization (Feature #9)

- **Status:** Phase 1 Quick Wins ✅ Complete
- **Next steps:** Phase 2 (Medium refactoring), Phase 3 (Advanced features)
- **Completed:**
  - Operation history limiting (max 100 operations, max 50 redo)
  - Scroll event throttling (16ms for 60fps)
  - Performance utilities module (debounce, throttle, RAF, batch)
- **Expected improvement:** 3-4x performance boost
- **Risk Level:** Very Low

### Long-term (3-6 Months)

#### Feature #12: AI-Powered Suggestions

- **Status:** Holistic strategy plan complete
- **Effort:** 80 hours / 8 weeks (phased)
- **Description:** Grammar, style, and readability suggestions powered by AI
- **Features:**
  - Grammar & spell checking
  - Style recommendations
  - Duplicate content detection
  - Readability analysis (Flesch-Kincaid, CEFR)
  - Content summarization
  - Formatting suggestions

**Deployment Options:**

1. Local models (FLAN-T5, Sentence Transformers, BERT)
2. Public API (OpenAI, Google, Anthropic, HuggingFace)
3. Private API (FastAPI + Llama 2/Mistral)

**Planning Document:** [FEATURE_PLAN_12_AI_INTEGRATION.md](./FEATURE_PLAN_12_AI_INTEGRATION.md)

#### Feature #3: Translation Support

- Side-by-side translation mode
- Deterministic correspondence mapping
- Language pair selection
- Translation memory integration
- Glossary management

#### Feature #4: Real-time Collaboration

- WebSocket support for live editing
- User presence indicators
- Cursor position sharing
- Real-time change propagation
- Conflict resolution

#### Feature #7: Advanced Annotations

- Threaded discussions
- @mentions for specific users
- Annotation categories/tags
- Annotation filtering and search
- Comment resolution workflows

#### Feature #11: Analytics & Reporting

- Document change statistics
- Review time tracking
- Reviewer productivity metrics
- Export analytics reports
- Custom dashboard

### Future Considerations (6+ Months)

- Mobile native apps (iOS, Android)
- Plugin system for third-party extensions
- Integration with external tools (Jira, Slack, etc.)
- Advanced security features (document encryption, audit logs)
- Multi-language UI
- Advanced accessibility features

## Documentation Roadmap

### Current (Complete)

- ✅ Developer setup guide
- ✅ Module documentation with JSDoc
- ✅ Architecture documentation
- ✅ Contributing guidelines
- ✅ User feature guide
- ✅ Keyboard shortcuts reference
- ✅ FAQ
- ✅ Troubleshooting guide

### Planned

- API documentation (auto-generated from JSDoc)
- Video tutorials
- Interactive demos
- API reference guide
- Plugin development guide

## Testing & Quality Roadmap

### Current

- ✅ 267 unit tests
- ✅ 76 new tests for Features #1 & #5
- ✅ Edge case coverage (25+ scenarios per feature)
- ✅ Security testing (XSS, HTML escaping)
- ✅ Accessibility testing (WCAG 2.1 AA)

### Planned

- E2E tests for user workflows
- Performance benchmarking
- Integration tests
- Accessibility audit
- Security audit
- User acceptance testing

## Build & Release Roadmap

### Build Process

- ✅ TypeScript compilation
- ✅ Vite bundling
- ✅ Asset copying
- 🔄 API documentation generation (in progress)
- 📋 Source map generation
- 📋 Code splitting

### Release Schedule

```
Version 1.0.0 (October 2025)
├── Core features
├── Basic UI improvements
└── Production ready

Version 1.1.0 (November 2025)
├── Side-by-side comparison
├── Performance optimization
└── Bug fixes

Version 1.2.0 (December 2025)
├── Multi-format export
├── Advanced annotations
└── Quality improvements

Version 2.0.0 (Q1 2026)
├── AI-powered suggestions
├── Real-time collaboration
├── Mobile apps
└── Major feature expansion
```

## Known Issues & Improvements

### Tracked Issues

- [ ] Mobile search panel sizing on very small screens
- [ ] Memory usage on documents > 10MB
- [ ] Comment thread performance with 100+ comments
- [ ] Regex performance on complex patterns
- [ ] TypeDoc build time on large codebases

### Planned Improvements

- Reduce bundle size
- Improve search performance for large documents
- Add dark mode support
- Enhance mobile UI
- Implement service workers for offline support

## How to Contribute

Interested in helping? Check out:

1. [Contributing Guide](../dev/CONTRIBUTING.md)
2. Pick a feature from the roadmap
3. Check the planning document
4. Submit a pull request!

## Feedback & Prioritization

Your feedback helps us prioritize features:

1. **What features do you want?** Let us know!
2. **What problems do you have?** We'll fix them
3. **How should features work?** Your input matters
4. **Any suggestions?** We're listening!

Contact: support@quartoreviewer.com

## Metrics & Goals

### Performance Goals

- Page load: < 2 seconds
- Search: < 100ms for documents with 10k elements
- Change tracking: < 50ms per edit
- Memory: < 100MB for typical documents

### Quality Goals

- 100% TypeScript strict mode
- 80%+ test coverage
- Zero critical security issues
- WCAG 2.1 AA accessibility

### User Adoption Goals

- 1000+ active users by end of year
- 4.5+ star rating
- 95%+ user satisfaction

## Contact & Support

- **Issues:** GitHub Issues
- **Feature Requests:** GitHub Discussions
- **Email:** support@quartoreviewer.com
- **Chat:** Slack channel

Thank you for your interest in the Quarto Review Extension! 🎉
