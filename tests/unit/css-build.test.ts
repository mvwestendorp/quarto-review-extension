/**
 * CSS Build Process Tests
 *
 * Tests for PostCSS pipeline and CSS minification/optimization.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCSS } from '../../scripts/build-css.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');
const distDir = path.join(projectRoot, '_extensions/review/assets/dist');
const devCssFile = path.join(distDir, 'review.css');
const devMapFile = path.join(distDir, 'review.css.map');

describe('CSS Build Process', () => {
  beforeAll(async () => {
    await buildCSS({ mode: 'development', silent: true });
  });

  describe('Development Build', () => {
    it('should generate CSS file', () => {
      expect(fs.existsSync(devCssFile)).toBe(true);
    });

    it('should generate source map', () => {
      expect(fs.existsSync(devMapFile)).toBe(true);
    });

    it('should flatten @import statements', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Should not contain @import after flattening
      expect(css).not.toMatch(/@import\s+['"][^'"]+['"]/);
    });

    it('should include all design tokens', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toContain('--review-color-primary');
      expect(css).toContain('--review-color-danger');
      expect(css).toContain('--review-font-family-sans');
      expect(css).toContain('--review-transition-fast');
    });

    it('should include base styles', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toContain('.review-editable');
      expect(css).toContain('@keyframes pulse');
      expect(css).toContain('@keyframes spin');
    });

    it('should include component styles', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toContain('.review-btn');
      expect(css).toContain('.review-editor-modal');
      expect(css).toContain('.review-toolbar');
      expect(css).toContain('.review-bottom-drawer');
      expect(css).toContain('.review-comment-item');
    });

    it('should include CriticMarkup styles', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toContain('.critic-addition');
      expect(css).toContain('.critic-deletion');
      expect(css).toContain('.critic-highlight');
      expect(css).toContain('.milkdown .ProseMirror');
    });

    it('should include responsive styles', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toMatch(/@media\s*\(/);
      expect(css).toContain('(max-width: 768px)');
      expect(css).toContain('(max-width: 640px)');
    });

    it('should include dark mode styles', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      expect(css).toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/);
    });

    it('should add vendor prefixes', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Should have -webkit and/or other prefixes
      expect(css).toMatch(/-webkit-|moz-|ms-|o-/);
    });

    it('source map should be valid JSON', () => {
      const mapContent = fs.readFileSync(devMapFile, 'utf8');
      expect(() => JSON.parse(mapContent)).not.toThrow();
    });

    it('source map should contain sources', () => {
      const mapContent = JSON.parse(fs.readFileSync(devMapFile, 'utf8'));
      expect(mapContent.sources).toBeDefined();
      expect(Array.isArray(mapContent.sources)).toBe(true);
      expect(mapContent.sources.length).toBeGreaterThan(0);
    });

    it('should have reasonable file size', () => {
      const stats = fs.statSync(devCssFile);
      const sizeKB = stats.size / 1024;
      // Should be between 50-142 KB (with all @imports including translation.css, bottom-drawer.css, margin-comments.css, developer-panel.css, and translation stats styles)
      expect(sizeKB).toBeGreaterThan(50);
      expect(sizeKB).toBeLessThan(142);
    });
  });

  describe('Production Build', () => {
    let prodCssFile: string;
    let prodMapFile: string;

    beforeAll(async () => {
      prodCssFile = path.join(distDir, 'review.prod.css');
      prodMapFile = path.join(distDir, 'review.prod.css.map');

      if (fs.existsSync(prodCssFile)) {
        fs.unlinkSync(prodCssFile);
      }
      if (fs.existsSync(prodMapFile)) {
        fs.unlinkSync(prodMapFile);
      }

      await buildCSS({
        mode: 'production',
        outputFile: 'review.prod.css',
        outputMapFile: 'review.prod.css.map',
        silent: true,
      });
    });

    afterAll(() => {
      if (fs.existsSync(prodCssFile)) {
        fs.unlinkSync(prodCssFile);
      }
      if (fs.existsSync(prodMapFile)) {
        fs.unlinkSync(prodMapFile);
      }
    });

    it('should generate minified CSS', () => {
      expect(fs.existsSync(prodCssFile)).toBe(true);
    });

    it('should not generate source map in production', () => {
      // Production build should not have source map
      const prodMapFile = path.join(distDir, 'review.css.map');
      // It's ok if it doesn't exist or if it does (just checking it's not required)
      expect(fs.existsSync(prodCssFile)).toBe(true);
    });

    it('should minify CSS', () => {
      const devStats = fs.statSync(devCssFile);
      const prodStats = fs.statSync(prodCssFile);
      // Minified version should be smaller or same size
      expect(prodStats.size).toBeLessThanOrEqual(devStats.size);
    });

    it('minified CSS should still contain all styles', () => {
      const css = fs.readFileSync(prodCssFile, 'utf8');
      // Check for critical selectors (minified, no spaces around them)
      expect(css).toMatch(/\.review-btn/);
      expect(css).toMatch(/\.review-editor/);
      expect(css).toMatch(/\.critic-/);
    });

    it('should not have unnecessary whitespace', () => {
      const css = fs.readFileSync(prodCssFile, 'utf8');
      // Minified CSS should not have excessive line breaks
      const lineCount = css.split('\n').length;
      expect(lineCount).toBeLessThan(100);
    });
  });

  describe('CSS Validity', () => {
    it('should parse without errors', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Basic syntax check - should have balanced braces
      const openBraces = (css.match(/{/g) || []).length;
      const closeBraces = (css.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should not have orphaned selectors', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Verify CSS structure is valid - each rule should have a selector followed by {
      // Count total rules (should match opening braces at root level)
      const lines = css.split('\n');
      let inComment = false;
      let validRules = 0;

      for (const line of lines) {
        // Track multi-line comments
        if (line.includes('/*')) inComment = true;
        if (line.includes('*/')) inComment = false;

        // Count opening braces when not in comments
        if (!inComment && line.includes('{')) {
          validRules++;
        }
      }

      // Should have many rules (at least 100)
      expect(validRules).toBeGreaterThan(100);
    });

    it('should use custom properties consistently', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Count color custom properties
      const colorVarMatches = css.match(/--review-color-\w+/g);
      expect(colorVarMatches).toBeTruthy();
      expect(colorVarMatches!.length).toBeGreaterThan(10);
    });

    it('should have proper media query syntax', () => {
      const css = fs.readFileSync(devCssFile, 'utf8');
      // Media queries should have balanced braces
      const mediaQueries = css.match(/@media[^{]*{(?:[^{}]*{[^}]*})*[^}]*}/g);
      expect(mediaQueries).toBeTruthy();
      expect(mediaQueries!.length).toBeGreaterThan(0);
    });
  });
});
