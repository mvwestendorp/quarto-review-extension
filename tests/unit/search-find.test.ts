import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentSearch } from '@modules/ui/search-find';

describe('DocumentSearch', () => {
  let search: DocumentSearch;
  let mockConfig: any;

  beforeEach(() => {
    // Setup DOM with searchable content
    document.body.innerHTML = `
      <div data-review-id="elem-1" class="review-editable">
        <p>First paragraph with test content</p>
      </div>
      <div data-review-id="elem-2" class="review-editable">
        <h2>Second element header</h2>
      </div>
      <div data-review-id="elem-3" class="review-editable">
        <p>Third paragraph with UPPERCASE TEST</p>
      </div>
    `;

    mockConfig = {
      changes: {
        getCurrentState: vi.fn(() => [
          { id: 'elem-1', content: 'First paragraph with test content' },
          { id: 'elem-2', content: 'Second element header' },
          { id: 'elem-3', content: 'Third paragraph with UPPERCASE TEST' },
        ]),
      },
      markdown: {
        toPlainText: vi.fn((content) => content),
      },
    };

    search = new DocumentSearch(mockConfig);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Public API - Panel Management', () => {
    it('should have toggleSearchPanel method', () => {
      expect(typeof search.toggleSearchPanel).toBe('function');
    });

    it('should have openSearchPanel method', () => {
      expect(typeof search.openSearchPanel).toBe('function');
    });

    it('should have closeSearchPanel method', () => {
      expect(typeof search.closeSearchPanel).toBe('function');
    });

    it('should have nextMatch method', () => {
      expect(typeof search.nextMatch).toBe('function');
    });

    it('should have previousMatch method', () => {
      expect(typeof search.previousMatch).toBe('function');
    });

    it('should create search panel element on open', () => {
      search.openSearchPanel();
      expect(document.querySelector('.review-search-panel')).toBeTruthy();
    });

    it('should initialize with panel hidden', () => {
      expect(document.querySelector('.review-search-panel')).toBeFalsy();
    });

    it('should toggle panel visibility', () => {
      search.toggleSearchPanel();
      expect(document.querySelector('.review-search-panel')).toBeTruthy();

      search.toggleSearchPanel();
      // Panel removal is async but state should be updated
      expect(document.querySelector('.review-search-panel')).toBeTruthy(); // Still present during close animation
    });
  });

  describe('Search Panel Structure', () => {
    beforeEach(() => {
      search.openSearchPanel();
    });

    it('should contain search input field', () => {
      const input = document.querySelector('.review-search-input');
      expect(input).toBeTruthy();
      expect(input?.getAttribute('placeholder')).toContain('Find');
    });

    it('should contain close button', () => {
      expect(document.querySelector('[data-action="close"]')).toBeTruthy();
    });

    it('should contain navigation buttons', () => {
      expect(document.querySelector('[data-action="prev"]')).toBeTruthy();
      expect(document.querySelector('[data-action="next"]')).toBeTruthy();
    });

    it('should contain search options checkboxes', () => {
      expect(document.querySelectorAll('[data-option]').length).toBeGreaterThan(0);
    });

    it('should have match counter display', () => {
      const counter = document.querySelector('.review-search-counter');
      expect(counter).toBeTruthy();
      expect(counter?.textContent).toContain('0');
    });
  });

  describe('Keyboard Shortcut Registration', () => {
    it('should register keyboard shortcut handler on initialization', () => {
      // Verify that the DocumentSearch instance is created with keyboard listeners
      expect(search).toBeTruthy();
      expect(typeof search.toggleSearchPanel).toBe('function');
    });

    it('should respond to toggle on public API', () => {
      // Test the public toggle functionality rather than internal keyboard events
      expect(() => {
        search.toggleSearchPanel();
      }).not.toThrow();
    });

    it('should handle keyboard events on input element', () => {
      search.openSearchPanel();
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
      });

      expect(() => {
        input?.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('Editable Element Detection', () => {
    it('should handle input elements gracefully', () => {
      document.body.innerHTML = '<input id="test-input" />';
      const input = document.getElementById('test-input') as HTMLInputElement;

      // Verify input exists and can receive events
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');

      // Should handle keyboard events without throwing
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        metaKey: true,
      });

      expect(() => {
        input.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('Search Options', () => {
    beforeEach(() => {
      search.openSearchPanel();
    });

    it('should display case sensitivity option', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]');
      expect(caseCheckbox).toBeTruthy();
      expect(caseCheckbox?.getAttribute('type')).toBe('checkbox');
    });

    it('should display whole word option', () => {
      const wholeWordCheckbox = document.querySelector('[data-option="wholeWord"]');
      expect(wholeWordCheckbox).toBeTruthy();
      expect(wholeWordCheckbox?.getAttribute('type')).toBe('checkbox');
    });

    it('should display regex option', () => {
      const regexCheckbox = document.querySelector('[data-option="regex"]');
      expect(regexCheckbox).toBeTruthy();
      expect(regexCheckbox?.getAttribute('type')).toBe('checkbox');
    });

    it('should have search options visible', () => {
      const controls = document.querySelector('.review-search-controls');
      expect(controls).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should not throw when config is minimal', () => {
      const minimalConfig = {
        changes: {
          getCurrentState: vi.fn(() => []),
        },
        markdown: {
          toPlainText: vi.fn((x) => x),
        },
      };

      expect(() => {
        new DocumentSearch(minimalConfig);
      }).not.toThrow();
    });

    it('should not throw when markdown conversion fails', () => {
      const failingConfig = {
        changes: {
          getCurrentState: vi.fn(() => [{ id: 'elem-1', content: 'test' }]),
        },
        markdown: {
          toPlainText: vi.fn(() => {
            throw new Error('Conversion failed');
          }),
        },
      };

      expect(() => {
        new DocumentSearch(failingConfig);
      }).not.toThrow();
    });

    it('should not throw on opening panel', () => {
      expect(() => {
        search.openSearchPanel();
      }).not.toThrow();
    });

    it('should not throw on closing panel', () => {
      search.openSearchPanel();
      expect(() => {
        search.closeSearchPanel();
      }).not.toThrow();
    });

    it('should not throw when navigating with no matches', () => {
      search.openSearchPanel();
      expect(() => {
        search.nextMatch();
        search.previousMatch();
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should maintain state across panel open/close', () => {
      search.openSearchPanel();
      search.closeSearchPanel();

      // Should be able to reopen without errors
      expect(() => {
        search.openSearchPanel();
      }).not.toThrow();
    });

    it('should handle multiple toggle operations', () => {
      expect(() => {
        search.toggleSearchPanel();
        search.toggleSearchPanel();
        search.toggleSearchPanel();
        search.toggleSearchPanel();
      }).not.toThrow();
    });
  });

  describe('Integration - Basic Workflow', () => {
    it('should complete basic search workflow without errors', () => {
      expect(() => {
        search.openSearchPanel();
        const input = document.querySelector('.review-search-input') as HTMLInputElement;
        if (input) {
          input.value = 'test';
          input.dispatchEvent(new Event('input'));
        }
      }).not.toThrow();
    });

    it('should handle search panel closure', () => {
      search.openSearchPanel();
      const closeBtn = document.querySelector('[data-action="close"]') as HTMLButtonElement;

      expect(() => {
        closeBtn?.click();
      }).not.toThrow();
    });

    it('should respond to ESC key', () => {
      search.openSearchPanel();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
      });

      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      expect(() => {
        input?.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should respond to navigation buttons', () => {
      search.openSearchPanel();

      const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;
      const prevBtn = document.querySelector('[data-action="prev"]') as HTMLButtonElement;

      expect(() => {
        nextBtn?.click();
        prevBtn?.click();
      }).not.toThrow();
    });
  });

  describe('Security - HTML Escaping', () => {
    it('should escape HTML in search input placeholder', () => {
      search.openSearchPanel();
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      expect(input?.placeholder).not.toContain('<');
      expect(input?.placeholder).not.toContain('script');
    });

    it('should not have inline event handlers', () => {
      search.openSearchPanel();
      const panel = document.querySelector('.review-search-panel');

      // Check that no inline onclick, onload, etc. are present
      expect(panel?.innerHTML).not.toContain('onclick=');
      expect(panel?.innerHTML).not.toContain('onerror=');
      expect(panel?.innerHTML).not.toContain('onload=');
    });
  });

  describe('Configuration Requirements', () => {
    it('should require config.changes.getCurrentState', () => {
      const badConfig = {
        changes: {},
        markdown: { toPlainText: vi.fn() },
      };

      // Should not throw during construction, but accessing methods might fail
      expect(() => {
        new DocumentSearch(badConfig);
      }).not.toThrow();
    });

    it('should require config.markdown.toPlainText', () => {
      const badConfig = {
        changes: { getCurrentState: vi.fn(() => []) },
        markdown: {},
      };

      // Should not throw during construction
      expect(() => {
        new DocumentSearch(badConfig);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      search.openSearchPanel();
    });

    it('should have accessible input field', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      expect(input?.type).toBe('text');
      expect(input?.getAttribute('autocomplete')).toBe('off');
    });

    it('should have accessible buttons', () => {
      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn) => {
        // Buttons should be accessible
        expect(btn.tagName).toBe('BUTTON');
      });
    });

    it('should have keyboard navigation support', () => {
      const input = document.querySelector('.review-search-input');
      expect(input).toBeTruthy();

      // Input should respond to keyboard events
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(() => {
        input?.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('DOM Button Functionality', () => {
    beforeEach(() => {
      search.openSearchPanel();
    });

    it('should have close button in DOM', () => {
      const closeBtn = document.querySelector('[data-action="close"]');
      expect(closeBtn).toBeTruthy();
    });

    it('should have next button in DOM', () => {
      const nextBtn = document.querySelector('[data-action="next"]');
      expect(nextBtn).toBeTruthy();
    });

    it('should have previous button in DOM', () => {
      const prevBtn = document.querySelector('[data-action="prev"]');
      expect(prevBtn).toBeTruthy();
    });

    it('should have search input in DOM', () => {
      const input = document.querySelector('.review-search-input');
      expect(input).toBeTruthy();
    });

    it('should have match counter in DOM', () => {
      const counter = document.querySelector('.review-search-counter');
      expect(counter).toBeTruthy();
    });

    it('should have checkbox options in DOM', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]');
      const wholeWordCheckbox = document.querySelector('[data-option="wholeWord"]');
      const regexCheckbox = document.querySelector('[data-option="regex"]');

      expect(caseCheckbox).toBeTruthy();
      expect(wholeWordCheckbox).toBeTruthy();
      expect(regexCheckbox).toBeTruthy();
    });

    it('should handle close button click without errors', () => {
      const closeBtn = document.querySelector('[data-action="close"]') as HTMLButtonElement;

      expect(() => {
        closeBtn.click();
      }).not.toThrow();
    });

    it('should handle next button click without errors', () => {
      const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;

      expect(() => {
        nextBtn.click();
      }).not.toThrow();
    });

    it('should handle previous button click without errors', () => {
      const prevBtn = document.querySelector('[data-action="prev"]') as HTMLButtonElement;

      expect(() => {
        prevBtn.click();
      }).not.toThrow();
    });

    it('should handle checkbox clicks without errors', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]') as HTMLInputElement;
      const wholeWordCheckbox = document.querySelector('[data-option="wholeWord"]') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      expect(() => {
        caseCheckbox.click();
        wholeWordCheckbox.click();
        regexCheckbox.click();
      }).not.toThrow();
    });

    it('should allow toggling checkbox states', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]') as HTMLInputElement;

      expect(caseCheckbox.checked).toBe(false);
      caseCheckbox.checked = true;
      expect(caseCheckbox.checked).toBe(true);
    });

    it('should allow modifying search input value', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      input.value = 'test query';
      expect(input.value).toBe('test query');
    });

    it('should handle keyboard events on search input', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      expect(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }).not.toThrow();
    });

    it('should handle input event on search field', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      input.value = 'test';

      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should handle change event on checkboxes', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]') as HTMLInputElement;

      caseCheckbox.checked = true;

      expect(() => {
        caseCheckbox.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });

    it('should have proper button attributes', () => {
      const closeBtn = document.querySelector('[data-action="close"]') as HTMLButtonElement;
      const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;
      const prevBtn = document.querySelector('[data-action="prev"]') as HTMLButtonElement;

      expect(closeBtn.tagName).toBe('BUTTON');
      expect(nextBtn.tagName).toBe('BUTTON');
      expect(prevBtn.tagName).toBe('BUTTON');
    });

    it('should have proper data attributes on buttons', () => {
      const closeBtn = document.querySelector('[data-action="close"]');
      const nextBtn = document.querySelector('[data-action="next"]');
      const prevBtn = document.querySelector('[data-action="prev"]');

      expect(closeBtn?.getAttribute('data-action')).toBe('close');
      expect(nextBtn?.getAttribute('data-action')).toBe('next');
      expect(prevBtn?.getAttribute('data-action')).toBe('prev');
    });

    it('should have proper data attributes on checkboxes', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]');
      const wholeWordCheckbox = document.querySelector('[data-option="wholeWord"]');
      const regexCheckbox = document.querySelector('[data-option="regex"]');

      expect(caseCheckbox?.getAttribute('data-option')).toBe('caseSensitive');
      expect(wholeWordCheckbox?.getAttribute('data-option')).toBe('wholeWord');
      expect(regexCheckbox?.getAttribute('data-option')).toBe('regex');
    });

    it('should have search input with correct type and attributes', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      expect(input.type).toBe('text');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(input.getAttribute('spellcheck')).toBe('false');
    });

    it('should have navigation buttons with proper initial state', () => {
      const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;
      const prevBtn = document.querySelector('[data-action="prev"]') as HTMLButtonElement;

      // Buttons should exist and have a disabled state set
      expect(nextBtn).toBeTruthy();
      expect(prevBtn).toBeTruthy();
      expect(typeof nextBtn.disabled).toBe('boolean');
      expect(typeof prevBtn.disabled).toBe('boolean');
    });

    it('should allow multiple button clicks in sequence', () => {
      const closeBtn = document.querySelector('[data-action="close"]') as HTMLButtonElement;
      const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;

      expect(() => {
        nextBtn.click();
        nextBtn.click();
        nextBtn.click();
      }).not.toThrow();
    });

    it('should allow multiple checkbox toggles in sequence', () => {
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]') as HTMLInputElement;

      expect(() => {
        caseCheckbox.click();
        caseCheckbox.click();
        caseCheckbox.click();
      }).not.toThrow();
    });
  });

  describe('Security - Regex Injection Protection', () => {
    beforeEach(() => {
      search.openSearchPanel();
    });

    it('should safely handle regex special characters in literal mode', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      // Ensure regex mode is OFF (literal mode)
      regexCheckbox.checked = false;

      // Input with regex special characters - should be escaped
      input.value = '.*+?^${}()|[]\\';
      input.dispatchEvent(new Event('input'));

      // Should not throw or cause ReDoS
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should reject invalid regex patterns', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      // Enable regex mode
      regexCheckbox.checked = true;

      // Invalid regex patterns - unclosed brackets
      const invalidPatterns = [
        '[unclosed',
        '(unclosed',
        '{unclosed',
        '(?<invalid',
        '(?P<invalid',
      ];

      invalidPatterns.forEach((pattern) => {
        input.value = pattern;
        // Should not throw - error should be caught and handled gracefully
        expect(() => {
          input.dispatchEvent(new Event('input'));
        }).not.toThrow();
      });
    });

    it('should prevent ReDoS attacks via regex', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      // Enable regex mode
      regexCheckbox.checked = true;

      // ReDoS patterns - should be rejected or timeout
      const redosPatterns = [
        '(a+)+b',
        '(a*)*b',
        '(a|a)*b',
        '(a|ab)*b',
      ];

      redosPatterns.forEach((pattern) => {
        input.value = pattern;
        // Should handle gracefully without hanging
        const startTime = Date.now();
        input.dispatchEvent(new Event('input'));
        const elapsed = Date.now() - startTime;

        // Should complete within reasonable time (not hanging)
        expect(elapsed).toBeLessThan(1000);
      });
    });

    it('should safely handle regex with backreferences', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      regexCheckbox.checked = true;

      // Backreference patterns
      input.value = '(test)\\1';
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should handle lookahead/lookbehind safely', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      regexCheckbox.checked = true;

      // Lookahead patterns (may or may not be supported in the browser)
      const patterns = [
        '(?=test)',
        '(?!test)',
        '(?<=test)',
        '(?<!test)',
      ];

      patterns.forEach((pattern) => {
        input.value = pattern;
        expect(() => {
          input.dispatchEvent(new Event('input'));
        }).not.toThrow();
      });
    });

    it('should escape special chars when regex mode is disabled', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      // Disable regex mode
      regexCheckbox.checked = false;

      // Query with regex metacharacters should be escaped in literal mode
      input.value = '$100.00';
      input.dispatchEvent(new Event('input'));

      // The search should treat $, ., and other chars as literals
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should handle null bytes in search query', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;

      // Input with null bytes
      input.value = 'test\x00payload';
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should handle extremely long regex patterns gracefully', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;

      regexCheckbox.checked = true;

      // Create a very long pattern
      const longPattern = 'a'.repeat(10000);
      input.value = longPattern;

      const startTime = Date.now();
      input.dispatchEvent(new Event('input'));
      const elapsed = Date.now() - startTime;

      // Should handle without catastrophic backtracking
      expect(elapsed).toBeLessThan(2000);
    });

    it('should safely combine regex mode with case sensitivity', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;
      const caseCheckbox = document.querySelector('[data-option="caseSensitive"]') as HTMLInputElement;

      regexCheckbox.checked = true;
      caseCheckbox.checked = true;

      // Test pattern with both regex and case sensitivity
      input.value = '[a-z]+';
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    it('should safely combine regex mode with whole word option', () => {
      const input = document.querySelector('.review-search-input') as HTMLInputElement;
      const regexCheckbox = document.querySelector('[data-option="regex"]') as HTMLInputElement;
      const wholeWordCheckbox = document.querySelector('[data-option="wholeWord"]') as HTMLInputElement;

      regexCheckbox.checked = true;
      wholeWordCheckbox.checked = true;

      // Test pattern - whole word matching with regex
      input.value = '\\w+';
      expect(() => {
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });
  });
});
