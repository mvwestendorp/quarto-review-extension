# UI Modernization Plan

## Executive Summary

The Quarto Review Extension has a solid foundational design system but suffers from:
1. **Overly dark modals** - The 50% black overlay on `.review-editor-modal` is harsh and creates low contrast
2. **Outdated button styling** - Buttons lack modern elevation, hover feedback, and visual hierarchy
3. **Inconsistent component depth** - Some components feel flat while others are overly shadowed
4. **Limited color variation** - Color palette is functional but not engaging
5. **Weak visual feedback** - Insufficient hover states and active indicators

## Phase 1: Color System Enhancement

### 1.1 Modal Overlay Refinement
**Current Issue**: `.review-editor-modal` uses `rgba(0, 0, 0, 0.5)` - too dark and harsh

**Changes**:
```css
/* Before */
background-color: rgba(0, 0, 0, 0.5);

/* After - Softer, more modern */
background-color: rgba(15, 23, 42, 0.3);  /* Lighter, better contrast */
```

**Reasoning**:
- Reduces opacity from 50% to 30%
- Uses the app's primary dark color instead of pure black
- Maintains readability while creating a softer backdrop
- Better accessibility for users with light sensitivity

### 1.2 Extended Color Palette
Add new semantic colors to `tokens/colors.css`:

```css
/* New: Interactive feedback colors */
--review-color-success-hover: #16a34a;
--review-color-warning-hover: #d97706;
--review-color-danger-hover: #dc2626;

/* New: Glass/Frosted effect colors */
--review-color-glass-light: rgba(255, 255, 255, 0.8);
--review-color-glass-dark: rgba(15, 23, 42, 0.8);

/* New: Interactive state colors */
--review-color-focus-ring: rgba(59, 130, 246, 0.5);
--review-color-active-bg: rgba(59, 130, 246, 0.08);
```

### 1.3 Elevation & Shadow System
Add depth tokens to `tokens/effects.css`:

```css
/* Elevation shadows - creates visual hierarchy */
--review-shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
--review-shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.1);
--review-shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
--review-shadow-xl: 0 20px 25px -5px rgba(15, 23, 42, 0.1);
--review-shadow-2xl: 0 25px 50px -12px rgba(15, 23, 42, 0.15);

/* Interaction shadows - for hover states */
--review-shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.5);
--review-shadow-active: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
```

## Phase 2: Button Component Redesign

### 2.1 Primary Button Modernization

**File**: `components/buttons.css`

```css
/* Enhanced Primary Button */
.review-btn-primary {
  background: linear-gradient(
    135deg,
    var(--review-color-primary),
    var(--review-color-primary-dark)
  );
  color: #fff;
  border: none;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
  font-weight: 600;
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

.review-btn-primary:hover {
  background: linear-gradient(
    135deg,
    var(--review-color-primary-dark),
    var(--review-color-primary-darker)
  );
  box-shadow: 0 12px 20px -8px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

.review-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.review-btn-primary:focus-visible {
  outline: 2px solid var(--review-color-primary);
  outline-offset: 2px;
}
```

### 2.2 Secondary Button Enhancement

```css
.review-btn-secondary {
  background: var(--review-color-surface);
  color: var(--review-color-neutral-strong);
  border: 2px solid var(--review-color-border);
  font-weight: 600;
  box-shadow: var(--review-shadow-sm);
}

.review-btn-secondary:hover {
  background: var(--review-color-surface-alt);
  border-color: var(--review-color-primary);
  box-shadow: var(--review-shadow-md);
  transform: translateY(-1px);
  color: var(--review-color-primary-darker);
}

.review-btn-secondary:active {
  background: #f3f4f6;
  box-shadow: var(--review-shadow-sm);
  transform: translateY(0);
}

.review-btn-secondary:focus-visible {
  outline: 2px solid var(--review-color-primary);
  outline-offset: 2px;
}
```

### 2.3 Pill Button Modernization

```css
.review-btn-pill {
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.95),
    rgba(237, 242, 255, 0.9)
  );
  border: 1px solid rgba(59, 130, 246, 0.25);
  box-shadow: var(--review-shadow-sm);
  font-weight: 500;
  color: var(--review-color-primary-contrast);
}

.review-btn-pill:hover {
  background: linear-gradient(
    135deg,
    rgba(237, 242, 255, 0.95),
    rgba(229, 237, 255, 0.9)
  );
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: var(--review-shadow-md);
  transform: translateY(-2px);
  color: var(--review-color-primary-darker);
}
```

### 2.4 Icon Button Enhancement

```css
.review-btn-icon {
  background: transparent;
  border: none;
  color: var(--review-color-muted);
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 6px 8px;
}

.review-btn-icon:hover {
  color: var(--review-color-primary-darker);
  background-color: var(--review-color-active-bg);
  box-shadow: var(--review-shadow-sm);
}

.review-btn-icon:active {
  background-color: rgba(59, 130, 246, 0.15);
}

.review-btn-icon:focus-visible {
  outline: 2px solid var(--review-color-primary);
  outline-offset: 2px;
}
```

## Phase 3: Component Updates

### 3.1 Modal Styling (`components/editor.css`)

```css
.review-editor-modal {
  background-color: rgba(15, 23, 42, 0.3);  /* Softer backdrop */
  backdrop-filter: blur(2px);                /* Subtle blur effect */
}

.review-editor-container {
  background: var(--review-color-surface);
  border-radius: 16px;                       /* Larger, more modern radius */
  box-shadow: var(--review-shadow-2xl);      /* Enhanced shadow depth */
  border: 1px solid rgba(59, 130, 246, 0.1);  /* Subtle accent border */
}

.review-editor-header {
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.5),
    rgba(237, 242, 255, 0.3)
  );
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 16px 16px 0 0;
}

.review-editor-footer {
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.5),
    rgba(237, 242, 255, 0.3)
  );
  border-top: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 0 0 16px 16px;
}
```

### 3.2 Toolbar Enhancement (`components/toolbar.css`)

```css
.review-toolbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow: var(--review-shadow-lg);
  border-radius: 20px;
  padding: 16px 20px;
}

.review-toolbar:hover {
  box-shadow: var(--review-shadow-xl);
  border-color: rgba(59, 130, 246, 0.25);
}

.review-editor-toolbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  box-shadow: var(--review-shadow-lg);
}

.review-editor-toolbar-btn {
  background: var(--review-color-active-bg);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: var(--review-color-accent-deep);
  transition: all 0.15s ease;
  font-weight: 600;
}

.review-editor-toolbar-btn:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: var(--review-shadow-md);
  transform: translateY(-2px);
  color: var(--review-color-accent-strong);
}

.review-editor-toolbar-btn:active {
  background: rgba(59, 130, 246, 0.2);
  box-shadow: var(--review-shadow-active);
  transform: translateY(0);
}
```

### 3.3 Sidebar Enhancement (`components/sidebar.css`)

```css
.review-persistent-sidebar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: var(--review-shadow-xl);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 16px;
}

.review-sidebar-header {
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.8),
    rgba(237, 242, 255, 0.6)
  );
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 16px 16px 0 0;
}

.review-sidebar-help {
  background: linear-gradient(
    135deg,
    rgba(229, 237, 255, 0.5),
    rgba(237, 242, 255, 0.4)
  );
  border: 1px solid rgba(59, 130, 246, 0.2);
}
```

## Phase 4: Testing Strategy

### 4.1 Visual Regression Testing

Create new test suite: `tests/e2e/ui-regression.spec.ts`

**Tests to implement**:
1. **Color consistency checks**
   - Verify all color tokens are applied correctly
   - Check color contrast ratios (WCAG AA minimum 4.5:1)
   - Validate dark mode overrides

2. **Button state verification**
   - Verify button hover states apply
   - Check active/pressed states
   - Validate disabled state styling
   - Test focus-visible outlines

3. **Modal styling**
   - Screenshot backdrop opacity
   - Verify modal shadow depth
   - Check border styling
   - Validate border radius

4. **Component elevation**
   - Verify shadow depths on different components
   - Test hover elevation changes
   - Validate active state shadow changes

5. **Responsive design**
   - Test button sizing on mobile
   - Verify sidebar collapse behavior
   - Check toolbar positioning on small screens

**Implementation example**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('UI Modernization - Buttons', () => {
  test('primary button has correct colors and shadows', async ({ page }) => {
    await page.goto('/example');

    // Get computed styles
    const btn = page.locator('.review-btn-primary');
    const bgColor = await btn.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    const boxShadow = await btn.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );

    // Verify styles match design
    expect(bgColor).toContain('59, 130, 246');  // Primary color
    expect(boxShadow).toBeTruthy();
    expect(boxShadow).toContain('rgba');
  });

  test('button hover state applies correctly', async ({ page }) => {
    const btn = page.locator('.review-btn-primary');

    const before = await btn.screenshot();
    await btn.hover();
    const after = await btn.screenshot();

    // Verify visual change occurred
    expect(before).not.toEqual(after);
  });

  test('disabled button styling is distinct', async ({ page }) => {
    const btn = page.locator('.review-btn[disabled]');
    const opacity = await btn.evaluate(el =>
      window.getComputedStyle(el).opacity
    );

    expect(parseFloat(opacity)).toBeLessThan(1);
  });
});
```

### 4.2 CSS Build Tests

Create: `tests/unit/css-design-tokens.test.ts`

**Tests**:
1. Verify all CSS variables are defined
2. Validate shadow values exist
3. Check color variable format (hex or rgba)
4. Ensure radius values are consistent

**Example**:
```typescript
import { test, expect } from 'vitest';

test('design tokens are properly defined', () => {
  const style = getComputedStyle(document.documentElement);

  // Check primary colors exist
  expect(style.getPropertyValue('--review-color-primary')).toBeTruthy();
  expect(style.getPropertyValue('--review-color-primary-dark')).toBeTruthy();

  // Check shadow values exist
  expect(style.getPropertyValue('--review-shadow-lg')).toBeTruthy();
  expect(style.getPropertyValue('--review-shadow-xl')).toBeTruthy();
});

test('button variants are not broken after CSS changes', () => {
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="review-btn review-btn-primary">Primary</button>
    <button class="review-btn review-btn-secondary">Secondary</button>
    <button class="review-btn review-btn-pill">Pill</button>
  `;
  document.body.appendChild(root);

  const primary = root.querySelector('.review-btn-primary');
  const styles = window.getComputedStyle(primary);

  // Verify computed styles match expectations
  expect(styles.cursor).toBe('pointer');
  expect(styles.borderRadius).toBeTruthy();

  document.body.removeChild(root);
});
```

### 4.3 Accessibility Testing

Create: `tests/e2e/ui-accessibility.spec.ts`

**Tests**:
1. **Color contrast verification**
   ```typescript
   test('button text has sufficient contrast', async ({ page }) => {
     const btn = page.locator('.review-btn-primary');
     const contrast = await page.evaluate(el => {
       // Use wcag-contrast library
       const bgColor = window.getComputedStyle(el).backgroundColor;
       const textColor = window.getComputedStyle(el).color;
       return calculateContrast(bgColor, textColor);
     }, btn);

     expect(contrast).toBeGreaterThanOrEqual(4.5);  // WCAG AA
   });
   ```

2. **Focus indicator visibility**
   ```typescript
   test('focused button shows focus ring', async ({ page }) => {
     const btn = page.locator('.review-btn-primary');
     await btn.focus();

     const outline = await btn.evaluate(el =>
       window.getComputedStyle(el).outline
     );

     expect(outline).toBeTruthy();
   });
   ```

3. **Hover state readability**
   - Verify hover states maintain contrast

### 4.4 CSS Snapshot Tests

Create: `tests/unit/css-snapshots.test.ts`

**Strategy**: Snapshot computed styles of key components

```typescript
test('button styles match snapshot after CSS changes', () => {
  const btn = document.createElement('button');
  btn.className = 'review-btn review-btn-primary';
  document.body.appendChild(btn);

  const styles = {
    padding: window.getComputedStyle(btn).padding,
    backgroundColor: window.getComputedStyle(btn).backgroundColor,
    borderRadius: window.getComputedStyle(btn).borderRadius,
    boxShadow: window.getComputedStyle(btn).boxShadow,
  };

  expect(styles).toMatchSnapshot();
  document.body.removeChild(btn);
});
```

## Phase 5: Implementation Order

1. **Week 1: Color System**
   - [ ] Update color tokens
   - [ ] Add shadow system
   - [ ] Update modal backdrop
   - [ ] Test in development

2. **Week 2: Buttons**
   - [ ] Redesign primary button
   - [ ] Enhance secondary button
   - [ ] Modernize pill buttons
   - [ ] Update icon buttons
   - [ ] Create E2E visual tests

3. **Week 3: Components**
   - [ ] Update modals
   - [ ] Enhance toolbars
   - [ ] Update sidebars
   - [ ] Test all interactions

4. **Week 4: Testing & Polish**
   - [ ] Run visual regression tests
   - [ ] Fix any issues
   - [ ] Accessibility audit
   - [ ] Performance validation
   - [ ] Documentation updates

## Quality Assurance Checklist

- [ ] All buttons have hover states
- [ ] All buttons have active/pressed states
- [ ] All buttons have focus-visible outlines
- [ ] Modal backdrop is softer (30% opacity max)
- [ ] All color contrasts meet WCAG AA (4.5:1)
- [ ] Shadow depths are consistent
- [ ] Components work in dark mode
- [ ] Mobile responsive design maintained
- [ ] No performance regression (CSS not overly complex)
- [ ] All E2E tests pass
- [ ] All visual regression tests pass
- [ ] Accessibility tests pass

## Migration Path for Existing Code

When these CSS changes are deployed:
1. No breaking HTML changes required
2. All existing class names remain the same
3. Backwards compatible - old styles still work
4. Gradual rollout possible (can test in dev first)

## Documentation Updates Needed

1. Update `docs/user/` with new visual appearance
2. Update contribution guide with CSS standards
3. Create CSS guidelines document
4. Add accessibility standards document

## Success Metrics

1. ✅ All buttons have modern, consistent styling
2. ✅ Modal overlays are less harsh
3. ✅ Components have clear visual hierarchy via shadows
4. ✅ 100% WCAG AA contrast compliance
5. ✅ All UI tests pass
6. ✅ Zero visual regressions reported
7. ✅ Positive user feedback on modernization

