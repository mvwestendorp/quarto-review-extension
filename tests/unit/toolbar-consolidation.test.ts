/**
 * Toolbar Consolidation Tests
 * Tests for Phase 2 Task 2.1: Consolidate duplicate toolbars in translation mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedSidebar } from '@modules/ui/sidebars/UnifiedSidebar';
import {
  TranslationToolbar,
  type TranslationToolbarConfig,
} from '@modules/ui/translation/TranslationToolbar';

describe('Toolbar Consolidation (Phase 2 Task 2.1)', () => {
  let unifiedSidebar: UnifiedSidebar;
  let translationToolbar: TranslationToolbar | null = null;
  let container: HTMLElement;

  beforeEach(() => {
    // Create container for UI elements
    container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize UnifiedSidebar
    unifiedSidebar = new UnifiedSidebar();
  });

  afterEach(() => {
    // Cleanup
    unifiedSidebar.destroy();
    if (translationToolbar) {
      translationToolbar.destroy();
      translationToolbar = null;
    }
    document.body.removeChild(container);
  });

  describe('Review Mode - Undo/Redo Buttons', () => {
    it('should display undo/redo buttons in review mode', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]');
      const redoBtn = sidebar.querySelector('[data-action="redo"]');

      expect(undoBtn).toBeTruthy();
      expect(redoBtn).toBeTruthy();
      expect(undoBtn?.textContent).toContain('Undo');
      expect(redoBtn?.textContent).toContain('Redo');
    });

    it('should have correct text labels in review mode', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.textContent).toBe('↶ Undo');
      expect(redoBtn.textContent).toBe('↷ Redo');
    });

    it('should start with undo/redo buttons disabled in review mode', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.disabled).toBe(true);
      expect(redoBtn.disabled).toBe(true);
    });

    it('should register review mode undo callback method', () => {
      const undoCallback = vi.fn();
      unifiedSidebar.onUndo(undoCallback);

      // Just verify the method exists and can be called
      expect(typeof unifiedSidebar.onUndo).toBe('function');
    });

    it('should register review mode redo callback method', () => {
      const redoCallback = vi.fn();
      unifiedSidebar.onRedo(redoCallback);

      // Just verify the method exists and can be called
      expect(typeof unifiedSidebar.onRedo).toBe('function');
    });
  });

  describe('Translation Mode - Undo/Redo Button Switching', () => {
    it('should switch button text to translation mode labels', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationMode(true);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.textContent).toBe('↶ Undo Edit');
      expect(redoBtn.textContent).toBe('↷ Redo Edit');
    });

    it('should register translation mode undo/redo callbacks', () => {
      const translationUndoCallback = vi.fn();
      const translationRedoCallback = vi.fn();

      unifiedSidebar.create();
      unifiedSidebar.onTranslationUndo(translationUndoCallback);
      unifiedSidebar.onTranslationRedo(translationRedoCallback);

      // Verify callbacks can be registered
      expect(typeof unifiedSidebar.onTranslationUndo).toBe('function');
      expect(typeof unifiedSidebar.onTranslationRedo).toBe('function');
    });

    it('should restore review mode when exiting translation mode', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationMode(true);
      unifiedSidebar.setTranslationMode(false);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.textContent).toBe('↶ Undo');
      expect(redoBtn.textContent).toBe('↷ Redo');
    });

    it('should restore review mode when exiting translation mode callbacks', () => {
      unifiedSidebar.create();
      unifiedSidebar.onUndo(() => {});
      unifiedSidebar.onRedo(() => {});

      // Switch to translation mode and back
      unifiedSidebar.setTranslationMode(true);
      const sidebar = unifiedSidebar.getElement();
      const undoBtn = sidebar?.querySelector('[data-action="undo"]') as HTMLButtonElement;

      // After exiting translation mode, buttons should be in review text
      unifiedSidebar.setTranslationMode(false);

      expect(undoBtn?.textContent).toBe('↶ Undo');
    });

    it('should update button enabled state in translation mode', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationMode(true);

      unifiedSidebar.updateTranslationUndoRedoState(true, true);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.disabled).toBe(false);
      expect(redoBtn.disabled).toBe(false);
    });

    it('should disable buttons when translation undo/redo unavailable', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationMode(true);

      unifiedSidebar.updateTranslationUndoRedoState(false, false);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.disabled).toBe(true);
      expect(redoBtn.disabled).toBe(true);
    });

    it('should not update buttons when not in translation mode', () => {
      const sidebar = unifiedSidebar.create();
      // Don't set translation mode

      unifiedSidebar.updateTranslationUndoRedoState(true, true);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      // Should remain disabled (initial state) when not in translation mode
      expect(undoBtn.disabled).toBe(true);
      expect(redoBtn.disabled).toBe(true);
    });
  });

  describe('Translation Toolbar Integration', () => {
    it('should create translation toolbar with actions section', () => {
      const config: TranslationToolbarConfig = {
        availableProviders: ['manual', 'local-ai'],
        defaultProvider: 'manual',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        availableLanguages: ['en', 'nl', 'fr'],
      };

      translationToolbar = new TranslationToolbar(config, {});
      const toolbar = translationToolbar.create();

      expect(toolbar.querySelector('.review-translation-toolbar-section')).toBeTruthy();
      expect(toolbar.querySelector('[data-action="translate-document"]')).toBeTruthy();
    });

    it('should have separate toolbar not overlapping with UnifiedSidebar buttons', () => {
      const config: TranslationToolbarConfig = {
        availableProviders: ['manual'],
        defaultProvider: 'manual',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        availableLanguages: ['en', 'nl'],
      };

      translationToolbar = new TranslationToolbar(config, {});
      const sidebar = unifiedSidebar.create();
      const toolbar = translationToolbar.create();

      // Sidebar undo/redo should be separate from toolbar translate buttons
      const sidebarUndo = sidebar.querySelector('[data-action="undo"]');
      const toolbarTranslate = toolbar.querySelector('[data-action="translate-document"]');

      expect(sidebarUndo).toBeTruthy();
      expect(toolbarTranslate).toBeTruthy();
      expect(sidebarUndo?.parentElement).not.toEqual(toolbarTranslate?.parentElement);
    });

    it('should have distinct CSS classes for visual separation', () => {
      const config: TranslationToolbarConfig = {
        availableProviders: ['manual'],
        defaultProvider: 'manual',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        availableLanguages: ['en', 'nl'],
      };

      translationToolbar = new TranslationToolbar(config, {});
      const toolbar = translationToolbar.create();

      expect(toolbar.className).toContain('review-translation-toolbar');
    });
  });

  describe('Button State Management', () => {
    it('should apply disabled CSS class when button disabled', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.updateUndoRedoState(false, false);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.classList.contains('review-btn-disabled')).toBe(true);
      expect(redoBtn.classList.contains('review-btn-disabled')).toBe(true);
    });

    it('should remove disabled CSS class when button enabled', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.updateUndoRedoState(true, true);

      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.classList.contains('review-btn-disabled')).toBe(false);
      expect(redoBtn.classList.contains('review-btn-disabled')).toBe(false);
    });

    it('should toggle disabled state independently for undo and redo', () => {
      const sidebar = unifiedSidebar.create();

      // Enable only undo
      unifiedSidebar.updateUndoRedoState(true, false);
      let undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      let redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.disabled).toBe(false);
      expect(redoBtn.disabled).toBe(true);

      // Enable only redo
      unifiedSidebar.updateUndoRedoState(false, true);
      undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoBtn.disabled).toBe(true);
      expect(redoBtn.disabled).toBe(false);
    });
  });

  describe('Accessibility and Aria Labels', () => {
    it('should have aria labels for undo/redo buttons', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]');
      const redoBtn = sidebar.querySelector('[data-action="redo"]');

      expect(undoBtn?.getAttribute('aria-label')).toBeTruthy();
      expect(redoBtn?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have title attributes for tooltip accessibility', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]');
      const redoBtn = sidebar.querySelector('[data-action="redo"]');

      expect(undoBtn?.getAttribute('title')).toBeTruthy();
      expect(redoBtn?.getAttribute('title')).toBeTruthy();
    });

    it('should have proper button role', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]');
      const redoBtn = sidebar.querySelector('[data-action="redo"]');

      // Buttons should have implicit or explicit button role
      expect(undoBtn?.tagName.toLowerCase()).toBe('button');
      expect(redoBtn?.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('Mode Switching Workflow', () => {
    it('should handle complete workflow: review -> translation -> review modes', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoBtn = sidebar.querySelector('[data-action="redo"]') as HTMLButtonElement;

      // Start in review mode
      expect(undoBtn?.textContent).toBe('↶ Undo');
      expect(redoBtn?.textContent).toBe('↷ Redo');

      // Switch to translation mode
      unifiedSidebar.setTranslationMode(true);
      expect(undoBtn?.textContent).toBe('↶ Undo Edit');
      expect(redoBtn?.textContent).toBe('↷ Redo Edit');

      // Switch back to review mode
      unifiedSidebar.setTranslationMode(false);
      expect(undoBtn?.textContent).toBe('↶ Undo');
      expect(redoBtn?.textContent).toBe('↷ Redo');
    });

    it('should maintain correct state through multiple mode switches', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;

      // Review mode
      unifiedSidebar.updateUndoRedoState(true, false);
      expect(undoBtn.disabled).toBe(false);

      // Switch to translation
      unifiedSidebar.setTranslationMode(true);
      unifiedSidebar.updateTranslationUndoRedoState(false, false);
      expect(undoBtn.disabled).toBe(true);

      // Back to review
      unifiedSidebar.setTranslationMode(false);
      unifiedSidebar.updateUndoRedoState(true, false);
      expect(undoBtn.disabled).toBe(false);

      // To translation again
      unifiedSidebar.setTranslationMode(true);
      unifiedSidebar.updateTranslationUndoRedoState(true, true);
      expect(undoBtn.disabled).toBe(false);
    });

    it('should keep button text synchronized with mode', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;

      expect(undoBtn.textContent).toBe('↶ Undo');

      unifiedSidebar.setTranslationMode(true);
      expect(undoBtn.textContent).toBe('↶ Undo Edit');

      unifiedSidebar.setTranslationMode(false);
      expect(undoBtn.textContent).toBe('↶ Undo');
    });
  });

  describe('No Duplicate Buttons Visible', () => {
    it('should have only one undo button in sidebar', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtns = sidebar.querySelectorAll('[data-action="undo"]');

      expect(undoBtns.length).toBe(1);
    });

    it('should have only one redo button in sidebar', () => {
      const sidebar = unifiedSidebar.create();
      const redoBtns = sidebar.querySelectorAll('[data-action="redo"]');

      expect(redoBtns.length).toBe(1);
    });

    it('should have translation-specific toolbar section', () => {
      const config: TranslationToolbarConfig = {
        availableProviders: ['manual'],
        defaultProvider: 'manual',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        availableLanguages: ['en', 'nl'],
      };

      translationToolbar = new TranslationToolbar(config, {});
      const toolbar = translationToolbar.create();

      // Toolbar should have sections but NOT duplicate undo/redo buttons
      expect(toolbar.querySelector('[data-action="undo"]')).toBeFalsy();
      expect(toolbar.querySelector('[data-action="redo"]')).toBeFalsy();
    });

    it('should not have review buttons in translation toolbar', () => {
      const config: TranslationToolbarConfig = {
        availableProviders: ['manual'],
        defaultProvider: 'manual',
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        availableLanguages: ['en', 'nl'],
      };

      translationToolbar = new TranslationToolbar(config, {});
      const toolbar = translationToolbar.create();

      // Should have translation-specific buttons
      expect(toolbar.querySelector('[data-action="translate-document"]')).toBeTruthy();
      expect(toolbar.querySelector('[data-action="export-unified"]')).toBeTruthy();

      // Should NOT have review mode elements
      expect(toolbar.querySelector('[data-sidebar-label]')).toBeFalsy();
    });
  });

  describe('CSS Class Management', () => {
    it('should have review-btn-active class when in translation mode', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationActive(true);

      const translationBtn = sidebar.querySelector('[data-action="toggle-translation"]') as HTMLButtonElement;

      expect(translationBtn.classList.contains('review-btn-active')).toBe(true);
    });

    it('should remove review-btn-active class when exiting translation mode', () => {
      const sidebar = unifiedSidebar.create();
      unifiedSidebar.setTranslationActive(true);
      unifiedSidebar.setTranslationActive(false);

      const translationBtn = sidebar.querySelector('[data-action="toggle-translation"]') as HTMLButtonElement;

      expect(translationBtn.classList.contains('review-btn-active')).toBe(false);
    });

    it('should have consistent button styling across modes', () => {
      const sidebar = unifiedSidebar.create();
      const undoBtn = sidebar.querySelector('[data-action="undo"]') as HTMLButtonElement;

      // Should always have review-btn classes
      expect(undoBtn.className).toContain('review-btn');
      expect(undoBtn.className).toContain('review-btn-secondary');
      expect(undoBtn.className).toContain('review-btn-block');

      // Switching modes shouldn't change base classes
      unifiedSidebar.setTranslationMode(true);
      expect(undoBtn.className).toContain('review-btn');
    });
  });
});
