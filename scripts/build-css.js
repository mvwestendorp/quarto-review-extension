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
import { fileURLToPath, pathToFileURL } from 'url';
import process from 'process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Configuration
const inputFile = path.join(
  projectRoot,
  '_extensions/review/assets/review.css'
);
const outputDir = path.join(projectRoot, '_extensions/review/assets/dist');

/**
 * PostCSS plugins
 */
function createPlugins(isProduction) {
  const plugins = [
    postcssImport({
      path: [path.join(projectRoot, '_extensions/review/assets')],
    }),
    autoprefixer({
      overrideBrowserslist: ['last 2 versions', 'Firefox ESR', '> 1%'],
    }),
  ];

  if (isProduction) {
    plugins.push(cssnano());
  }

  return plugins;
}

function resolveOutputPaths(options) {
  const cssFileName = options.outputFile ?? 'review.css';
  const mapFileName = options.outputMapFile ?? 'review.css.map';

  const cssPath = path.join(outputDir, cssFileName);
  const mapPath = path.join(outputDir, mapFileName);

  return { cssPath, mapPath };
}

/**
 * Build CSS helper
 */
export async function buildCSS(options = {}) {
  const mode =
    options.mode ??
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const isProduction = mode === 'production';
  const isDev = !isProduction;
  const plugins = createPlugins(isProduction);
  const { cssPath: outputFile, mapPath: outputMapFile } =
    resolveOutputPaths(options);

  const log =
    options.logger ??
    ((...args) => {
      if (!options.silent) {
        console.log(...args);
      }
    });

  log(`Building CSS (${mode})...`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    log(`✓ Created output directory: ${outputDir}`);
  }

  // Read input CSS
  const inputCSS = fs.readFileSync(inputFile, 'utf8');
  log(`✓ Read input file: ${inputFile}`);

  // Process with PostCSS
  const result = await postcss(plugins).process(inputCSS, {
    from: inputFile,
    to: outputFile,
    map: isDev ? { inline: false } : false,
  });

  // Write output CSS
  fs.writeFileSync(outputFile, result.css);
  log(`✓ Generated CSS: ${outputFile}`);

  // Write source map in development
  if (isDev && result.map) {
    fs.writeFileSync(outputMapFile, result.map.toString());
    log(`✓ Generated source map: ${outputMapFile}`);
  }

  log(`\n✅ CSS build complete!`);

  return {
    cssPath: outputFile,
    mapPath: isDev && result.map ? outputMapFile : null,
    mode,
  };
}

/**
 * Build CSS
 */
async function runCliBuild() {
  try {
    await buildCSS();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ CSS build failed:`);
    console.error(error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'showSourceCode' in error) {
      console.error(error.showSourceCode());
    }
    process.exit(1);
  }
}

const executedDirectly =
  pathToFileURL(process.argv[1] ?? '').href === import.meta.url;

if (executedDirectly) {
  runCliBuild();
}
