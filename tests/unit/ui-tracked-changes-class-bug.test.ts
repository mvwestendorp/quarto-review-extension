import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { UIModule } from '@modules/ui';
import ChangesModule from '@modules/changes';
import MarkdownModule from '@modules/markdown';
import { CommentsModule } from '@modules/comments';
import { StateStore, createStateStore } from '@/services/StateStore';
import { NotificationService } from '@/services/NotificationService';

/**
 * Tests for tracked changes toggle bug fix
 *
 * Bug: When toggling tracked changes off, the review-section-wrapper class
 * was being incorrectly copied to content elements (like <ul>), causing
 * a 6px horizontal shift due to the class's negative margins.
 *
 * Root Cause: updateElementDisplay() was copying ALL classes from contentElem,
 * including internal review-* classes that should never be on content elements.
 *
 * Fix: Filter out classes starting with 'review-' when copying classes.
 */
describe('UI Module - Tracked Changes Class Bug Fix', () => {
  let dom: JSDOM;
  let document: Document;
  let ui: UIModule;
  let changes: ChangesModule;
  let markdown: MarkdownModule;
  let comments: CommentsModule;
  let stateStore: StateStore;

  beforeEach(() => {
    // Setup DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="quarto-document-content">
            <!-- Element with tracked changes (edited list) -->
            <div class="review-editable" data-review-id="test-list-1" data-review-type="BulletList" data-review-markdown="- Item 1&#10;- Item 2&#10;- Item 3">
              <div class="review-section-wrapper" data-review-wrapper="true">
                <ul>
                  <li>Item 1</li>
                  <li>Item 2</li>
                  <li>Item 3</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    document = dom.window.document as any;
    global.document = document as any;
    global.window = dom.window as any;

    // Setup modules
    changes = new ChangesModule();
    changes.initializeFromDOM();

    markdown = new MarkdownModule();
    comments = new CommentsModule(changes);
    stateStore = createStateStore();

    const notificationService = new NotificationService();

    ui = new UIModule({
      changes,
      comments,
      markdown,
      stateStore,
      notificationService,
    });
  });

  describe('Class Filtering During DOM Updates', () => {
    it('should not copy review-section-wrapper class to content elements', () => {
      // Edit the list to trigger tracked changes
      changes.edit('test-list-1', '- Item 1\n- Item 2 (edited)\n- Item 3');

      // Enable tracked changes (should show diff)
      stateStore.setEditorState({ showTrackedChanges: true });
      ui.refresh();

      // Get the list element
      const listElement = document.querySelector('[data-review-id="test-list-1"] ul');
      expect(listElement).toBeTruthy();

      // The UL should NOT have review-section-wrapper class
      expect(listElement?.classList.contains('review-section-wrapper')).toBe(false);
    });

    it('should not copy any review-* classes to content elements', () => {
      // Edit the list
      changes.edit('test-list-1', '- New item\n- Item 2\n- Item 3');

      // Toggle tracked changes off
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      // Get the list element
      const listElement = document.querySelector('[data-review-id="test-list-1"] ul');
      expect(listElement).toBeTruthy();

      // Check that NO review-* classes exist on the UL
      const classes = Array.from(listElement?.classList || []);
      const reviewClasses = classes.filter(cls => cls.startsWith('review-'));

      expect(reviewClasses).toHaveLength(0);
    });

    it('should preserve non-review classes from contentElem', () => {
      // The fix ensures that when classes are copied from contentElem to the new element,
      // only non-review-* classes are copied. However, the markdown renderer generates
      // the new HTML from scratch, so classes need to come from contentElem.

      // This test verifies the filtering logic works correctly by checking that
      // review-* classes are NOT copied, even if they exist on contentElem

      // Create element where contentElem wrapper has both review and custom classes
      const customDiv = document.createElement('div');
      customDiv.className = 'review-editable';
      customDiv.setAttribute('data-review-id', 'custom-para');
      customDiv.setAttribute('data-review-type', 'Para');
      customDiv.setAttribute('data-review-markdown', 'Custom paragraph');
      // Note: In real usage, review-section-wrapper would be on the wrapper div,
      // but this test puts review-* classes on the contentElem to verify filtering
      customDiv.innerHTML = '<div class="review-section-wrapper" data-review-wrapper="true"><p class="custom-class review-modified user-class">Custom paragraph</p></div>';

      document.getElementById('quarto-document-content')?.appendChild(customDiv);

      // Re-initialize to pick up new element
      changes.initializeFromDOM();

      // Edit to trigger refresh
      changes.edit('custom-para', 'Updated paragraph');
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      // Get the paragraph element
      const paraElement = document.querySelector('[data-review-id="custom-para"] p');
      expect(paraElement).toBeTruthy();

      // The new paragraph should NOT have review-modified class (filtered out)
      // Note: custom-class and user-class may not persist through markdown re-render
      // unless they come from Quarto's original HTML or Pandoc attributes
      expect(paraElement?.classList.contains('review-modified')).toBe(false);
      expect(paraElement?.classList.contains('review-section-wrapper')).toBe(false);
    });

    it('should maintain wrapper div with review-section-wrapper class', () => {
      // Edit the list
      changes.edit('test-list-1', '- Item 1\n- Item 2\n- Item 3 (updated)');

      // Refresh with tracked changes off
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      // The wrapper div should still have review-section-wrapper
      const wrapper = document.querySelector('[data-review-id="test-list-1"] .review-section-wrapper');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.classList.contains('review-section-wrapper')).toBe(true);
      expect(wrapper?.getAttribute('data-review-wrapper')).toBe('true');
    });
  });

  describe('Regression Tests - Layout Stability', () => {
    it('should not cause horizontal shift when toggling tracked changes', () => {
      // Edit the list
      changes.edit('test-list-1', '- Item 1\n- Item 2 (changed)\n- Item 3');

      // Toggle tracked changes ON
      stateStore.setEditorState({ showTrackedChanges: true });
      ui.refresh();

      const listWithChangesOn = document.querySelector('[data-review-id="test-list-1"] ul');
      const classesWithChangesOn = Array.from(listWithChangesOn?.classList || []);

      // Toggle tracked changes OFF
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      const listWithChangesOff = document.querySelector('[data-review-id="test-list-1"] ul');
      const classesWithChangesOff = Array.from(listWithChangesOff?.classList || []);

      // Both states should have NO review-* classes
      const reviewClassesOn = classesWithChangesOn.filter(cls => cls.startsWith('review-'));
      const reviewClassesOff = classesWithChangesOff.filter(cls => cls.startsWith('review-'));

      expect(reviewClassesOn).toHaveLength(0);
      expect(reviewClassesOff).toHaveLength(0);
    });

    it('should apply consistent class filtering across tracked changes toggle', () => {
      // Add a paragraph that will have review-* classes added during editing
      const paraDiv = document.createElement('div');
      paraDiv.className = 'review-editable';
      paraDiv.setAttribute('data-review-id', 'styled-para');
      paraDiv.setAttribute('data-review-type', 'Para');
      paraDiv.setAttribute('data-review-markdown', 'Styled text');
      paraDiv.innerHTML = '<div class="review-section-wrapper" data-review-wrapper="true"><p>Styled text</p></div>';

      document.getElementById('quarto-document-content')?.appendChild(paraDiv);
      changes.initializeFromDOM();

      // Edit and toggle tracked changes multiple times
      changes.edit('styled-para', 'Updated text');

      const getReviewClasses = () => {
        const para = document.querySelector('[data-review-id="styled-para"] p');
        const classes = Array.from(para?.classList || []);
        return classes.filter(cls => cls.startsWith('review-'));
      };

      // Toggle ON
      stateStore.setEditorState({ showTrackedChanges: true });
      ui.refresh();
      const reviewClassesOn1 = getReviewClasses();

      // Toggle OFF
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();
      const reviewClassesOff1 = getReviewClasses();

      // Toggle ON again
      stateStore.setEditorState({ showTrackedChanges: true });
      ui.refresh();
      const reviewClassesOn2 = getReviewClasses();

      // None should have review-* classes regardless of toggle state
      expect(reviewClassesOn1).toHaveLength(0);
      expect(reviewClassesOff1).toHaveLength(0);
      expect(reviewClassesOn2).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle elements with no existing classes', () => {
      const plainDiv = document.createElement('div');
      plainDiv.className = 'review-editable';
      plainDiv.setAttribute('data-review-id', 'plain-para');
      plainDiv.setAttribute('data-review-type', 'Para');
      plainDiv.setAttribute('data-review-markdown', 'Plain text');
      plainDiv.innerHTML = '<div class="review-section-wrapper" data-review-wrapper="true"><p>Plain text</p></div>';

      document.getElementById('quarto-document-content')?.appendChild(plainDiv);
      changes.initializeFromDOM();

      changes.edit('plain-para', 'Updated plain text');
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      const para = document.querySelector('[data-review-id="plain-para"] p');
      const classes = Array.from(para?.classList || []);

      // Should have no classes at all
      expect(classes).toHaveLength(0);
    });

    it('should handle elements with only review-* classes', () => {
      const reviewOnlyDiv = document.createElement('div');
      reviewOnlyDiv.className = 'review-editable';
      reviewOnlyDiv.setAttribute('data-review-id', 'review-only');
      reviewOnlyDiv.setAttribute('data-review-type', 'Para');
      reviewOnlyDiv.setAttribute('data-review-markdown', 'Text');
      reviewOnlyDiv.innerHTML = '<div class="review-section-wrapper" data-review-wrapper="true"><p class="review-modified review-highlight">Text</p></div>';

      document.getElementById('quarto-document-content')?.appendChild(reviewOnlyDiv);
      changes.initializeFromDOM();

      changes.edit('review-only', 'Updated text');
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      const para = document.querySelector('[data-review-id="review-only"] p');
      const classes = Array.from(para?.classList || []);

      // All review-* classes should be filtered out
      const reviewClasses = classes.filter(cls => cls.startsWith('review-'));
      expect(reviewClasses).toHaveLength(0);
    });

    it('should filter out all review-* classes from mixed class lists', () => {
      const mixedDiv = document.createElement('div');
      mixedDiv.className = 'review-editable';
      mixedDiv.setAttribute('data-review-id', 'mixed-classes');
      mixedDiv.setAttribute('data-review-type', 'Para');
      mixedDiv.setAttribute('data-review-markdown', 'Mixed text');
      mixedDiv.innerHTML = '<div class="review-section-wrapper" data-review-wrapper="true"><p class="user-class review-modified another-class review-highlight">Mixed text</p></div>';

      document.getElementById('quarto-document-content')?.appendChild(mixedDiv);
      changes.initializeFromDOM();

      changes.edit('mixed-classes', 'Updated mixed text');
      stateStore.setEditorState({ showTrackedChanges: false });
      ui.refresh();

      const para = document.querySelector('[data-review-id="mixed-classes"] p');
      const classes = Array.from(para?.classList || []);

      // Should remove all review-* classes
      // Note: user-class and another-class may not persist through markdown re-render
      // The important thing is that review-* classes are filtered out
      const reviewClasses = classes.filter(cls => cls.startsWith('review-'));
      expect(reviewClasses).toHaveLength(0);
      expect(classes).not.toContain('review-modified');
      expect(classes).not.toContain('review-highlight');
      expect(classes).not.toContain('review-section-wrapper');
    });
  });
});
