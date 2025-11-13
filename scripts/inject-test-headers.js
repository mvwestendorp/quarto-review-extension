#!/usr/bin/env node
/**
 * Inject OAuth2-Proxy test headers into example HTML files
 * Allows local development/testing without actual oauth2-proxy
 *
 * Usage:
 *   node scripts/inject-test-headers.js [pattern]
 *
 * Examples:
 *   node scripts/inject-test-headers.js              # Inject into all HTML files
 *   node scripts/inject-test-headers.js document     # Inject into document.html only
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleOutputDir = join(__dirname, '..', 'example', '_output');
const patternArg = process.argv[2];

// Test headers to inject
const testHeaders = {
  'x-auth-request-user': 'test.user',
  'x-auth-request-email': 'test@example.com',
  'x-auth-request-preferred-username': 'test.user',
};

function createMetaTags() {
  return Object.entries(testHeaders)
    .map(
      ([name, content]) =>
        `<meta name="${name}" content="${content}" />`
    )
    .join('\n  ');
}

function injectHeaders(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check if headers already exist
    if (content.includes('x-auth-request-user')) {
      console.log(`⏭️  Skipped ${filePath} (headers already present)`);
      return;
    }

    // Find closing head tag
    const headTagIndex = content.indexOf('</head>');
    if (headTagIndex === -1) {
      console.warn(`⚠️  Skipped ${filePath} (no </head> tag found)`);
      return;
    }

    // Inject meta tags before closing head tag
    const metaTags = createMetaTags();
    const injected =
      content.substring(0, headTagIndex) +
      `\n  <!-- OAuth2-Proxy test headers (for local development) -->\n  ${metaTags}\n  ` +
      content.substring(headTagIndex);

    writeFileSync(filePath, injected);
    console.log(`✓ Injected headers into ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function main() {
  try {
    const htmlFiles = readdirSync(exampleOutputDir).filter((file) =>
      file.endsWith('.html')
    );

    if (htmlFiles.length === 0) {
      console.warn('⚠️  No HTML files found in example/_output');
      console.log('Run `quarto render example/` first to generate HTML files');
      process.exit(1);
    }

    // Filter files by pattern if provided
    const filesToProcess = patternArg
      ? htmlFiles.filter((f) => f.includes(patternArg))
      : htmlFiles;

    if (filesToProcess.length === 0) {
      console.warn(`⚠️  No HTML files matching pattern "${patternArg}"`);
      process.exit(1);
    }

    console.log(
      `Injecting OAuth2-Proxy test headers into ${filesToProcess.length} file(s)...\n`
    );

    filesToProcess.forEach((file) => {
      const filePath = join(exampleOutputDir, file);
      injectHeaders(filePath);
    });

    console.log('\n✅ Header injection complete!');
    console.log(
      'Test headers available:\n' +
        Object.entries(testHeaders)
          .map(([name, content]) => `  ${name}: ${content}`)
          .join('\n')
    );
    console.log(
      '\nNow run: npm run serve:e2e\nThen visit: http://127.0.0.1:5173'
    );
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
