#!/usr/bin/env node
/**
 * Extract test fixtures from Quarto-rendered HTML
 *
 * This script:
 * 1. Parses a Quarto-rendered HTML file
 * 2. Extracts all elements with data-review-markdown attributes
 * 3. Captures both the original markdown and Pandoc's rendered HTML
 * 4. Saves as JSON fixtures for comparative testing
 *
 * Usage:
 *   node extract-fixtures.mjs input.html output.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

function extractFixtures(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const fixtures = [];
  const elements = document.querySelectorAll('[data-review-markdown]');

  console.log(`Found ${elements.length} editable elements`);

  elements.forEach((elem, index) => {
    const elementId = elem.getAttribute('data-review-id');
    const elementType = elem.getAttribute('data-review-type');
    const markdown = elem.getAttribute('data-review-markdown');

    // Get the inner HTML (Pandoc's rendered output)
    // We need to get the actual content element, not the wrapper
    let pandocHtml;

    // For most elements, the content is the first child
    const contentElement = elem.querySelector('p, h1, h2, h3, h4, h5, h6, pre, blockquote, ul, ol, table, div.callout');

    if (contentElement) {
      pandocHtml = contentElement.innerHTML;
    } else {
      // Fallback: use innerHTML of the wrapper
      pandocHtml = elem.innerHTML;
    }

    // Skip empty elements
    if (!markdown || markdown.trim() === '') {
      console.log(`  Skipping empty element: ${elementId}`);
      return;
    }

    fixtures.push({
      id: elementId,
      type: elementType,
      markdown: markdown,
      pandocHtml: pandocHtml,
      index: index,
    });

    console.log(`  ✓ Extracted ${elementType}: ${elementId.substring(0, 60)}...`);
  });

  return fixtures;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node extract-fixtures.mjs <input.html> <output.json>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  console.log(`Extracting fixtures from: ${inputPath}`);

  try {
    const fixtures = extractFixtures(inputPath);

    writeFileSync(outputPath, JSON.stringify(fixtures, null, 2));

    console.log(`\n✓ Extracted ${fixtures.length} fixtures to: ${outputPath}`);

    // Print summary
    const typeCount = fixtures.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});

    console.log('\nFixture summary:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('Error extracting fixtures:', error);
    process.exit(1);
  }
}

main();
