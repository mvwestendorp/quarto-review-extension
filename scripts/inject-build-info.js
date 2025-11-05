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

// Try to get git commit hash
let commit;
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not determine git commit hash');
  commit = undefined;
}

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
}

// Build info injected during build process
export const BUILD_INFO: BuildInfo = {
  version: '${version}',
  buildNumber: '${buildNumber}',
  buildDate: '${buildDate}',
  commit: ${commit ? `'${commit}'` : 'undefined'},
};

/**
 * Get formatted build string for display
 */
export function getBuildString(): string {
  const { version, buildNumber, buildDate } = BUILD_INFO;
  if (buildNumber === 'dev') {
    return \`\${version}-dev\`;
  }
  return \`\${version}+\${buildNumber}\`;
}

/**
 * Get full build information string
 */
export function getFullBuildInfo(): string {
  const { version, buildNumber, buildDate, commit } = BUILD_INFO;
  const parts = [
    \`Version: \${version}\`,
    \`Build: \${buildNumber}\`,
    \`Date: \${new Date(buildDate).toLocaleString()}\`,
  ];
  if (commit) {
    parts.push(\`Commit: \${commit.substring(0, 8)}\`);
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
console.log(`  Date: ${buildDate}`);
if (commit) {
  console.log(`  Commit: ${commit.substring(0, 8)}`);
}
