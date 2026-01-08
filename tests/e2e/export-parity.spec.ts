import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

/**
 * Test configurations for different export formats
 */
const EXPORT_CONFIGS = [
  {
    format: 'clean',
    description: 'Clean export parity',
    testDescription: 'exported files match source when no edits have occurred',
    url: '/01-text-and-formatting.html',
    selector: 'button[data-action="export-qmd-clean"]',
    expectedFiles: [
      '01-text-and-formatting.qmd',
      '04-code-execution.qmd',
      '_quarto.yml',
    ] as const,
  },
  {
    format: 'critic',
    description: 'Critic export parity',
    testDescription: 'exported critic bundle matches source when there are no edits',
    url: '/example',
    selector: 'button:has-text("Export with CriticMarkup")',
    expectedFiles: [
      'document.qmd',
      'debug-example.qmd',
      'doc-translation.qmd',
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

      const archiveBuffer = await captureDownloadBuffer(page, config.selector);
      const archiveEntries = parseStoredZip(archiveBuffer);
      const decoder = new TextDecoder();

      for (const filename of config.expectedFiles) {
        const exportedEntry = archiveEntries.get(filename);
        expect(exportedEntry, `Export missing ${filename}`).toBeDefined();
        const exportedText = normalizeNewlines(decoder.decode(exportedEntry));
        const sourcePath = path.resolve(repoRoot, 'example', filename);
        const sourceText = normalizeNewlines(
          await fs.readFile(sourcePath, 'utf8')
        );
        expect(exportedText).toBe(sourceText);
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
    } else if (
      signature === 0x02014b50 ||
      signature === 0x06054b50
    ) {
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

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n');
}
