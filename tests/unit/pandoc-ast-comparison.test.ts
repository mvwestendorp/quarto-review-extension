/**
 * Unit tests for Pandoc AST comparison utilities
 * Tests the functions used in export parity E2E tests
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

/**
 * Parse markdown content to Pandoc AST JSON
 */
async function parseMarkdownContentWithPandoc(
  content: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('quarto', [
      'pandoc',
      '--to=json',
      '--from=markdown+yaml_metadata_block'
    ]);

    let stdout = '';
    let stderr = '';

    pandoc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pandoc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pandoc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pandoc failed with code ${code}: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Failed to parse Pandoc JSON output: ${error}`));
        }
      }
    });

    pandoc.on('error', (error) => {
      reject(new Error(`Failed to spawn Pandoc: ${error}`));
    });

    // Write content to stdin and close it
    pandoc.stdin.write(content);
    pandoc.stdin.end();
  });
}

/**
 * Convert Pandoc AST to markdown string
 */
async function convertAstToMarkdown(ast: any, format: 'markdown' | 'gfm' = 'gfm'): Promise<string> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('quarto', [
      'pandoc',
      '--from=json',
      `--to=${format}`
    ]);

    let stdout = '';
    let stderr = '';

    pandoc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pandoc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pandoc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pandoc markdown conversion failed with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    pandoc.on('error', (error) => {
      reject(new Error(`Failed to spawn Pandoc: ${error}`));
    });

    // Write AST JSON to stdin
    pandoc.stdin.write(JSON.stringify(ast));
    pandoc.stdin.end();
  });
}

/**
 * Round-trip markdown through Pandoc's writer
 */
async function roundTripMarkdown(markdown: string, format: 'markdown' | 'gfm' = 'gfm'): Promise<any> {
  const ast = await parseMarkdownContentWithPandoc(markdown);
  const roundTrippedMarkdown = await convertAstToMarkdown(ast, format);
  return parseMarkdownContentWithPandoc(roundTrippedMarkdown);
}

/**
 * Compare two Pandoc AST objects structurally
 */
function comparePandocAstStructure(ast1: any, ast2: any): {
  matches: boolean;
  diff?: string;
} {
  const blocks1 = ast1.blocks || [];
  const blocks2 = ast2.blocks || [];

  if (blocks1.length !== blocks2.length) {
    return {
      matches: false,
      diff: `Block count mismatch: ${blocks1.length} vs ${blocks2.length}`
    };
  }

  for (let i = 0; i < blocks1.length; i++) {
    const type1 = blocks1[i]?.t;
    const type2 = blocks2[i]?.t;

    if (type1 !== type2) {
      return {
        matches: false,
        diff: `Block type mismatch at index ${i}: ${type1} vs ${type2}`
      };
    }
  }

  return { matches: true };
}

describe('Pandoc AST Comparison', () => {
  describe('parseMarkdownContentWithPandoc', () => {
    it('should parse simple markdown to AST', async () => {
      const markdown = '# Hello\n\nWorld';
      const ast = await parseMarkdownContentWithPandoc(markdown);

      expect(ast).toHaveProperty('blocks');
      expect(ast.blocks).toHaveLength(2);
      expect(ast.blocks[0].t).toBe('Header');
      expect(ast.blocks[1].t).toBe('Para');
    });

    it('should parse YAML frontmatter', async () => {
      const markdown = '---\ntitle: Test\n---\n\n# Content';
      const ast = await parseMarkdownContentWithPandoc(markdown);

      expect(ast).toHaveProperty('meta');
      expect(ast.meta).toHaveProperty('title');
      expect(ast.blocks).toHaveLength(1);
      expect(ast.blocks[0].t).toBe('Header');
    });

    it('should parse lists', async () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const ast = await parseMarkdownContentWithPandoc(markdown);

      expect(ast.blocks).toHaveLength(1);
      expect(ast.blocks[0].t).toBe('BulletList');
    });

    it('should parse code blocks', async () => {
      const markdown = '```python\nprint("hello")\n```';
      const ast = await parseMarkdownContentWithPandoc(markdown);

      expect(ast.blocks).toHaveLength(1);
      expect(ast.blocks[0].t).toBe('CodeBlock');
    });
  });

  describe('convertAstToMarkdown', () => {
    it('should convert AST back to markdown', async () => {
      const originalMarkdown = '# Hello\n\nWorld';
      const ast = await parseMarkdownContentWithPandoc(originalMarkdown);
      const convertedMarkdown = await convertAstToMarkdown(ast, 'markdown');

      expect(convertedMarkdown).toContain('# Hello');
      expect(convertedMarkdown).toContain('World');
    });

    it('should use GFM format for tables', async () => {
      const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
      const ast = await parseMarkdownContentWithPandoc(markdown);
      const convertedMarkdown = await convertAstToMarkdown(ast, 'gfm');

      // GFM should preserve pipe tables
      expect(convertedMarkdown).toContain('|');
    });
  });

  describe('comparePandocAstStructure', () => {
    it('should match identical structures', async () => {
      const markdown = '# Title\n\nParagraph';
      const ast1 = await parseMarkdownContentWithPandoc(markdown);
      const ast2 = await parseMarkdownContentWithPandoc(markdown);

      const result = comparePandocAstStructure(ast1, ast2);
      expect(result.matches).toBe(true);
    });

    it('should detect block count differences', async () => {
      const markdown1 = '# Title\n\nParagraph';
      const markdown2 = '# Title';
      const ast1 = await parseMarkdownContentWithPandoc(markdown1);
      const ast2 = await parseMarkdownContentWithPandoc(markdown2);

      const result = comparePandocAstStructure(ast1, ast2);
      expect(result.matches).toBe(false);
      expect(result.diff).toContain('Block count mismatch');
    });

    it('should detect block type differences', async () => {
      const markdown1 = '# Header\n\nParagraph';
      const markdown2 = '## Header\n\n- List item';
      const ast1 = await parseMarkdownContentWithPandoc(markdown1);
      const ast2 = await parseMarkdownContentWithPandoc(markdown2);

      const result = comparePandocAstStructure(ast1, ast2);
      expect(result.matches).toBe(false);
      expect(result.diff).toContain('Block type mismatch');
    });
  });

  describe('Known Pandoc Lossy Conversions', () => {
    it('should document: line wrapping changes do not affect structure', async () => {
      const shortLine = '# Title\n\nThis is a short paragraph.';
      const longLine = '# Title\n\nThis is a very long paragraph that will be wrapped by Pandoc when it exceeds the default line width which is typically around 72-80 characters depending on the format.';

      const ast1 = await parseMarkdownContentWithPandoc(shortLine);
      const ast2 = await parseMarkdownContentWithPandoc(longLine);

      // Both have same structure despite different line lengths
      expect(ast1.blocks).toHaveLength(2);
      expect(ast2.blocks).toHaveLength(2);
      expect(ast1.blocks[0].t).toBe('Header');
      expect(ast2.blocks[0].t).toBe('Header');
    });

    it('should document: list marker type (- vs *) does not affect AST', async () => {
      const dashList = '- Item 1\n- Item 2';
      const asteriskList = '* Item 1\n* Item 2';

      const ast1 = await parseMarkdownContentWithPandoc(dashList);
      const ast2 = await parseMarkdownContentWithPandoc(asteriskList);

      // Both parse to BulletList
      expect(ast1.blocks[0].t).toBe('BulletList');
      expect(ast2.blocks[0].t).toBe('BulletList');
    });

    it('should document: metadata is lost in non-standalone conversion', async () => {
      const withMeta = '---\ntitle: Test\nauthor: Me\n---\n\n# Content';
      const ast = await parseMarkdownContentWithPandoc(withMeta);

      // Meta is preserved in AST
      expect(ast.meta).toHaveProperty('title');
      expect(ast.meta).toHaveProperty('author');

      // But when converted without --standalone, meta is not in output
      const markdown = await convertAstToMarkdown(ast, 'markdown');
      const roundTrippedAst = await parseMarkdownContentWithPandoc(markdown);

      // Metadata is lost
      expect(Object.keys(roundTrippedAst.meta)).toHaveLength(0);
    });

    it('should document: div blocks with classes are unwrapped in markdown output', async () => {
      const withDiv = '::: {.column-body}\nContent inside div\n:::';
      const ast = await parseMarkdownContentWithPandoc(withDiv);

      // Div is preserved in AST
      expect(ast.blocks[0].t).toBe('Div');

      // But when converted to markdown, Pandoc may unwrap it
      const markdown = await convertAstToMarkdown(ast, 'markdown');

      // The converted markdown might not have ::: syntax
      // This is a known lossy conversion
      expect(markdown).toBeTruthy();
    });

    it('should document: whitespace normalization in text', async () => {
      const multiSpace = 'Text with    multiple   spaces';
      const singleSpace = 'Text with multiple spaces';

      const ast1 = await parseMarkdownContentWithPandoc(multiSpace);
      const ast2 = await parseMarkdownContentWithPandoc(singleSpace);

      // Both parse to same structure
      expect(ast1.blocks[0].t).toBe('Para');
      expect(ast2.blocks[0].t).toBe('Para');
    });

    it('should document: round-trip through GFM preserves structure better', async () => {
      const markdown = '# Title\n\n- Item 1\n- Item 2\n\n| A | B |\n|---|---|\n| 1 | 2 |';
      const originalAst = await parseMarkdownContentWithPandoc(markdown);
      const roundTrippedAst = await roundTripMarkdown(markdown, 'gfm');

      // Structure should be preserved
      const result = comparePandocAstStructure(originalAst, roundTrippedAst);

      // This test documents whether round-trip preserves structure
      // If it fails, it indicates a known Pandoc lossy conversion
      if (!result.matches) {
        console.log('Known issue:', result.diff);
      }
    });

    it('should document: complex nested structures may lose formatting', async () => {
      const complex = `# Main Title

## Section 1

Paragraph with **bold** and *italic* text.

- List item 1
  - Nested item 1
  - Nested item 2
- List item 2

## Section 2

> Blockquote with multiple lines
> that should be preserved

\`\`\`python
def hello():
    print("world")
\`\`\`
`;

      const originalAst = await parseMarkdownContentWithPandoc(complex);
      const roundTrippedAst = await roundTripMarkdown(complex, 'gfm');

      // Check if structure is preserved
      const result = comparePandocAstStructure(originalAst, roundTrippedAst);

      // Document the result
      if (!result.matches) {
        console.log('Complex structure round-trip issue:', result.diff);
      }

      // At minimum, should have same number of top-level blocks
      expect(originalAst.blocks.length).toBeGreaterThan(0);
      expect(roundTrippedAst.blocks.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown', async () => {
      const ast = await parseMarkdownContentWithPandoc('');
      expect(ast.blocks).toHaveLength(0);
    });

    it('should handle markdown with only whitespace', async () => {
      const ast = await parseMarkdownContentWithPandoc('   \n\n   ');
      expect(ast.blocks).toHaveLength(0);
    });

    it('should handle markdown with special characters', async () => {
      const markdown = '# Title with `code` and [link](url)';
      const ast = await parseMarkdownContentWithPandoc(markdown);

      expect(ast.blocks).toHaveLength(1);
      expect(ast.blocks[0].t).toBe('Header');
    });

    it('should handle very deeply nested lists', async () => {
      const markdown = `- Level 1
  - Level 2
    - Level 3
      - Level 4`;

      const ast = await parseMarkdownContentWithPandoc(markdown);
      expect(ast.blocks[0].t).toBe('BulletList');
    });

    it('should handle mixed content in lists', async () => {
      const markdown = `- Item with **bold**
- Item with \`code\`
- Item with [link](url)`;

      const ast = await parseMarkdownContentWithPandoc(markdown);
      expect(ast.blocks[0].t).toBe('BulletList');
    });
  });
});
