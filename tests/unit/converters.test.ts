/**
 * Tests for change converters
 */

import { describe, it, expect } from 'vitest';
import {
  generateChanges,
  changesToCriticMarkup,
  applyChanges,
  revertChanges,
  stripCriticMarkup,
} from '../../src/modules/changes/converters';

describe('generateChanges', () => {
  it('should generate addition changes', () => {
    const oldContent = 'Hello world';
    const newContent = 'Hello beautiful world';
    const changes = generateChanges(oldContent, newContent);

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('addition');
    expect(changes[0].text).toBe('beautiful ');
    expect(changes[0].position).toBe(6);
  });

  it('should generate deletion changes', () => {
    const oldContent = 'Hello beautiful world';
    const newContent = 'Hello world';
    const changes = generateChanges(oldContent, newContent);

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('deletion');
    expect(changes[0].text).toBe('beautiful ');
    expect(changes[0].position).toBe(6);
  });

  it('should generate mixed changes', () => {
    const oldContent = 'The quick brown fox';
    const newContent = 'The slow brown cat';
    const changes = generateChanges(oldContent, newContent);

    // Should detect: deletion of "quick" and addition of "slow", deletion of "fox" and addition of "cat"
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some((c) => c.type === 'addition')).toBe(true);
    expect(changes.some((c) => c.type === 'deletion')).toBe(true);
  });

  it('should handle identical content', () => {
    const content = 'No changes here';
    const changes = generateChanges(content, content);

    expect(changes).toHaveLength(0);
  });

  it('should handle empty strings', () => {
    const changes1 = generateChanges('', 'new content');
    expect(changes1).toHaveLength(1);
    expect(changes1[0].type).toBe('addition');

    const changes2 = generateChanges('old content', '');
    expect(changes2).toHaveLength(1);
    expect(changes2[0].type).toBe('deletion');
  });
});

describe('changesToCriticMarkup', () => {
  it('should convert additions to CriticMarkup', () => {
    const oldContent = 'Hello world';
    const changes = generateChanges(oldContent, 'Hello beautiful world');
    const result = changesToCriticMarkup(oldContent, changes);

    expect(result).toBe('Hello {++beautiful ++}world');
  });

  it('should convert deletions to CriticMarkup', () => {
    const oldContent = 'Hello beautiful world';
    const changes = generateChanges(oldContent, 'Hello world');
    const result = changesToCriticMarkup(oldContent, changes);

    expect(result).toBe('Hello {--beautiful --}world');
  });

  it('should handle multiple changes', () => {
    const oldContent = 'The quick brown fox jumps';
    const newContent = 'The slow brown cat runs';
    const changes = generateChanges(oldContent, newContent);
    const result = changesToCriticMarkup(oldContent, changes);

    // Should contain both deletions and additions
    expect(result).toContain('{--');
    expect(result).toContain('{++');
  });

  it('should handle no changes', () => {
    const content = 'No changes';
    const result = changesToCriticMarkup(content, []);

    expect(result).toBe('No changes');
  });

  it('should highlight inline edits within list items', () => {
    const original = [
      '- First item',
      '- Second item',
      '',
    ].join('\n');

    const updated = [
      '- First item',
      '- Second item plus',
      '',
    ].join('\n');

    const changes = generateChanges(original, updated);
    const result = changesToCriticMarkup(original, changes);

    expect(result).toContain('- First item');
    expect(result).toContain('- Second item ');
    expect(result).toContain('{++plus++}');
    expect(result).not.toContain('{++- Second item plus++}');
    expect(result).not.toContain('{-- - Second item--}');
  });

  it('should highlight inline edits within table cells', () => {
    const original = [
      '| Provider | Support |',
      '|----------|---------|',
      '| GitHub   | ✅      |',
      '| Gitea    | ✅      |',
      '',
    ].join('\n');

    const updated = [
      '| Provider | Support |',
      '|----------|---------|',
      '| GitHub   | ✅      |',
      '| Gitea test | ✅    |',
      '',
    ].join('\n');

    const changes = generateChanges(original, updated);
    const result = changesToCriticMarkup(original, changes);

    expect(result).toContain('| Gitea');
    expect(result).toContain('{++ test++}');
    expect(result).toContain('| ✅    |');
    expect(result).not.toContain('{++| Gitea test |++}');
  });

  it('should preserve list markers when a new bullet is added', () => {
    const original = [
      '- **In-browser editing**: Click any element to edit with a live preview',
      '- **Change tracking**: All edits are tracked as operations',
      '- **CriticMarkup support**: Use standard markup for annotations',
      '- **Git integration**: Save changes directly to your repository',
      '',
    ].join('\n');

    const updated = [
      '- **In-browser editing**: Click any element to edit with a live preview',
      '- **Change tracking**: All edits are tracked as operations',
      '- **CriticMarkup support**: Use standard markup for annotations',
      '- **Git integration**: Save changes directly to your repository',
      '- More',
      '',
    ].join('\n');

    const changes = generateChanges(original, updated);
    const result = changesToCriticMarkup(original, changes);

    const expected = [
      '- **In-browser editing**: Click any element to edit with a live preview',
      '- **Change tracking**: All edits are tracked as operations',
      '- **CriticMarkup support**: Use standard markup for annotations',
      '- **Git integration**: Save changes directly to your repository',
      '- {++More++}',
      '',
    ].join('\n');

    expect(result).toBe(expected);
  });
});

describe('applyChanges', () => {
  it('should apply additions', () => {
    const oldContent = 'Hello world';
    const changes = generateChanges(oldContent, 'Hello beautiful world');
    const result = applyChanges(oldContent, changes);

    expect(result).toBe('Hello beautiful world');
  });

  it('should apply deletions', () => {
    const oldContent = 'Hello beautiful world';
    const changes = generateChanges(oldContent, 'Hello world');
    const result = applyChanges(oldContent, changes);

    expect(result).toBe('Hello world');
  });

  it('should apply multiple changes', () => {
    const oldContent = 'The quick brown fox';
    const newContent = 'The slow brown cat';
    const changes = generateChanges(oldContent, newContent);
    const result = applyChanges(oldContent, changes);

    expect(result).toBe(newContent);
  });

  it('should handle no changes', () => {
    const content = 'No changes';
    const result = applyChanges(content, []);

    expect(result).toBe(content);
  });
});

describe('revertChanges', () => {
  it('should revert to original content', () => {
    const oldContent = 'Hello world';
    const changes = generateChanges(oldContent, 'Hello beautiful world');
    const result = revertChanges(oldContent, changes);

    expect(result).toBe(oldContent);
  });

  it('should work with any changes', () => {
    const oldContent = 'Original text';
    const newContent = 'Modified text';
    const changes = generateChanges(oldContent, newContent);
    const result = revertChanges(oldContent, changes);

    expect(result).toBe(oldContent);
  });
});

describe('stripCriticMarkup', () => {
  it('should strip additions in accept mode', () => {
    const content = 'Hello {++beautiful ++}world';
    const result = stripCriticMarkup(content, true);

    expect(result).toBe('Hello beautiful world');
  });

  it('should strip deletions in accept mode', () => {
    const content = 'Hello {--old --}world';
    const result = stripCriticMarkup(content, true);

    expect(result).toBe('Hello world');
  });

  it('should keep additions in reject mode', () => {
    const content = 'Hello {++beautiful ++}world';
    const result = stripCriticMarkup(content, false);

    expect(result).toBe('Hello world');
  });

  it('should keep deletions in reject mode', () => {
    const content = 'Hello {--old --}world';
    const result = stripCriticMarkup(content, false);

    expect(result).toBe('Hello old world');
  });

  it('should handle substitutions in accept mode', () => {
    const content = 'The {~~quick~>slow~~} fox';
    const result = stripCriticMarkup(content, true);

    expect(result).toBe('The slow fox');
  });

  it('should handle substitutions in reject mode', () => {
    const content = 'The {~~quick~>slow~~} fox';
    const result = stripCriticMarkup(content, false);

    expect(result).toBe('The quick fox');
  });

  it('should strip comments', () => {
    const content = 'Hello {>>this is a comment<<}world';
    const result = stripCriticMarkup(content, true);

    expect(result).toBe('Hello world');
  });

  it('should convert comments to HTML when requested', () => {
    const content = 'Hello {>>note<<}world';
    const result = stripCriticMarkup(content, true, {
      preserveCommentsAsHtml: true,
    });

    expect(result).toContain('Hello ');
    expect(result).toContain('world');
    expect(result).toContain('<!-- review-comment note -->');
  });

  it('should strip highlights', () => {
    const content = 'Hello {==highlighted==}world';
    const result = stripCriticMarkup(content, true);

    expect(result).toBe('Hello highlightedworld');
  });

  it('should handle complex mixed markup', () => {
    const content =
      'The {~~quick~>slow~~} {--brown--} {++gray++} fox {==jumps==}{>>comment<<}';
    const accepted = stripCriticMarkup(content, true);
    const rejected = stripCriticMarkup(content, false);

    expect(accepted).toBe('The slow  gray fox jumps');
    expect(rejected).toBe('The quick brown  fox jumps');
  });
});

describe('Integration: Full workflow', () => {
  it('should handle edit -> CriticMarkup -> apply cycle', () => {
    const original = 'The quick brown fox jumps over the lazy dog';
    const edited = 'The slow brown cat runs over the active dog';

    // Generate changes
    const changes = generateChanges(original, edited);

    // Convert to CriticMarkup for display
    const markup = changesToCriticMarkup(original, changes);
    expect(markup).toContain('{--');
    expect(markup).toContain('{++');

    // Apply changes to get final content
    const result = applyChanges(original, changes);
    expect(result).toBe(edited);

    // Revert changes to get original
    const reverted = revertChanges(original, changes);
    expect(reverted).toBe(original);
  });

  it('should handle multiline content', () => {
    const original = 'Line 1\nLine 2\nLine 3';
    const edited = 'Line 1\nCompletely different line\nLine 3';

    const changes = generateChanges(original, edited);
    const markup = changesToCriticMarkup(original, changes);
    const result = applyChanges(original, changes);

    expect(result).toBe(edited);
    // Should contain both deletions and additions due to complete line replacement
    expect(markup).toContain('{--');
    expect(markup).toContain('{++');
  });
});
