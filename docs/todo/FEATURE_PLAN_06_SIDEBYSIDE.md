# Feature #6: Side-by-Side Original vs. Edited View

## Overview
Add a "Compare View" mode to show the original document on the left and the edited version on the right with synchronized scrolling and visual diff highlighting.

## User Value Proposition
- **For major rewrites:** Character-level diffs (CriticMarkup) become hard to read. Side-by-side shows the before/after clearly.
- **For large deletions/additions:** Easier to understand context when you see both versions simultaneously.
- **For structural changes:** Readers can see how paragraphs were reorganized or merged.
- **Faster review:** No toggling needed; scan both versions at once.

---

## Architecture

### Data Model
```typescript
// Add to UIModule
interface ViewMode {
  type: 'inline' | 'sidebyside';
  trackingEnabled: boolean;
}

// Store in UIModule state
private viewMode: ViewMode = { type: 'inline', trackingEnabled: true };
```

### UI Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Toolbar: [View Mode Toggle] [Tracking] [Sync]  │
├──────────────────┬──────────────────────────────┤
│   ORIGINAL       │   EDITED (Tracked)           │
│   (left pane)    │   (right pane)               │
│                  │   (with CriticMarkup)        │
│  • No tracking   │   • Green for additions      │
│  • Read-only     │   • Red for deletions        │
│  • Frozen scroll │   • Orange for substitutions │
│  • Line numbers  │                              │
└──────────────────┴──────────────────────────────┘
```

### Components to Create

#### 1. **CompareViewContainer** (New Component)
- Manages left/right pane layout
- Handles synchronized scrolling
- Responsive breakpoint handling
- CSS Grid for layout (easier than flexbox for equal-width columns)

**Location:** `src/modules/ui/compare-view.ts`

```typescript
export class CompareViewContainer {
  private leftPane: HTMLElement;
  private rightPane: HTMLElement;
  private syncScroll: boolean = true;
  private lastScrollSource: 'left' | 'right' | null = null;

  constructor(originalContent: string, editedContent: string) {
    this.createLayout(originalContent, editedContent);
    this.attachScrollSync();
  }

  private attachScrollSync(): void {
    // When left scrolls, scroll right to same position
    // Debounced to prevent jank
    const debounceDelay = 50; // ms

    this.leftPane.addEventListener('scroll', this.debounce(() => {
      if (this.lastScrollSource === 'right') return;
      this.lastScrollSource = 'left';
      this.rightPane.scrollTop = this.leftPane.scrollTop;
    }, debounceDelay));

    this.rightPane.addEventListener('scroll', this.debounce(() => {
      if (this.lastScrollSource === 'left') return;
      this.lastScrollSource = 'right';
      this.leftPane.scrollTop = this.rightPane.scrollTop;
    }, debounceDelay));
  }

  toggleSyncScroll(): void {
    this.syncScroll = !this.syncScroll;
    // Update UI indicator
  }
}
```

#### 2. **LineNumberGutter** (Reusable Component)
- Show line numbers in left pane
- Optional line number sync highlighting
- Helps identify which lines changed

```typescript
class LineNumberGutter {
  private lineCount: number;
  private gutterElement: HTMLElement;

  constructor(content: string, targetPane: HTMLElement) {
    this.lineCount = content.split('\n').length;
    this.renderGutter();
    this.attachToPane(targetPane);
  }

  private renderGutter(): void {
    const lines = Array.from({ length: this.lineCount }, (_, i) => i + 1);
    this.gutterElement.innerHTML = lines
      .map(n => `<div class="line-number">${n}</div>`)
      .join('');
  }
}
```

#### 3. **DiffHighlighter** (Enhanced from existing)
- Leverage existing CriticMarkup highlighting in right pane
- Add block-level diff for structural changes (optional)
- Color-coded line markers in left pane showing:
  - 🟢 Modified line (appears in edited)
  - 🔴 Deleted line (missing in edited)
  - 🟠 Moved line (reordered)

---

## Implementation Steps

### Phase 1: Core Layout (Week 1)
1. **Add view mode toggle to toolbar**
   - Radio buttons: "Inline" vs. "Side-by-side"
   - Store preference in localStorage
   - Update CSS for two-column layout

2. **Create CompareViewContainer**
   - Render original content (left, read-only)
   - Render edited content (right, with CriticMarkup)
   - CSS Grid layout with fixed divider

3. **Implement synchronized scrolling**
   - Test with various content sizes
   - Handle browser differences (scroll events timing)

### Phase 2: Polish & Features (Week 2)
1. **Add line numbers** (left pane)
2. **Add visual diff markers** (left margin showing change types)
3. **Responsive design:**
   - Below 1024px width: Stack vertically with tabs
   - Touch-friendly scroll sync toggle
4. **Copy-to-clipboard from each pane**
5. **Zoom controls** (for readability)

### Phase 3: Advanced Features (Optional, Week 3)
1. **Block-level diff algorithm** (show paragraph-level changes)
2. **Diff statistics tooltip** on divider
3. **Find & jump to next change** across both panes
4. **Unified diff export** (context diff format)

---

## CSS Strategy

### CSS Grid Layout
```css
.compare-view-container {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0;
  height: calc(100vh - 100px);
}

.compare-pane-original {
  grid-column: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
}

.compare-pane-divider {
  grid-column: 2;
  cursor: col-resize;
  background: #e5e7eb;
  position: relative;
}

.compare-pane-divider:hover {
  background: #3b82f6;
}

.compare-pane-edited {
  grid-column: 3;
  overflow-y: auto;
  padding: 16px;
  background: #ffffff;
}
```

### Responsive Breakpoint
```css
@media (max-width: 1024px) {
  .compare-view-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .compare-pane-divider {
    display: none;
  }

  .compare-tabs {
    display: flex;
    grid-column: 1;
    grid-row: 1;
    border-bottom: 1px solid #e5e7eb;
  }

  .compare-pane-original {
    grid-row: 2;
    display: none; /* Hidden until "Original" tab selected */
  }

  .compare-pane-original.active {
    display: block;
  }

  .compare-pane-edited {
    grid-row: 2;
  }

  .compare-pane-edited.active {
    display: block;
  }
}
```

---

## State Management Integration

### Track mode in UIModule
```typescript
private viewMode: 'inline' | 'sidebyside' = 'inline';

// Persist to localStorage
private saveViewModePreference(): void {
  localStorage.setItem('review-view-mode', this.viewMode);
}

private loadViewModePreference(): void {
  const saved = localStorage.getItem('review-view-mode');
  if (saved === 'sidebyside') {
    this.viewMode = 'sidebyside';
  }
}
```

### Toggle Implementation
```typescript
private toggleViewMode(mode: 'inline' | 'sidebyside'): void {
  if (mode === this.viewMode) return;

  this.viewMode = mode;
  this.saveViewModePreference();

  if (mode === 'sidebyside') {
    this.initializeCompareView();
  } else {
    this.destroyCompareView();
    this.refresh(); // Return to normal inline view
  }
}
```

---

## Performance Considerations

### Challenge: Large Documents
- **Problem:** Rendering full document on both sides doubles DOM nodes
- **Solution:** Virtual scrolling (only render visible sections)
  - Keep visible range + 2 screens above/below
  - Destroy off-screen content
  - Maintain scroll position accuracy

### Challenge: Scroll Sync Jank
- **Problem:** Sync scroll events fire every pixel, causing layout thrashing
- **Solution:** Debounce scroll events (50ms minimum)
- Use `transform: translateY()` for temporary positioning (GPU accelerated)

### Challenge: Memory with Large Diffs
- **Problem:** CriticMarkup expansion can 2-3x content size
- **Solution:** Lazy-parse CriticMarkup only when visible
- Cache parsed content to avoid re-parsing on scroll

---

## Testing Strategy

### Unit Tests
- Compare view container initialization
- Scroll sync accuracy
- Line number calculation
- Responsive breakpoint triggering

### E2E Tests
- Open compare view with sample document
- Verify left/right content differs correctly
- Test scroll sync (scroll left, verify right follows)
- Test responsive on mobile (tabs should show)
- Test view mode toggle persistence (reload page)

### Manual Smoke Tests
1. **Edge cases:**
   - Very long document (500+ lines)
   - Document with only deletions
   - Document with only additions
   - Document with structural reorganization (moved paragraphs)

2. **Devices:**
   - Desktop (1920x1080, 1280x720)
   - Tablet (768px)
   - Mobile (375px)

---

## Rollout Plan

### Soft Launch
1. Feature flag: `enableCompareView: false` by default
2. Enable for beta users first
3. Monitor performance metrics (FCP, LCP, CLS)
4. Gather feedback on UX

### Hardening
- Fix any scroll sync edge cases
- Optimize for large documents
- Add analytics tracking (how often used, performance)

### Full Release
- Remove feature flag
- Add to release notes
- Update documentation

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Time to identify changes | -30% vs. inline | User task timing study |
| Performance on 100KB+ docs | <200ms FCP | Lighthouse CI |
| Mobile usability | 4/5 stars | User survey on mobile |
| Adoption rate | >40% for reviewers | Analytics event tracking |

---

## Dependencies
- No new external libraries needed
- Leverages existing Markdown rendering
- Uses native CSS Grid (all modern browsers)

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Performance on large docs | High | Implement virtual scrolling; feature flag for rollout |
| Scroll sync jank | Medium | Debounce; use GPU-accelerated transforms |
| Mobile layout confusion | Medium | Tabs instead of side-by-side below 1024px |
| Increased bundle size | Low | ~5-8 KB gzipped; tree-shakeable |

---

## Files to Modify/Create

### Create
- `src/modules/ui/compare-view.ts` - CompareViewContainer class
- `src/modules/ui/line-number-gutter.ts` - Line number rendering
- `tests/unit/compare-view.spec.ts` - Unit tests
- `tests/e2e/compare-view.spec.ts` - E2E tests

### Modify
- `src/modules/ui/index.ts` - Add toggleViewMode, integrate CompareViewContainer
- `_extensions/review/assets/review.css` - Add compare-view styles
- `package.json` - Update to version X.Y.Z

---

## Effort Estimate
- **Total:** 70 hours
  - Core layout: 20h
  - Scroll sync: 10h
  - Line numbers & markers: 10h
  - Responsive design: 12h
  - Testing: 12h
  - Polish: 6h

---

## Future Extensions
1. **Resizable column divider** - User can drag to adjust pane widths
2. **Unified diff export** - Export in standard diff format
3. **Line-by-line review mode** - Step through changes one by one
4. **Blame view** - Show who made each change (integration with git history)
