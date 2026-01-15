import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

/**
 * Parse markdown file to Pandoc AST JSON
 */
async function parseMarkdownWithPandoc(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', [
      filePath,
      '--to=json',
      '--from=markdown+yaml_metadata_block',
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

/**
 * Parse markdown content (not file) to Pandoc AST JSON
 */
async function parseMarkdownContentWithPandoc(content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', [
      '--to=json',
      '--from=markdown+yaml_metadata_block',
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
 * Round-trip markdown through Pandoc's writer
 * This simulates what the Lua filter does: AST → markdown → AST
 */
async function roundTripMarkdownThroughPandoc(filePath: string): Promise<any> {
  // Step 1: Parse source file to AST
  const sourceAst = await parseMarkdownWithPandoc(filePath);

  // Step 2: Convert AST to markdown (simulating pandoc.write() in Lua)
  const markdown = await convertAstToMarkdown(sourceAst);

  // Step 3: Parse that markdown back to AST (what we compare against)
  return parseMarkdownContentWithPandoc(markdown);
}

/**
 * Convert Pandoc AST to markdown string
 * Uses 'markdown' format which preserves block structure better than GFM
 * (GFM converts DefinitionList to paragraphs, adding extra blocks)
 * Does NOT use standalone - frontmatter is handled separately by export module
 */
async function convertAstToMarkdown(ast: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', ['--from=json', '--to=markdown']);

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
        reject(
          new Error(
            `Pandoc markdown conversion failed with code ${code}: ${stderr}`
          )
        );
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
 * Compare two Pandoc AST objects structurally
 * Returns true if they have the same structure (headings, paragraphs, lists, etc.)
 * This is more lenient than strict AST equality to account for Pandoc's lossy markdown writer
 */
function comparePandocAst(
  sourceAst: any,
  exportedAst: any
): {
  matches: boolean;
  diff?: string;
} {
  // Extract just the blocks for comparison (ignore meta/frontmatter)
  const sourceBlocks = sourceAst.blocks || [];
  const exportedBlocks = exportedAst.blocks || [];

  // Check if block counts and types match
  if (sourceBlocks.length !== exportedBlocks.length) {
    return {
      matches: false,
      diff: `Block count mismatch: source has ${sourceBlocks.length} blocks, export has ${exportedBlocks.length} blocks`,
    };
  }

  // Check if block types match in order
  for (let i = 0; i < sourceBlocks.length; i++) {
    const sourceType = sourceBlocks[i]?.t;
    const exportedType = exportedBlocks[i]?.t;

    if (sourceType !== exportedType) {
      return {
        matches: false,
        diff: `Block type mismatch at index ${i}: source has ${sourceType}, export has ${exportedType}`,
      };
    }
  }

  return { matches: true };
}

/**
 * Test configurations for different export formats
 */
const EXPORT_CONFIGS = [
  {
    format: 'clean',
    description: 'Clean export parity',
    testDescription: 'exported files match source when no edits have occurred',
    url: '/example',
    selector: '[data-action="export-qmd-clean"]',
    expectedFiles: [
      '01-text-and-formatting.qmd',
      '02-layout-and-structure.qmd',
      '_quarto.yml',
    ] as const,
  },
  {
    format: 'critic',
    description: 'Critic export parity',
    testDescription:
      'exported critic bundle matches source when there are no edits',
    url: '/example',
    selector: '[data-action="export-qmd-critic"]',
    expectedFiles: [
      '01-text-and-formatting.qmd',
      '02-layout-and-structure.qmd',
      '_quarto.yml',
    ] as const,
  },
] as const;

// Run tests for each export format
for (const config of EXPORT_CONFIGS) {
  test.describe(config.description, () => {
    test(config.testDescription, async ({ page, browserName }) => {
      test.skip(
        browserName === 'webkit',
        'Downloads are unreliable in WebKit within CI sandbox'
      );

      await page.goto(config.url);
      await waitForReviewReady(page);

      // Open drawer to access export buttons
      const drawerToggle = page.locator('[data-action="toggle-drawer"]');
      const isDrawerOpen = await page
        .locator('.review-drawer-section-title')
        .first()
        .isVisible();
      if (!isDrawerOpen) {
        await drawerToggle.click();
      }

      const archiveBuffer = await captureDownloadBuffer(page, config.selector);
      const archiveEntries = parseStoredZip(archiveBuffer);
      const decoder = new TextDecoder();

      // Verify all expected files are present in the export and content matches (allowing formatting differences)
      for (const filename of config.expectedFiles) {
        const exportedEntry = archiveEntries.get(filename);
        expect(exportedEntry, `Export missing ${filename}`).toBeDefined();

        const exportedText = decoder.decode(exportedEntry);
        const sourcePath = path.resolve(repoRoot, 'example', filename);

        // For YAML files, just check they're present (no AST comparison needed)
        if (filename.endsWith('.yml') || filename.endsWith('.yaml')) {
          expect(exportedEntry).toBeDefined();
          continue;
        }

        // Round-trip source through Pandoc's markdown writer (simulates Lua filter behavior)
        // This ensures we compare "what Pandoc would write" vs "what was exported"
        const sourceRoundTrippedAst =
          await roundTripMarkdownThroughPandoc(sourcePath);
        const exportedAst = await parseMarkdownContentWithPandoc(exportedText);

        // Compare Pandoc ASTs to ensure semantic equivalence (allows formatting differences)
        const { matches, diff } = comparePandocAst(
          sourceRoundTrippedAst,
          exportedAst
        );
        expect(
          matches,
          `${filename} Pandoc AST should match source after round-trip\n${diff || ''}`
        ).toBe(true);
      }
    });
  });
}

/**
 * Helper Functions
 */

async function waitForReviewReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-review-id]', { timeout: 10_000 });
  await page.waitForFunction(
    () => Boolean((window as any).reviewDebug?.operations),
    null,
    { timeout: 10_000 }
  );
}

async function captureDownloadBuffer(
  page: Page,
  selector: string
): Promise<Uint8Array> {
  const button = page.locator(selector).first();
  await expect(button).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button.click(),
  ]);

  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Failed to read exported archive from download stream');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function parseStoredZip(buffer: Uint8Array): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const signature = readUint32LE(buffer, offset);
    if (signature === 0x04034b50) {
      const compressedSize = readUint32LE(buffer, offset + 18);
      const filenameLength = readUint16LE(buffer, offset + 26);
      const extraLength = readUint16LE(buffer, offset + 28);
      const filenameStart = offset + 30;
      const filenameEnd = filenameStart + filenameLength;
      const filename = decoder.decode(buffer.slice(filenameStart, filenameEnd));
      const dataStart = filenameEnd + extraLength;
      const dataEnd = dataStart + compressedSize;
      entries.set(filename, buffer.slice(dataStart, dataEnd));
      offset = dataEnd;
    } else if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    } else {
      offset += 1;
    }
  }

  return entries;
}

function readUint16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  );
}
