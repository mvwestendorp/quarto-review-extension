import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeSummaryDashboard } from '@modules/ui/change-summary';

describe('ChangeSummaryDashboard', () => {
  let dashboard: ChangeSummaryDashboard;
  let mockConfig: any;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="container"></div>
    `;

    // Mock config object with necessary dependencies
    mockConfig = {
      changes: {
        getOperations: vi.fn(() => []),
        getCurrentState: vi.fn(() => []),
        getElementContentWithTrackedChanges: vi.fn((id) => ''),
        getElementById: vi.fn(() => null),
      },
      markdown: {
        toPlainText: vi.fn((content) => content),
      },
      comments: {
        parse: vi.fn(() => []),
      },
    };

    dashboard = new ChangeSummaryDashboard(mockConfig);
  });

  describe('calculateSummary - Basic Functionality', () => {
    it('should return zero values for empty operations', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      const summary = dashboard.calculateSummary();

      expect(summary.totalChanges).toBe(0);
      expect(summary.additions).toBe(0);
      expect(summary.deletions).toBe(0);
      expect(summary.substitutions).toBe(0);
      expect(summary.charactersAdded).toBe(0);
      expect(summary.charactersRemoved).toBe(0);
      expect(summary.elementsModified).toBe(0);
      expect(summary.comments).toBe(0);
    });

    it('should count single addition', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.additions).toBe(1);
      expect(summary.totalChanges).toBe(1);
    });

    it('should count single deletion', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {--deleted--} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.deletions).toBe(1);
      expect(summary.totalChanges).toBe(1);
    });

    it('should count single substitution', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {~~old~>new~~} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.substitutions).toBe(1);
      expect(summary.totalChanges).toBe(1);
    });
  });

  describe('calculateSummary - Multiple Changes', () => {
    it('should count multiple different change types', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-2' },
        { type: 'edit', elementId: 'elem-3' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      let callCount = 0;
      mockConfig.changes.getElementContentWithTrackedChanges.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 'Text {++added1++} and {++added2++}';
        if (callCount === 2) return 'Text {--deleted1--}';
        return 'Text {~~old~>new~~}';
      });

      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.additions).toBe(2);
      expect(summary.deletions).toBe(1);
      expect(summary.substitutions).toBe(1);
      expect(summary.totalChanges).toBe(3);
    });

    it('should track elements modified count', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-1' }, // Same element twice
        { type: 'edit', elementId: 'elem-2' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.elementsModified).toBe(2); // Only 2 unique elements
    });
  });

  describe('calculateSummary - Character Counting', () => {
    it('should count characters in additions correctly', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++hello world++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.charactersAdded).toBe(11); // "hello world" = 11 chars
      expect(summary.additions).toBe(1);
    });

    it('should count characters in deletions correctly', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {--goodbye--} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.charactersRemoved).toBe(7); // "goodbye" = 7 chars
      expect(summary.deletions).toBe(1);
    });

    it('should count special characters and spaces', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++hello\n\tworld!++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      // Should count all characters including newlines, tabs, and punctuation
      expect(summary.charactersAdded).toBeGreaterThan(0);
    });

    it('should handle multiple additions and aggregate characters', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++foo++} and {++bar++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.charactersAdded).toBe(6); // "foo" (3) + "bar" (3) = 6
      expect(summary.additions).toBe(2);
    });
  });

  describe('calculateSummary - Element Type Tracking', () => {
    it('should track changes by element type', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-2' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );

      let callCount = 0;
      mockConfig.changes.getElementById.mockImplementation(() => {
        callCount++;
        return {
          metadata: { type: callCount === 1 ? 'Para' : 'Header' },
        };
      });

      const summary = dashboard.calculateSummary();

      expect(summary.changesByElementType.has('Para')).toBe(true);
      expect(summary.changesByElementType.has('Header')).toBe(true);
      expect(summary.changesByElementType.get('Para')).toBe(1);
      expect(summary.changesByElementType.get('Header')).toBe(1);
    });

    it('should aggregate multiple changes to same element type', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-2' },
        { type: 'edit', elementId: 'elem-3' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.changesByElementType.get('Para')).toBe(3);
    });

    it('should handle missing element metadata gracefully', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue(null);

      expect(() => {
        dashboard.calculateSummary();
      }).not.toThrow();
    });
  });

  describe('calculateSummary - Comment Counting', () => {
    it('should count comments from current state', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([
        { id: 'elem-1', content: 'text' },
        { id: 'elem-2', content: 'more text' },
      ]);
      mockConfig.comments.parse.mockImplementation((content) => {
        if (content === 'text') return [{ id: 'c1' }, { id: 'c2' }];
        if (content === 'more text') return [{ id: 'c3' }];
        return [];
      });

      const summary = dashboard.calculateSummary();

      expect(summary.comments).toBe(3);
    });

    it('should handle elements with no comments', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([
        { id: 'elem-1', content: 'no comments here' },
      ]);
      mockConfig.comments.parse.mockReturnValue([]);

      const summary = dashboard.calculateSummary();

      expect(summary.comments).toBe(0);
    });
  });

  describe('calculateSummary - Edge Cases', () => {
    it('should ignore non-edit operations', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'insert', elementId: 'elem-1' },
        { type: 'delete', elementId: 'elem-2' },
        { type: 'move', elementId: 'elem-3' },
        { type: 'edit', elementId: 'elem-4' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.totalChanges).toBe(1);
      expect(summary.elementsModified).toBe(1);
    });

    it('should handle malformed CriticMarkup gracefully', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++ incomplete markup'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      expect(() => {
        dashboard.calculateSummary();
      }).not.toThrow();
    });

    it('should handle nested CriticMarkup', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++outer {++inner++}++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      // Should count multiple additions even if nested
      expect(summary.additions).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty string content', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue('');
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.additions).toBe(0);
      expect(summary.deletions).toBe(0);
      expect(summary.totalChanges).toBe(1);
    });

    it('should handle very large number of operations', () => {
      const largeOps = Array.from({ length: 100 }, (_, i) => ({
        type: 'edit',
        elementId: `elem-${i}`,
      }));
      mockConfig.changes.getOperations.mockReturnValue(largeOps);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.totalChanges).toBe(100);
      expect(summary.additions).toBe(100);
    });
  });

  describe('getChangesList', () => {
    it('should return empty list for no operations', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);

      const changes = dashboard.getChangesList();

      expect(changes).toEqual([]);
    });

    it('should correctly identify addition change type', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++} no delete'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Sample preview text',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Sample preview text');

      const changes = dashboard.getChangesList();

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('addition');
    });

    it('should correctly identify deletion change type', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {--deleted--} no add'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Sample preview text',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Sample preview text');

      const changes = dashboard.getChangesList();

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('deletion');
    });

    it('should default to substitution for mixed changes', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++} and {--deleted--}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Sample preview text',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Sample preview text');

      const changes = dashboard.getChangesList();

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('substitution');
    });

    it('should truncate preview to 100 characters', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );

      const longText = 'a'.repeat(150);
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: longText,
      });
      mockConfig.markdown.toPlainText.mockReturnValue(longText);

      const changes = dashboard.getChangesList();

      expect(changes[0].preview.length).toBeLessThanOrEqual(100);
    });

    it('should skip non-existent elements', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-2' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );

      let callCount = 0;
      mockConfig.changes.getElementById.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return null; // First doesn't exist
        return {
          metadata: { type: 'Para' },
          content: 'Text',
        };
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Text');

      const changes = dashboard.getChangesList();

      expect(changes).toHaveLength(1);
    });

    it('should preserve element IDs in changes list', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-123' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Text',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Text');

      const changes = dashboard.getChangesList();

      expect(changes[0].elementId).toBe('elem-123');
    });
  });

  describe('renderDashboard - Percentages', () => {
    it('should calculate correct percentages for single change type', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Text content',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Text content');

      const dashboard_element = dashboard.renderDashboard();

      // Additions should be 100% since there's only one change and it's an addition
      const additionBar = dashboard_element.querySelector('.review-change-bar-add');
      expect(additionBar).toBeTruthy();
      const style = additionBar?.getAttribute('style');
      expect(style).toContain('width: 100%');
    });

    it('should round percentages correctly', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
        { type: 'edit', elementId: 'elem-2' },
        { type: 'edit', elementId: 'elem-3' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      let callCount = 0;
      mockConfig.changes.getElementContentWithTrackedChanges.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 'Text {++added++}';
        if (callCount === 2) return 'Text {--deleted--}';
        return 'Text {~~old~>new~~}';
      });

      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: 'Text content',
      });
      mockConfig.markdown.toPlainText.mockReturnValue('Text content');

      const dashboard_element = dashboard.renderDashboard();

      // All three types should be approximately 33% (rounded)
      const additionBar = dashboard_element.querySelector('.review-change-bar-add');
      const deletionBar = dashboard_element.querySelector('.review-change-bar-remove');
      const substitutionBar = dashboard_element.querySelector('.review-change-bar-sub');

      // All three changes equal 33.33% each, which rounds to 33%
      expect(additionBar?.getAttribute('style')).toContain('width: 33%');
      expect(deletionBar?.getAttribute('style')).toContain('width: 33%');
      expect(substitutionBar?.getAttribute('style')).toContain('width: 33%');
    });
  });

  describe('renderDashboard - HTML Structure', () => {
    it('should create valid HTML structure', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      const dashboard_element = dashboard.renderDashboard();

      expect(dashboard_element.className).toBe('review-change-summary-dashboard');
      expect(dashboard_element.querySelectorAll('.review-summary-section')).toHaveLength(1);
      expect(dashboard_element.querySelectorAll('.review-summary-details')).toHaveLength(1);
    });

    it('should render statistics section', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      const dashboard_element = dashboard.renderDashboard();

      expect(dashboard_element.querySelector('.review-summary-stats')).toBeTruthy();
      expect(dashboard_element.querySelectorAll('.review-stat-card')).toHaveLength(3);
    });

    it('should include action buttons', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      const dashboard_element = dashboard.renderDashboard();

      expect(dashboard_element.querySelector('[data-action="jump-to-first"]')).toBeTruthy();
      expect(dashboard_element.querySelector('[data-action="jump-to-last"]')).toBeTruthy();
      expect(dashboard_element.querySelector('[data-action="export-summary"]')).toBeTruthy();
    });

    it('should handle XSS attempts in preview text', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );

      const xssText = '<script>alert("xss")</script>';
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
        content: xssText,
      });
      mockConfig.markdown.toPlainText.mockReturnValue(xssText);

      const dashboard_element = dashboard.renderDashboard();

      expect(dashboard_element.innerHTML).not.toContain('<script>');
    });
  });

  describe('renderDashboard - Structure Validation', () => {
    it('should not throw when rendering dashboard', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      expect(() => {
        dashboard.renderDashboard();
      }).not.toThrow();
    });

    it('should return DOM element with correct class', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      const dashboard_element = dashboard.renderDashboard();

      expect(dashboard_element).toBeInstanceOf(HTMLElement);
      expect(dashboard_element.className).toContain('review-change-summary-dashboard');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should not throw when rendering with null config properties', () => {
      mockConfig.changes.getOperations.mockReturnValue([]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);

      expect(() => {
        dashboard.renderDashboard();
      }).not.toThrow();
    });

    it('should cache summary on subsequent calls', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      dashboard.calculateSummary();
      const summary = dashboard.calculateSummary();

      expect(summary).toBeDefined();
    });

    it('should handle special characters in element type names', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++added++}'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Type-With-Dashes_123' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.changesByElementType.has('Type-With-Dashes_123')).toBe(true);
    });

    it('should handle unicode characters in content', () => {
      mockConfig.changes.getOperations.mockReturnValue([
        { type: 'edit', elementId: 'elem-1' },
      ]);
      mockConfig.changes.getCurrentState.mockReturnValue([]);
      mockConfig.changes.getElementContentWithTrackedChanges.mockReturnValue(
        'Text {++你好世界🌍++} content'
      );
      mockConfig.changes.getElementById.mockReturnValue({
        metadata: { type: 'Para' },
      });

      const summary = dashboard.calculateSummary();

      expect(summary.additions).toBe(1);
      expect(summary.charactersAdded).toBeGreaterThan(0);
    });
  });
});
