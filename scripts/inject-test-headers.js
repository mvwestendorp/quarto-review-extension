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

function createAuthScript() {
  const headersJson = JSON.stringify(testHeaders, null, 2);
  return `<script>
  // OAuth2-Proxy test headers for local development
  window.__authHeaders = ${headersJson};
  console.log('[Dev Auth] Test headers injected into window.__authHeaders');
</script>`;
}

function injectHeaders(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check if headers already exist
    if (content.includes('window.__authHeaders')) {
      console.log(`⏭️  Skipped ${filePath} (headers already present)`);
      return;
    }

    // Find opening head tag
    const headTagMatch = content.match(/<head[^>]*>/i);
    if (!headTagMatch) {
      console.warn(`⚠️  Skipped ${filePath} (no <head> tag found)`);
      return;
    }

    // Inject script right after opening head tag
    const headTagEndIndex = content.indexOf(headTagMatch[0]) + headTagMatch[0].length;
    const authScript = createAuthScript();
    const injected =
      content.substring(0, headTagEndIndex) +
      `\n  ${authScript}\n  ` +
      content.substring(headTagEndIndex);

    writeFileSync(filePath, injected);
    console.log(`✓ Injected OAuth2-Proxy headers into ${filePath}`);
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
      'Test headers injected via window.__authHeaders:\n' +
        Object.entries(testHeaders)
          .map(([name, content]) => `  ${name}: ${content}`)
          .join('\n')
    );
    console.log(
      '\nNow run: npm run serve:e2e\nThen visit: http://127.0.0.1:5173'
    );
    console.log(
      '\nIn browser console, verify: console.log(window.__authHeaders)'
    );
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
