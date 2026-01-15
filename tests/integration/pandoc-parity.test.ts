/**
 * Pandoc Rendering Parity Tests
 *
 * These tests compare Remark's rendering output against Pandoc's original HTML.
 * They serve as "golden master" tests to catch rendering regressions.
 *
 * Test fixtures are generated from actual Quarto-rendered HTML using:
 *   npm run fixtures:generate
 *
 * To update fixtures after intentional changes:
 *   npm run fixtures:generate && npm run test:parity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownModule } from '../../src/modules/markdown';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Fixture {
  id: string;
  type: string;
  markdown: string;
  pandocHtml: string;
  index: number;
}

// HTML normalization utilities
function normalizeHtml(html: string): string {
  return (
    html
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove space between tags
      .replace(/>\s+</g, '><')
      // Normalize self-closing tags
      .replace(/<(\w+)([^>]*)\/>/g, '<$1$2>')
      // Remove trailing slashes in void elements
      .replace(/<(br|hr|img|input|meta|link)([^>]*)>/gi, '<$1$2>')
      // Normalize quotes in attributes
      .replace(/=\s*"/g, '="')
      .replace(/=\s*'/g, "='")
      .trim()
  );
}

function stripKatexInternals(html: string): string {
  // KaTeX generates complex internal HTML that may differ between versions
  // We just verify that math was rendered (has .katex class) rather than exact HTML
  return html.replace(
    /<span class="katex">.*?<\/span>/gs,
    '<span class="katex">MATH</span>'
  );
}

function decodeHtmlEntities(text: string): string {
  // Decode HTML entities as done in the actual MarkdownModule
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // Must be last
}

describe('Pandoc Rendering Parity', () => {
  let markdown: MarkdownModule;
  let fixtures: Fixture[];

  beforeEach(() => {
    markdown = new MarkdownModule({
      allowRawHtml: true,
    });

    // Load fixtures
    const fixturesPath = join(
      __dirname,
      '../fixtures/pandoc-renders.json'
    );

    if (!existsSync(fixturesPath)) {
      // Skip tests gracefully if fixtures haven't been generated
      // To generate: create example/test-pandoc-features.qmd then run npm run fixtures:generate
      fixtures = [];
      return;
    }

    fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
  });

  describe('Rendering Comparison', () => {
    // Group fixtures by type for better organization
    let fixturesByType: Record<string, Fixture[]> = {};

    beforeEach(() => {
      // Reset the grouping
      fixturesByType = {};

      fixtures.forEach((fixture) => {
        if (!fixturesByType[fixture.type]) {
          fixturesByType[fixture.type] = [];
        }
        fixturesByType[fixture.type].push(fixture);
      });
    });

    it('should have fixtures to test', () => {
      if (fixtures.length === 0) {
        console.warn('⚠️  No fixtures found. Create example/test-pandoc-features.qmd and run: npm run fixtures:generate');
        return;
      }
      expect(Object.keys(fixturesByType).length).toBeGreaterThan(0);
    });

    // Test each fixture type separately
    Object.entries(fixturesByType).forEach(([type, typeFixtures]) => {
      describe(`${type} elements`, () => {
        typeFixtures.forEach((fixture) => {
          it(`should match Pandoc for: ${fixture.id.substring(0, 80)}`, () => {
            // Decode HTML entities from data-review-markdown attribute
            const decodedMarkdown = decodeHtmlEntities(fixture.markdown);

            // Check if this contains CriticMarkup
            const hasCriticMarkup =
              decodedMarkdown.includes('{++') ||
              decodedMarkdown.includes('{--') ||
              decodedMarkdown.includes('{~~');

            // Skip direct comparison for CriticMarkup elements
            // Pandoc renders it literally, Remark processes it
            // See: tests/fixtures/ACCEPTABLE_DIFFERENCES.md
            if (hasCriticMarkup) {
              // Just verify it renders without errors
              const remarkHtml = markdown.renderSync(decodedMarkdown);
              expect(remarkHtml).toBeTruthy();
              expect(remarkHtml.length).toBeGreaterThan(0);
              return;
            }

            // Render with Remark
            const remarkHtml = markdown.renderSync(decodedMarkdown);

            // Extract just the paragraph/element content (not wrapper)
            // Remark wraps in <p> tags, Pandoc might too
            let remarkContent = remarkHtml;
            const pMatch = remarkHtml.match(/<p>(.*)<\/p>/s);
            if (pMatch) {
              remarkContent = pMatch[1];
            }

            // Normalize for comparison
            let normalizedRemark = normalizeHtml(remarkContent);
            let normalizedPandoc = normalizeHtml(fixture.pandocHtml);

            // Special handling for math (KaTeX internals can differ)
            if (normalizedRemark.includes('class="katex"')) {
              normalizedRemark = stripKatexInternals(normalizedRemark);
              normalizedPandoc = stripKatexInternals(normalizedPandoc);
            }

            // Compare
            try {
              expect(normalizedRemark).toBe(normalizedPandoc);
            } catch (error) {
              // Provide helpful error message with context
              console.error('\n❌ Rendering mismatch:');
              console.error(`   Element: ${fixture.id}`);
              console.error(`   Type: ${fixture.type}`);
              console.error(`   Markdown: ${decodedMarkdown.substring(0, 100)}`);
              console.error('\n   Expected (Pandoc):');
              console.error(`   ${normalizedPandoc.substring(0, 200)}`);
              console.error('\n   Received (Remark):');
              console.error(`   ${normalizedRemark.substring(0, 200)}`);
              throw error;
            }
          });
        });
      });
    });
  });

  describe('Math Rendering Presence', () => {
    it('should render all LaTeX math expressions with KaTeX', () => {
      if (fixtures.length === 0) return; // Skip if no fixtures
      const mathFixtures = fixtures.filter(
        (f) =>
          f.markdown.includes('$') &&
          !f.markdown.includes('```') // Exclude code blocks
      );

      mathFixtures.forEach((fixture) => {
        const decodedMarkdown = decodeHtmlEntities(fixture.markdown);
        const remarkHtml = markdown.renderSync(decodedMarkdown);

        // Both inline and display math should have katex class
        expect(remarkHtml).toContain('class="katex"');

        // Should not show literal dollar signs (unless in code)
        if (!decodedMarkdown.includes('`')) {
          expect(remarkHtml).not.toMatch(/\$[^$]+\$/);
        }
      });
    });
  });

  describe('Pandoc Attributes Conversion', () => {
    it('should convert all Pandoc attributes to HTML', () => {
      if (fixtures.length === 0) return; // Skip if no fixtures
      const attrFixtures = fixtures.filter(
        (f) => f.markdown.includes('{') && f.markdown.includes('}')
      );

      attrFixtures.forEach((fixture) => {
        const decodedMarkdown = decodeHtmlEntities(fixture.markdown);
        const remarkHtml = markdown.renderSync(decodedMarkdown);

        // Should not show literal Pandoc attribute syntax
        // (unless it's in code or a different construct)
        const hasClasses = /\{\.[\w-]+/.test(decodedMarkdown);
        const hasStyles = /\{[^}]*style=/.test(decodedMarkdown);

        if (hasClasses || hasStyles) {
          // Should have converted to HTML span/div
          expect(remarkHtml).toMatch(/<span|<div/);

          // Should not show literal braces with dots
          expect(remarkHtml).not.toMatch(/\{\.[\w-]+\}/);
        }
      });
    });
  });

  describe('CriticMarkup Rendering', () => {
    it.skip('should render CriticMarkup annotations', () => {
      const criticFixtures = fixtures.filter(
        (f) =>
          f.markdown.includes('{++') ||
          f.markdown.includes('{--') ||
          f.markdown.includes('{~~')
      );

      if (criticFixtures.length === 0) {
        console.warn('⚠️  No CriticMarkup fixtures found in test data');
        return;
      }

      criticFixtures.forEach((fixture) => {
        const decodedMarkdown = decodeHtmlEntities(fixture.markdown);
        // Enable CriticMarkup rendering for this test
        const remarkHtml = markdown.renderSync(decodedMarkdown, { enableCriticMarkup: true, allowRawHtml: true });

        // Should have CriticMarkup classes
        const hasAdditions = decodedMarkdown.includes('{++');
        const hasDeletions = decodedMarkdown.includes('{--');
        const hasSubstitutions = decodedMarkdown.includes('{~~');

        if (hasAdditions) {
          expect(remarkHtml).toContain('review-addition');
        }
        if (hasDeletions) {
          expect(remarkHtml).toContain('review-deletion');
        }
        if (hasSubstitutions) {
          expect(remarkHtml).toContain('review-substitution');
        }
      });
    });
  });

  describe('Statistics', () => {
    it('should provide test coverage summary', () => {
      if (fixtures.length === 0) {
        console.warn('⚠️  No fixtures available for statistics');
        return;
      }
      const stats = {
        total: fixtures.length,
        byType: {} as Record<string, number>,
        withMath: fixtures.filter((f) => f.markdown.includes('$')).length,
        withAttributes: fixtures.filter((f) => f.markdown.includes('{')).length,
        withCriticMarkup: fixtures.filter(
          (f) => f.markdown.includes('{++') || f.markdown.includes('{--')
        ).length,
      };

      fixtures.forEach((f) => {
        stats.byType[f.type] = (stats.byType[f.type] || 0) + 1;
      });

      console.log('\n📊 Parity Test Coverage:');
      console.log(`   Total fixtures: ${stats.total}`);
      console.log(`   With LaTeX math: ${stats.withMath}`);
      console.log(`   With Pandoc attributes: ${stats.withAttributes}`);
      console.log(`   With CriticMarkup: ${stats.withCriticMarkup}`);
      console.log('\n   By element type:');
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });

      // Assert we have meaningful coverage
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
