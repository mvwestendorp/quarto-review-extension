/**
 * Inject build information into version.ts
 * This script is run during the build process to embed build metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Get build information from environment or generate defaults
const version = packageJson.version;
const buildNumber = process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'dev';
const buildDate = new Date().toISOString();

// Try to get git commit hash and branch
let commit, branch;
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not determine git information');
  commit = undefined;
  branch = undefined;
}

// Get PR information from environment
const pr = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER, 10) : undefined;
const prBranch = process.env.PR_BRANCH || undefined;

// Override branch if PR branch is available
if (prBranch) {
  branch = prBranch;
}

// Determine build type
let buildType = 'dev';
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
  buildType = 'release';
} else if (pr) {
  buildType = 'pr';
} else if (process.env.GITHUB_REF === 'refs/heads/main') {
  buildType = 'main';
}

// Construct build URL if running in GitHub Actions
const buildUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

// Build the new version.ts content
const versionFileContent = `/**
 * Build version information for the Quarto Review extension
 * This file is automatically updated during the build process
 *
 * DO NOT EDIT MANUALLY - Changes will be overwritten on next build
 */

export interface BuildInfo {
  version: string;
  buildNumber: string;
  buildDate: string;
  commit?: string;
  branch?: string;
  pr?: number;
  buildType?: 'release' | 'pr' | 'main' | 'dev';
  buildUrl?: string;
}

// Build info injected during build process
export const BUILD_INFO: BuildInfo = {
  version: '${version}',
  buildNumber: '${buildNumber}',
  buildDate: '${buildDate}',
  commit: ${commit ? `'${commit}'` : 'undefined'},
  branch: ${branch ? `'${branch}'` : 'undefined'},
  pr: ${pr || 'undefined'},
  buildType: '${buildType}',
  buildUrl: ${buildUrl ? `'${buildUrl}'` : 'undefined'},
};

/**
 * Get formatted build string for display
 */
export function getBuildString(): string {
  const { version, buildNumber, pr } = BUILD_INFO;
  if (buildNumber === 'dev') {
    return \`\${version}-dev\`;
  }
  if (pr) {
    return \`\${version}-pr.\${pr}.\${buildNumber}\`;
  }
  return \`\${version}+\${buildNumber}\`;
}

/**
 * Get full build information string
 */
export function getFullBuildInfo(): string {
  const { version, buildNumber, buildDate, commit, branch, pr, buildType, buildUrl } = BUILD_INFO;
  const parts = [
    \`Version: \${version}\`,
    \`Build: \${buildNumber}\`,
    \`Type: \${buildType}\`,
    \`Date: \${new Date(buildDate).toLocaleString()}\`,
  ];
  if (branch) {
    parts.push(\`Branch: \${branch}\`);
  }
  if (pr) {
    parts.push(\`PR: #\${pr}\`);
  }
  if (commit) {
    parts.push(\`Commit: \${commit.substring(0, 8)}\`);
  }
  if (buildUrl) {
    parts.push(\`Build URL: \${buildUrl}\`);
  }
  return parts.join('\\n');
}
`;

// Write the updated version.ts file
const versionFilePath = path.join(__dirname, '..', 'src', 'version.ts');
fs.writeFileSync(versionFilePath, versionFileContent, 'utf8');

console.log('✓ Build information injected into version.ts');
console.log(`  Version: ${version}`);
console.log(`  Build: ${buildNumber}`);
console.log(`  Type: ${buildType}`);
console.log(`  Date: ${buildDate}`);
if (branch) {
  console.log(`  Branch: ${branch}`);
}
if (pr) {
  console.log(`  PR: #${pr}`);
}
if (commit) {
  console.log(`  Commit: ${commit.substring(0, 8)}`);
}
if (buildUrl) {
  console.log(`  Build URL: ${buildUrl}`);
}
