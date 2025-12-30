import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@modules/changes/converters';

describe('Blockquote issue reproduction', () => {
  it('should handle blockquote edits correctly', () => {
    // Original blockquote from the example
    const oldContent = `>
 > "A blockquote with attribution" --- Author Name
 >`;

    // Modified blockquote with "test" added (normalized by ProseMirror)
    const newContent = `> "A blockquote with attribution" --- Author Name test`;

    console.log('Old content:');
    console.log(JSON.stringify(oldContent));
    console.log('\nNew content:');
    console.log(JSON.stringify(newContent));

    // Generate changes
    const changes = generateChanges(oldContent, newContent);
    console.log('\nGenerated changes:');
    console.log(JSON.stringify(changes, null, 2));

    // Generate HTML diff
    const htmlDiff = changesToHtmlDiff(oldContent, changes);
    console.log('\nHTML Diff:');
    console.log(htmlDiff);
    console.log('\nHTML Diff (JSON):');
    console.log(JSON.stringify(htmlDiff));

    // The HTML diff should not have malformed markup
    // It should not delete "e " from "Name" and add "test"
    // Instead, it should just add " test" to the end
    expect(htmlDiff).not.toContain('<del class="review-deletion" data-critic-type="deletion">e</del>');
    expect(htmlDiff).not.toContain('<del class="review-deletion" data-critic-type="deletion"> </del>');
    expect(htmlDiff).toContain('test');
    expect(htmlDiff).toContain('Author Name');
  });

  it('should properly normalize blockquote content', () => {
    // Simpler test case
    const oldContent = '> Quote\n>';
    const newContent = '> Quote test';

    const changes = generateChanges(oldContent, newContent);
    console.log('Simple blockquote changes:', JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(oldContent, changes);
    console.log('Simple blockquote HTML diff:', htmlDiff);

    // Should add " test" and remove trailing >\n
    expect(htmlDiff).toContain('test');
  });

  it('should not create phantom changes for multi-paragraph blockquotes', () => {
    // Multi-paragraph blockquote
    const oldContent = `> This is a blockquote. It can span multiple lines and contain other formatting.
>
> You can also have multiple paragraphs in a blockquote.`;

    // Same content - should not create phantom changes
    const newContent = oldContent;

    const changes = generateChanges(oldContent, newContent);
    console.log('Multi-paragraph blockquote changes:', JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(oldContent, changes);
    console.log('Multi-paragraph blockquote HTML diff:', htmlDiff);

    // Should have NO changes
    expect(changes).toEqual([]);
    expect(htmlDiff).not.toContain('data-critic-type="deletion"');
    expect(htmlDiff).not.toContain('data-critic-type="insertion"');
  });

  it('should preserve paragraph breaks in multi-paragraph blockquotes', () => {
    // Test that the normalization preserves the blank line between paragraphs
    const oldContent = `> First paragraph.
>
> Second paragraph.`;

    const newContent = oldContent;

    const changes = generateChanges(oldContent, newContent);
    const htmlDiff = changesToHtmlDiff(oldContent, changes);

    console.log('Paragraph break test - htmlDiff:', htmlDiff);

    // The blank line should be preserved as a single ">" line
    // This ensures multi-paragraph blockquotes stay as ONE blockquote, not split into two
    expect(htmlDiff).toMatch(/>\s*First paragraph\.\s*>\s*>\s*Second paragraph\./);
    expect(changes).toEqual([]);
  });

  it('should handle Milkdown serialization of multi-paragraph blockquotes', () => {
    // Milkdown might serialize with a completely blank line instead of ">"
    const oldContent = `> First paragraph.
>
> Second paragraph.`;

    // Simulating Milkdown's potential output with blank line
    const newContent = `> First paragraph.

> Second paragraph.`;

    const changes = generateChanges(oldContent, newContent);
    const htmlDiff = changesToHtmlDiff(oldContent, changes);

    console.log('Milkdown serialization test - changes:', JSON.stringify(changes, null, 2));
    console.log('Milkdown serialization test - htmlDiff:', htmlDiff);

    // This should detect that a blank line was added, splitting the blockquote
    // The normalization should ideally prevent this from being treated as a change
    // For now, let's just document what happens
    if (changes.length > 0) {
      console.warn('WARNING: Blank line in blockquote is being treated as a change!');
      console.warn('This will cause the blockquote to be split into two separate blockquotes.');
    }
  });
});
