/**
 * Tests to investigate block count mismatches in export
 * This test documents the specific issue where exported files have fewer blocks than source
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

async function parseMarkdownWithPandoc(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('quarto', [
      'pandoc',
      filePath,
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
  });
}

async function parseMarkdownContentWithPandoc(content: string): Promise<any> {
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

    pandoc.stdin.write(content);
    pandoc.stdin.end();
  });
}

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

    pandoc.stdin.write(JSON.stringify(ast));
    pandoc.stdin.end();
  });
}

async function roundTripMarkdownThroughPandoc(filePath: string, format: 'markdown' | 'gfm' = 'gfm'): Promise<any> {
  const sourceAst = await parseMarkdownWithPandoc(filePath);
  const markdown = await convertAstToMarkdown(sourceAst, format);
  return parseMarkdownContentWithPandoc(markdown);
}

function getBlockSummary(blocks: any[]): string {
  return blocks.map((block, i) => `${i}: ${block.t}`).join('\n');
}

describe('Export Block Count Investigation', () => {
  const testFile = path.resolve(repoRoot, 'example', '01-text-and-formatting.qmd');

  it('should document block count in source file', async () => {
    const ast = await parseMarkdownWithPandoc(testFile);
    console.log(`\n=== Source file blocks (${ast.blocks.length}) ===`);
    console.log(getBlockSummary(ast.blocks));

    expect(ast.blocks.length).toBeGreaterThan(0);
  });

  it('should document block count after markdown round-trip', async () => {
    const sourceAst = await parseMarkdownWithPandoc(testFile);
    const roundTrippedAst = await roundTripMarkdownThroughPandoc(testFile, 'markdown');

    console.log(`\n=== Markdown format round-trip ===`);
    console.log(`Source blocks: ${sourceAst.blocks.length}`);
    console.log(`Round-tripped blocks: ${roundTrippedAst.blocks.length}`);
    console.log(`Difference: ${sourceAst.blocks.length - roundTrippedAst.blocks.length}`);

    if (sourceAst.blocks.length !== roundTrippedAst.blocks.length) {
      console.log('\n=== Block differences ===');
      const maxLen = Math.max(sourceAst.blocks.length, roundTrippedAst.blocks.length);
      for (let i = 0; i < maxLen; i++) {
        const sourceType = sourceAst.blocks[i]?.t || 'MISSING';
        const roundType = roundTrippedAst.blocks[i]?.t || 'MISSING';
        if (sourceType !== roundType) {
          console.log(`Index ${i}: ${sourceType} -> ${roundType}`);
        }
      }
    }
  });

  it('should document block count after GFM round-trip', async () => {
    const sourceAst = await parseMarkdownWithPandoc(testFile);
    const roundTrippedAst = await roundTripMarkdownThroughPandoc(testFile, 'gfm');

    console.log(`\n=== GFM format round-trip ===`);
    console.log(`Source blocks: ${sourceAst.blocks.length}`);
    console.log(`Round-tripped blocks: ${roundTrippedAst.blocks.length}`);
    console.log(`Difference: ${sourceAst.blocks.length - roundTrippedAst.blocks.length}`);

    if (sourceAst.blocks.length !== roundTrippedAst.blocks.length) {
      console.log('\n=== Block differences ===');
      const maxLen = Math.max(sourceAst.blocks.length, roundTrippedAst.blocks.length);
      for (let i = 0; i < maxLen; i++) {
        const sourceType = sourceAst.blocks[i]?.t || 'MISSING';
        const roundType = roundTrippedAst.blocks[i]?.t || 'MISSING';
        if (sourceType !== roundType) {
          console.log(`Index ${i}: ${sourceType} -> ${roundType}`);
        }
      }
    }
  });

  it('should show markdown output for debugging', async () => {
    const sourceAst = await parseMarkdownWithPandoc(testFile);
    const markdownOutput = await convertAstToMarkdown(sourceAst, 'gfm');

    console.log('\n=== First 500 chars of converted markdown ===');
    console.log(markdownOutput.substring(0, 500));
    console.log('\n=== Last 500 chars of converted markdown ===');
    console.log(markdownOutput.substring(markdownOutput.length - 500));
  });

  it('should compare block types between source and round-trip', async () => {
    const sourceAst = await parseMarkdownWithPandoc(testFile);
    const roundTrippedAst = await roundTripMarkdownThroughPandoc(testFile, 'gfm');

    const sourceTypes = sourceAst.blocks.map((b: any) => b.t);
    const roundTrippedTypes = roundTrippedAst.blocks.map((b: any) => b.t);

    console.log('\n=== Block type comparison ===');
    console.log('Source types:', sourceTypes.join(', '));
    console.log('Round-tripped types:', roundTrippedTypes.join(', '));

    // Count occurrences of each type
    const countTypes = (types: string[]) => {
      const counts: Record<string, number> = {};
      types.forEach(t => counts[t] = (counts[t] || 0) + 1);
      return counts;
    };

    const sourceCounts = countTypes(sourceTypes);
    const roundTrippedCounts = countTypes(roundTrippedTypes);

    console.log('\n=== Type counts ===');
    console.log('Source:', JSON.stringify(sourceCounts, null, 2));
    console.log('Round-tripped:', JSON.stringify(roundTrippedCounts, null, 2));

    // Find differences
    const allTypes = new Set([...Object.keys(sourceCounts), ...Object.keys(roundTrippedCounts)]);
    console.log('\n=== Type count differences ===');
    for (const type of allTypes) {
      const sourceCount = sourceCounts[type] || 0;
      const roundTrippedCount = roundTrippedCounts[type] || 0;
      if (sourceCount !== roundTrippedCount) {
        console.log(`${type}: ${sourceCount} -> ${roundTrippedCount} (${roundTrippedCount - sourceCount})`);
      }
    }
  });
});

describe('Layout File Block Count Investigation', () => {
  const testFile = path.resolve(repoRoot, 'example', '02-layout-and-structure.qmd');

  it('should document block count for layout file', async () => {
    const sourceAst = await parseMarkdownWithPandoc(testFile);
    const roundTrippedAst = await roundTripMarkdownThroughPandoc(testFile, 'gfm');

    console.log(`\n=== Layout file analysis ===`);
    console.log(`Source blocks: ${sourceAst.blocks.length}`);
    console.log(`Round-tripped blocks: ${roundTrippedAst.blocks.length}`);
    console.log(`Difference: ${sourceAst.blocks.length - roundTrippedAst.blocks.length}`);

    if (sourceAst.blocks.length !== roundTrippedAst.blocks.length) {
      const sourceTypes = sourceAst.blocks.map((b: any) => b.t);
      const roundTrippedTypes = roundTrippedAst.blocks.map((b: any) => b.t);

      const countTypes = (types: string[]) => {
        const counts: Record<string, number> = {};
        types.forEach(t => counts[t] = (counts[t] || 0) + 1);
        return counts;
      };

      const sourceCounts = countTypes(sourceTypes);
      const roundTrippedCounts = countTypes(roundTrippedTypes);

      console.log('\n=== Layout file type count differences ===');
      const allTypes = new Set([...Object.keys(sourceCounts), ...Object.keys(roundTrippedCounts)]);
      for (const type of allTypes) {
        const sourceCount = sourceCounts[type] || 0;
        const roundTrippedCount = roundTrippedCounts[type] || 0;
        if (sourceCount !== roundTrippedCount) {
          console.log(`${type}: ${sourceCount} -> ${roundTrippedCount} (${roundTrippedCount - sourceCount})`);
        }
      }
    }
  });
});
