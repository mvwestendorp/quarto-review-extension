/**
 * Shared Utilities Tests
 *
 * Tests for common utility functions used across modules.
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  isWhitespaceChar,
  trimLineEnd,
  trimLineStart,
  isSetextUnderline,
  normalizeListMarkers,
} from '../../src/modules/ui/shared/utils';

describe('Shared Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      // Note: textContent doesn't escape quotes, only < > and &
      expect(escapeHtml('"')).toBe('"');
      expect(escapeHtml("'")).toBe("'");
    });

    it('should escape angle brackets and ampersand', () => {
      expect(escapeHtml('<script>alert(x)</script>')).toBe(
        '&lt;script&gt;alert(x)&lt;/script&gt;'
      );
    });

    it('should return empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should not escape normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle mixed content with angle brackets', () => {
      expect(escapeHtml('Hello <tag> & text')).toBe(
        'Hello &lt;tag&gt; &amp; text'
      );
    });
  });

  describe('isWhitespaceChar', () => {
    it('should identify space as whitespace', () => {
      expect(isWhitespaceChar(' ')).toBe(true);
    });

    it('should identify tab as whitespace', () => {
      expect(isWhitespaceChar('\t')).toBe(true);
    });

    it('should identify newline as whitespace', () => {
      expect(isWhitespaceChar('\n')).toBe(true);
    });

    it('should identify carriage return as whitespace', () => {
      expect(isWhitespaceChar('\r')).toBe(true);
    });

    it('should not identify letters as whitespace', () => {
      expect(isWhitespaceChar('a')).toBe(false);
      expect(isWhitespaceChar('Z')).toBe(false);
    });

    it('should not identify numbers as whitespace', () => {
      expect(isWhitespaceChar('0')).toBe(false);
      expect(isWhitespaceChar('9')).toBe(false);
    });

    it('should not identify special characters as whitespace', () => {
      expect(isWhitespaceChar('!')).toBe(false);
      expect(isWhitespaceChar('.')).toBe(false);
    });
  });

  describe('trimLineEnd', () => {
    it('should remove trailing whitespace', () => {
      expect(trimLineEnd('hello   ')).toBe('hello');
      expect(trimLineEnd('world\t')).toBe('world');
    });

    it('should remove trailing newlines', () => {
      expect(trimLineEnd('text\n')).toBe('text');
      expect(trimLineEnd('text\r\n')).toBe('text');
    });

    it('should not remove leading whitespace', () => {
      expect(trimLineEnd('   hello')).toBe('   hello');
    });

    it('should handle multiple trailing spaces', () => {
      expect(trimLineEnd('hello     ')).toBe('hello');
    });

    it('should return empty string if only whitespace', () => {
      expect(trimLineEnd('    ')).toBe('');
      expect(trimLineEnd('\t\n')).toBe('');
    });

    it('should preserve internal whitespace', () => {
      expect(trimLineEnd('hello world  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(trimLineEnd('')).toBe('');
    });
  });

  describe('trimLineStart', () => {
    it('should remove leading whitespace', () => {
      expect(trimLineStart('   hello')).toBe('hello');
      expect(trimLineStart('\tworld')).toBe('world');
    });

    it('should remove leading newlines', () => {
      expect(trimLineStart('\ntext')).toBe('text');
      expect(trimLineStart('\r\ntext')).toBe('text');
    });

    it('should not remove trailing whitespace', () => {
      expect(trimLineStart('hello   ')).toBe('hello   ');
    });

    it('should handle multiple leading spaces', () => {
      expect(trimLineStart('     hello')).toBe('hello');
    });

    it('should return empty string if only whitespace', () => {
      expect(trimLineStart('    ')).toBe('');
      expect(trimLineStart('\t\n')).toBe('');
    });

    it('should preserve internal whitespace', () => {
      expect(trimLineStart('  hello world')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(trimLineStart('')).toBe('');
    });
  });

  describe('isSetextUnderline', () => {
    it('should identify setext underline with equals signs', () => {
      expect(isSetextUnderline('=====')).toBe(true);
      expect(isSetextUnderline('======')).toBe(true);
    });

    it('should identify setext underline with hyphens', () => {
      expect(isSetextUnderline('-----')).toBe(true);
      expect(isSetextUnderline('------')).toBe(true);
    });

    it('should reject mixed characters', () => {
      expect(isSetextUnderline('==--==')).toBe(false);
      expect(isSetextUnderline('=-=')).toBe(false);
    });

    it('should reject spaces in underline', () => {
      expect(isSetextUnderline('== == ==')).toBe(false);
    });

    it('should accept single characters (minimum length is 1)', () => {
      expect(isSetextUnderline('=')).toBe(true);
      expect(isSetextUnderline('-')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(isSetextUnderline('')).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      expect(isSetextUnderline('   ')).toBe(false);
    });

    it('should work with leading/trailing whitespace', () => {
      expect(isSetextUnderline('  =====  ')).toBe(true);
      expect(isSetextUnderline('\t-----\t')).toBe(true);
    });
  });

  describe('normalizeListMarkers', () => {
    it('should normalize bullet list markers to -', () => {
      expect(normalizeListMarkers('* item')).toBe('- item');
      expect(normalizeListMarkers('+ item')).toBe('- item');
    });

    it('should preserve dash markers (already normalized)', () => {
      expect(normalizeListMarkers('- item')).toBe('- item');
    });

    it('should preserve ordered list markers (not normalized by this function)', () => {
      expect(normalizeListMarkers('1. item')).toBe('1. item');
      expect(normalizeListMarkers('5. item')).toBe('5. item');
    });

    it('should preserve original if content is missing', () => {
      expect(normalizeListMarkers('*')).toBe('*');
      expect(normalizeListMarkers('+')).toBe('+');
    });

    it('should handle multiple bullet items', () => {
      const content = '* item 1\n+ item 2\n- item 3';
      const normalized = normalizeListMarkers(content);
      expect(normalized).toContain('- item 1');
      expect(normalized).toContain('- item 2');
      expect(normalized).toContain('- item 3');
    });

    it('should not modify ordered lists', () => {
      const content = '1. first\n5. second\n10. third';
      const normalized = normalizeListMarkers(content);
      expect(normalized).toBe(content); // No changes
    });

    it('should preserve nested list indentation for bullets', () => {
      const content = '  * nested item';
      const normalized = normalizeListMarkers(content);
      expect(normalized).toBe('  - nested item');
    });

    it('should handle mixed bullet types', () => {
      const content = '* bullet\n+ plus\n- dash';
      const normalized = normalizeListMarkers(content);
      expect(normalized).toBe('- bullet\n- plus\n- dash');
    });

    it('should skip normalization inside code blocks', () => {
      const content = '```\n* code example\n+ another\n```\nreal list:';
      const normalized = normalizeListMarkers(content);
      // Code block content should be preserved
      expect(normalized).toContain('* code example');
      expect(normalized).toContain('+ another');
    });

    it('should handle empty string', () => {
      expect(normalizeListMarkers('')).toBe('');
    });

    it('should handle text without list markers', () => {
      expect(normalizeListMarkers('just regular text')).toBe('just regular text');
    });

    it('should normalize whitespace after list markers', () => {
      // The regex replaces '* ' with '- ', so extra spaces become single space
      expect(normalizeListMarkers('*   item with spaces')).toBe('- item with spaces');
      expect(normalizeListMarkers('*\titem with tab')).toBe('- item with tab');
    });

    it('should handle multiple consecutive lists', () => {
      const content = '* list 1\n* list 2\n\nParagraph\n\n+ list 2a\n+ list 2b';
      const normalized = normalizeListMarkers(content);
      expect(normalized).toBe('- list 1\n- list 2\n\nParagraph\n\n- list 2a\n- list 2b');
    });
  });

  describe('Integration: Combined utility usage', () => {
    it('should handle escaped HTML with whitespace trimming', () => {
      const input = '  <div>content</div>  ';
      const trimmed = trimLineStart(trimLineEnd(input));
      const escaped = escapeHtml(trimmed);
      expect(escaped).toBe('&lt;div&gt;content&lt;/div&gt;');
    });

    it('should handle list normalization with escaped HTML', () => {
      const input = '* <script>alert("xss")</script>';
      const normalized = normalizeListMarkers(input);
      const escaped = escapeHtml(normalized);
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should properly process markdown with setext headers', () => {
      const header = 'My Header';
      const underline = '=========';
      expect(isSetextUnderline(underline)).toBe(true);
      expect(escapeHtml(header)).toBe('My Header');
    });
  });

  describe('Phase 3 - Unicode & Internationalization', () => {
    it('should handle emoji characters correctly', () => {
      const emoji = '👍 Great job! 🎉';
      const trimmed = trimLineEnd(emoji);
      expect(trimmed).toBe('👍 Great job! 🎉');
      expect(trimmed.length).toBeGreaterThan(0);
    });

    it('should handle RTL text (Arabic) correctly', () => {
      const arabic = 'مرحبا بالعالم'; // Hello world in Arabic
      const trimmed = trimLineEnd(arabic);
      expect(trimmed).toBe('مرحبا بالعالم');
      expect(trimmed.length).toBeGreaterThan(0);
    });

    it('should handle RTL text (Hebrew) correctly', () => {
      const hebrew = 'שלום עולם'; // Hello world in Hebrew
      const trimmed = trimLineStart(hebrew);
      expect(trimmed).toBe('שלום עולם');
    });

    it('should handle mixed RTL and LTR text', () => {
      const mixed = 'Hello שלום world';
      const trimmed = trimLineEnd(mixed);
      expect(trimmed).toBe('Hello שלום world');
    });

    it('should escape HTML in unicode text', () => {
      const unicodeWithHtml = '日本語<tag>テキスト'; // Japanese with HTML
      const escaped = escapeHtml(unicodeWithHtml);
      expect(escaped).toContain('日本語');
      expect(escaped).toContain('&lt;tag&gt;');
      expect(escaped).toContain('テキスト');
    });

    it('should handle zero-width characters', () => {
      const zeroWidth = 'test\u200bword'; // Zero-width space
      const trimmed = trimLineEnd(zeroWidth);
      expect(trimmed).toBe('test\u200bword');
    });

    it('should handle combining diacritical marks', () => {
      const combining = 'e\u0301'; // é as e + combining acute accent
      const trimmed = trimLineEnd(combining);
      expect(trimmed.length).toBeGreaterThan(0);
    });

    it('should handle Unicode normalization edge cases', () => {
      // Composed form vs decomposed form of é
      const composed = 'café'; // é as single character
      const decomposed = 'cafe\u0301'; // e + combining accent
      // Both should be handled without errors
      expect(trimLineEnd(composed).length).toBeGreaterThan(0);
      expect(trimLineEnd(decomposed).length).toBeGreaterThan(0);
    });

    it('should handle mixed emoji and text', () => {
      const mixed = '📝 Write down: مرحبا 👋';
      const trimmed = trimLineEnd(mixed);
      expect(trimmed).toBe('📝 Write down: مرحبا 👋');
      expect(trimmed).toContain('مرحبا');
    });

    it('should handle multi-byte UTF-8 characters', () => {
      const multibyte = '🎨 中文 한국어 العربية';
      const trimmed = trimLineStart(multibyte);
      expect(trimmed).toBe('🎨 中文 한국어 العربية');
    });

    it('should normalize list markers with unicode content', () => {
      const unicodeList = '* 日本語アイテム\n+ العربية';
      const normalized = normalizeListMarkers(unicodeList);
      expect(normalized).toContain('- 日本語アイテム');
      expect(normalized).toContain('- العربية');
    });

    it('should preserve unicode in setext underlines', () => {
      const unicodeHeader = 'مرحبا بالعالم';
      const underline = '===';
      expect(isSetextUnderline(underline)).toBe(true);
      expect(escapeHtml(unicodeHeader)).toBe('مرحبا بالعالم');
    });

    it('should handle surrogate pairs (emoji with modifiers)', () => {
      // Family emoji made of multiple code points
      const family = '👨‍👩‍👧‍👦';
      const trimmed = trimLineEnd(family);
      expect(trimmed).toBe(family);
    });

    it('should handle variation selectors', () => {
      const variation = '❤️'; // Heart with variation selector
      const trimmed = trimLineEnd(variation);
      expect(trimmed).toBe('❤️');
    });
  });

  describe('Phase 3 - Performance & Scale', () => {
    it('should handle very long strings efficiently', () => {
      const longString = 'a'.repeat(10000);
      const start = performance.now();
      const trimmed = trimLineEnd(longString);
      const duration = performance.now() - start;

      expect(trimmed.length).toBe(10000);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle many list items without degradation', () => {
      let content = '';
      for (let i = 0; i < 100; i++) {
        content += `* Item ${i}\n`;
      }

      const start = performance.now();
      const normalized = normalizeListMarkers(content);
      const duration = performance.now() - start;

      expect(normalized).toContain('- Item');
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle deeply nested structures efficiently', () => {
      let content = '';
      for (let i = 0; i < 50; i++) {
        content += '  '.repeat(i) + 'Nested level\n';
      }

      const start = performance.now();
      const trimmed = trimLineEnd(content);
      const duration = performance.now() - start;

      expect(trimmed.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle many whitespace trimming operations', () => {
      const items = [];
      for (let i = 0; i < 1000; i++) {
        items.push(`  text ${i}  \n`);
      }

      const start = performance.now();
      const results = items.map((item) =>
        trimLineStart(trimLineEnd(item))
      );
      const duration = performance.now() - start;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });

    it('should handle large HTML escaping operations', () => {
      let content = '';
      for (let i = 0; i < 1000; i++) {
        content += `<div>Item ${i}</div>`;
      }

      const start = performance.now();
      const escaped = escapeHtml(content);
      const duration = performance.now() - start;

      expect(escaped).toContain('&lt;div&gt;');
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle mixed operations at scale', () => {
      let content = '';
      for (let i = 0; i < 100; i++) {
        content += `* Item <${i}>\n`;
      }

      const start = performance.now();
      const step1 = normalizeListMarkers(content);
      const step2 = trimLineEnd(step1);
      const step3 = escapeHtml(step2);
      const duration = performance.now() - start;

      expect(step3).toContain('&lt;');
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });

    it('should handle extreme content sizes without memory issues', () => {
      // Create a very large string
      const largeString = 'x'.repeat(100000);

      const start = performance.now();
      const trimmed = trimLineEnd(largeString);
      const duration = performance.now() - start;

      expect(trimmed.length).toBe(100000);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });
});
