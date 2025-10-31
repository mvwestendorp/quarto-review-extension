import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('toolbar layout css', () => {
  const cssPath = resolve(
    __dirname,
    '../../_extensions/review/assets/components/toolbar.css'
  );
  const css = readFileSync(cssPath, 'utf-8');

  it('positions toolbar with grid layout and row auto-flow', () => {
    expect(css).toMatch(
      /\.review-editor-toolbar\s*{[^{]*?display:\s*grid;[^{]*?grid-auto-flow:\s*row;/s
    );
  });

  it('uses display: contents for toolbar groups to participate in parent grid', () => {
    expect(css).toMatch(
      /\.review-editor-toolbar-group\s*{[^{]*?display:\s*contents;/s
    );
  });
});
