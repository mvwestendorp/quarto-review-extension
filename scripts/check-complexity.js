#!/usr/bin/env node

/**
 * Code Complexity Checker
 *
 * Validates complexity metrics for the codebase:
 * - Function complexity (cyclomatic complexity)
 * - File size
 * - Number of functions per file
 *
 * Run with: npm run quality:complexity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

const THRESHOLDS = {
  maxFunctionsPerFile: 15,
  maxLinesPerFile: 500,
  maxComplexity: 15,
};

let totalIssues = 0;

/**
 * Get all TypeScript files in src directory
 */
function getTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules')) {
        getTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Simple cyclomatic complexity estimator
 * Counts control flow structures: if, else, switch, case, for, while, catch, ||, &&
 */
function estimateComplexity(code) {
  let complexity = 1;
  // Match control structures
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\belse\b/g,
    /\bcase\s+/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcatch\s*\(/g,
    /\?/g, // ternary operator
  ];

  patterns.forEach((pattern) => {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  // Subtract 1 for each else-if we double-counted
  const elseIfs = code.match(/\belse\s+if\s*\(/g);
  if (elseIfs) {
    complexity -= elseIfs.length;
  }

  return Math.min(complexity, 100); // Cap at 100
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Count function declarations (rough estimate)
  const functionMatches = content.match(
    /(?:function|=\s*[\(\w]*\s*=>|method\s+|\s+\w+\s*\(.*\)\s*[:{])/g
  );
  const functionCount = functionMatches ? functionMatches.length : 0;

  // Estimate complexity
  const complexity = estimateComplexity(content);

  const relativePath = path.relative(projectRoot, filePath);
  const issues = [];

  if (lineCount > THRESHOLDS.maxLinesPerFile) {
    issues.push(
      `  ⚠ File too large: ${lineCount} lines (max: ${THRESHOLDS.maxLinesPerFile})`
    );
  }

  if (functionCount > THRESHOLDS.maxFunctionsPerFile) {
    issues.push(
      `  ⚠ Too many functions: ${functionCount} (max: ${THRESHOLDS.maxFunctionsPerFile})`
    );
  }

  if (complexity > THRESHOLDS.maxComplexity) {
    issues.push(
      `  ⚠ High complexity: ${complexity} (max: ${THRESHOLDS.maxComplexity})`
    );
  }

  if (issues.length > 0) {
    console.log(`\n${relativePath}`);
    issues.forEach((issue) => console.log(issue));
    totalIssues += issues.length;
  }

  return {
    filePath: relativePath,
    lines: lineCount,
    functions: functionCount,
    complexity,
    issues,
  };
}

/**
 * Main
 */
function main() {
  console.log('🔍 Code Complexity Analysis\n');
  console.log(`Thresholds:`);
  console.log(
    `  - Max lines per file: ${THRESHOLDS.maxLinesPerFile}`
  );
  console.log(
    `  - Max functions per file: ${THRESHOLDS.maxFunctionsPerFile}`
  );
  console.log(
    `  - Max complexity (estimate): ${THRESHOLDS.maxComplexity}\n`
  );

  const srcDir = path.join(projectRoot, 'src');
  const files = getTypeScriptFiles(srcDir);

  const results = files.map(analyzeFile);

  console.log(`\n📊 Summary`);
  console.log(`  Analyzed: ${files.length} files`);
  console.log(
    `  Average lines: ${Math.round(
      results.reduce((sum, r) => sum + r.lines, 0) / files.length
    )}`
  );
  console.log(
    `  Average functions: ${Math.round(
      results.reduce((sum, r) => sum + r.functions, 0) / files.length
    )}`
  );
  console.log(
    `  Average complexity: ${Math.round(
      results.reduce((sum, r) => sum + r.complexity, 0) / files.length
    )}`
  );

  if (totalIssues > 0) {
    console.log(`\n⚠️  Found ${totalIssues} quality concerns`);
    process.exit(0); // Warning only, don't fail
  } else {
    console.log(`\n✅ All files within complexity thresholds!`);
    process.exit(0);
  }
}

main();
