import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@modules/changes/converters';

describe('Footnote segmentation', () => {
  it('should not create phantom changes for unchanged footnotes', () => {
    // Original footnote in simple inline format
    const oldContent = `Here's a footnote reference[^1] and another one[^2].

[^1]: This is the first footnote content.
[^2]: This is the second footnote content with more details.`;

    // Same content (no changes) - should not create phantom deletions/insertions
    const newContent = oldContent;

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

    // Should have NO changes (empty array)
    expect(changes).toEqual([]);

    // HTML diff should match original content (no markup)
    expect(htmlDiff).not.toContain('data-critic-type="deletion"');
    expect(htmlDiff).not.toContain('data-critic-type="insertion"');
  });

  it('should handle actual footnote content changes correctly', () => {
    const oldContent = `Text with footnote[^1].

[^1]: Original footnote content.`;

    const newContent = `Text with footnote[^1].

[^1]: Modified footnote content.`;

    const changes = generateChanges(oldContent, newContent);
    console.log('Footnote edit changes:', JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(oldContent, changes);
    console.log('Footnote edit HTML diff:', htmlDiff);

    // Should show changes from "Original" to "Modified"
    expect(htmlDiff).toContain('data-critic-type="deletion"');
    expect(htmlDiff).toContain('data-critic-type="addition"');
    expect(changes.length).toBeGreaterThan(0);
  });

  it('should handle adding a new footnote', () => {
    const oldContent = `Text without footnotes.`;

    const newContent = `Text with new footnote[^1].

[^1]: New footnote content.`;

    const changes = generateChanges(oldContent, newContent);
    console.log('Add footnote changes:', JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(oldContent, changes);
    console.log('Add footnote HTML diff:', htmlDiff);

    // Should show insertion
    expect(changes.length).toBeGreaterThan(0);
    expect(htmlDiff).toContain('[^1]');
    expect(htmlDiff).toContain('New footnote content');
  });
});
