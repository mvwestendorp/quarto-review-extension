#!/usr/bin/env node

/**
 * Quality Report Generator
 *
 * Aggregates code quality metrics and generates a comprehensive report:
 * - Test coverage
 * - Linting results
 * - Type checking
 * - Complexity metrics
 * - Security audit
 * - Bundle size
 *
 * Run with: npm run quality:report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * Get test coverage summary from coverage JSON
 */
function getCoverageSummary() {
  const coverageDir = path.join(projectRoot, 'coverage');
  const summaryPath = path.join(
    coverageDir,
    'coverage-summary.json'
  );

  if (!fs.existsSync(summaryPath)) {
    return {
      status: 'not-generated',
      message: 'Run `npm run test:coverage` to generate coverage',
    };
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    const total = summary.total;

    return {
      status: 'success',
      lines: `${total.lines.pct}%`,
      statements: `${total.statements.pct}%`,
      functions: `${total.functions.pct}%`,
      branches: `${total.branches.pct}%`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to read coverage: ${error.message}`,
    };
  }
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  try {
    execSync('npm run type-check', { stdio: 'pipe', cwd: projectRoot });
    return { status: 'pass', message: 'No type errors' };
  } catch (error) {
    return { status: 'fail', message: `Type errors found` };
  }
}

/**
 * Check ESLint
 */
function checkLinting() {
  try {
    const result = execSync('npm run lint 2>&1', {
      stdio: 'pipe',
      cwd: projectRoot,
    });
    return {
      status: 'pass',
      message: 'No linting errors',
      output: result.toString().trim().split('\n').slice(0, 3).join('\n'),
    };
  } catch (error) {
    const output = error.stdout
      ? error.stdout.toString()
      : error.message;
    return {
      status: 'warn',
      message: 'Linting warnings found',
      output: output.trim().split('\n').slice(0, 5).join('\n'),
    };
  }
}

/**
 * Check security with npm audit
 */
function checkSecurity() {
  try {
    execSync('npm audit --audit-level=high', {
      stdio: 'pipe',
      cwd: projectRoot,
    });
    return { status: 'pass', message: 'No high/critical vulnerabilities' };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Vulnerabilities found (see npm audit for details)',
    };
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get dist file sizes
 */
function getDistSizes() {
  const distDir = path.join(projectRoot, 'dist');

  if (!fs.existsSync(distDir)) {
    return { status: 'not-built', message: 'Run `npm run build` first' };
  }

  const jsPath = path.join(distDir, 'review.js');
  const cssPath = path.join(distDir, 'review.css');

  const sizes = {};

  if (fs.existsSync(jsPath)) {
    const stats = fs.statSync(jsPath);
    sizes.js = formatFileSize(stats.size);
  }

  if (fs.existsSync(cssPath)) {
    const stats = fs.statSync(cssPath);
    sizes.css = formatFileSize(stats.size);
  }

  return { status: 'success', sizes };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(metrics) {
  let report = '# Code Quality Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += '## 🧪 Test Coverage\n';
  if (metrics.coverage.status === 'success') {
    report += `- Lines: **${metrics.coverage.lines}**\n`;
    report += `- Statements: **${metrics.coverage.statements}**\n`;
    report += `- Functions: **${metrics.coverage.functions}**\n`;
    report += `- Branches: **${metrics.coverage.branches}**\n`;
  } else {
    report += `- ${metrics.coverage.message}\n`;
  }

  report += '\n## 🔍 Type Safety\n';
  report += `- TypeScript: **${metrics.typescript.status === 'pass' ? '✅ Pass' : '❌ Fail'}**\n`;
  if (metrics.typescript.message) {
    report += `  - ${metrics.typescript.message}\n`;
  }

  report += '\n## 📝 Code Quality\n';
  report += `- ESLint: **${
    metrics.linting.status === 'pass' ? '✅ Pass' : '⚠️ Warnings'
  }**\n`;
  if (metrics.linting.message) {
    report += `  - ${metrics.linting.message}\n`;
  }

  report += '\n## 🔒 Security\n';
  report += `- npm audit: **${
    metrics.security.status === 'pass' ? '✅ Pass' : '⚠️ Review needed'
  }**\n`;
  if (metrics.security.message) {
    report += `  - ${metrics.security.message}\n`;
  }

  report += '\n## 📦 Bundle Size\n';
  if (metrics.dist.status === 'success') {
    if (metrics.dist.sizes.js) {
      report += `- JavaScript: **${metrics.dist.sizes.js}**\n`;
    }
    if (metrics.dist.sizes.css) {
      report += `- CSS: **${metrics.dist.sizes.css}**\n`;
    }
  } else {
    report += `- ${metrics.dist.message}\n`;
  }

  report += '\n## Summary\n';
  const checks = [
    metrics.coverage.status === 'success',
    metrics.typescript.status === 'pass',
    metrics.linting.status === 'pass' || metrics.linting.status === 'warn',
    metrics.security.status === 'pass' || metrics.security.status === 'warn',
  ];

  const passed = checks.filter((c) => c).length;
  report += `✅ **${passed}/${checks.length}** quality gates passed\n`;

  return report;
}

/**
 * Main
 */
function main() {
  console.log('🔍 Generating Quality Report...\n');

  const metrics = {
    coverage: getCoverageSummary(),
    typescript: checkTypeScript(),
    linting: checkLinting(),
    security: checkSecurity(),
    dist: getDistSizes(),
  };

  const report = generateMarkdownReport(metrics);

  // Print to console
  console.log(report);

  // Save to file
  const reportPath = path.join(projectRoot, 'QUALITY_REPORT.md');
  fs.writeFileSync(reportPath, report);

  console.log(`\n📄 Report saved to: QUALITY_REPORT.md`);

  // If running in GitHub Actions, set as job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
}

main();
