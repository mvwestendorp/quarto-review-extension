#!/usr/bin/env node
/**
 * Copy built assets to extension directory and install extension to example
 * Cross-platform script to automate the build → extension copy step
 */

import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const files = [
  {
    src: join(rootDir, 'dist/review.js'),
    dest: join(rootDir, '_extensions/review/assets/review.js'),
  },
  {
    src: join(rootDir, 'dist/review.js.map'),
    dest: join(rootDir, '_extensions/review/assets/review.js.map'),
  },
  {
    src: join(rootDir, '_extensions/review/assets/review.css'),
    dest: join(rootDir, 'example/_extensions/review/assets/review.css'),
  },
];

console.log('📦 Copying build artifacts to extension...');

for (const { src, dest } of files) {
  if (!existsSync(src)) {
    console.warn(`⚠️  Skipping ${src} (not found)`);
    continue;
  }

  // Ensure destination directory exists
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  try {
    copyFileSync(src, dest);
    console.log(`✓ Copied ${src} → ${dest}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${src}:`, error.message);
    process.exit(1);
  }
}

console.log('✅ Build artifacts copied successfully!');
console.log('');

// Install extension to example directory
console.log('📦 Installing extension to example directory...');

const extensionSrc = join(rootDir, '_extensions/review');
const extensionDestExampleProject = join(rootDir, 'example/_extensions/review');
const extensionDestRealProject = join(
  rootDir,
  'real-project-test/_extensions/review'
);

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  // Create destination directory
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Remove old installation if exists
if (existsSync(extensionDestExampleProject)) {
  rmSync(extensionDestExampleProject, { recursive: true, force: true });
}
// Remove old installation if exists
if (existsSync(extensionDestRealProject)) {
  rmSync(extensionDestRealProject, { recursive: true, force: true });
}

// Copy extension
try {
  copyDir(extensionSrc, extensionDestExampleProject);
  console.log(`✓ Installed extension to example/_extensions/review/`);
  copyDir(extensionSrc, extensionDestRealProject);
  console.log(`✓ Installed extension to real-project-test/_extensions/review/`);
  console.log('✅ Extension installation complete!');
} catch (error) {
  console.error(`✗ Failed to install extension:`, error.message);
  process.exit(1);
}
