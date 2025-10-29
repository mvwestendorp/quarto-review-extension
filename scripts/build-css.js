#!/usr/bin/env node

/**
 * CSS Build Script
 *
 * Processes modular CSS through PostCSS pipeline:
 *   - Flattens @import statements
 *   - Adds vendor prefixes
 *   - Minifies for production
 *   - Generates source maps in development
 *
 * Usage:
 *   npm run build:css         # Production build (minified)
 *   npm run build:css:dev     # Development build (with source maps)
 */

import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Configuration
const inputFile = path.join(
  projectRoot,
  '_extensions/review/assets/review.css'
);
const outputDir = path.join(projectRoot, '_extensions/review/assets/dist');
const outputFile = path.join(outputDir, 'review.css');
const outputMapFile = path.join(outputDir, 'review.css.map');

const isProduction = process.env.NODE_ENV === 'production';
const isDev = !isProduction;

/**
 * PostCSS plugins
 */
const plugins = [
  postcssImport({
    path: [path.join(projectRoot, '_extensions/review/assets')],
  }),
  autoprefixer({
    overrideBrowserslist: ['last 2 versions', 'Firefox ESR', '> 1%'],
  }),
];

// Add minification in production
if (isProduction) {
  plugins.push(cssnano());
}

/**
 * Build CSS
 */
async function buildCSS() {
  try {
    console.log(
      `Building CSS (${isProduction ? 'production' : 'development'})...`
    );

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ Created output directory: ${outputDir}`);
    }

    // Read input CSS
    const inputCSS = fs.readFileSync(inputFile, 'utf8');
    console.log(`✓ Read input file: ${inputFile}`);

    // Process with PostCSS
    const result = await postcss(plugins).process(inputCSS, {
      from: inputFile,
      to: outputFile,
      map: isDev ? { inline: false } : false,
    });

    // Write output CSS
    fs.writeFileSync(outputFile, result.css);
    console.log(`✓ Generated CSS: ${outputFile}`);

    // Write source map in development
    if (isDev && result.map) {
      fs.writeFileSync(outputMapFile, result.map.toString());
      console.log(`✓ Generated source map: ${outputMapFile}`);
    }

    console.log(`\n✅ CSS build complete!`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ CSS build failed:`);
    console.error(error.message);
    if (error.showSourceCode) {
      console.error(error.showSourceCode());
    }
    process.exit(1);
  }
}

// Run build
buildCSS();
