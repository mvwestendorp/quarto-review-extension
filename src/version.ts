/**
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
  version: '0.1.0',
  buildNumber: 'dev',
  buildDate: '2025-11-05T19:33:32.878Z',
  commit: '85adcc26f0217489475507f167dc6432be009bc6',
};

/**
 * Get formatted build string for display
 */
export function getBuildString(): string {
  const { version, buildNumber } = BUILD_INFO;
  if (buildNumber === 'dev') {
    return `${version}-dev`;
  }
  return `${version}+${buildNumber}`;
}

/**
 * Get full build information string
 */
export function getFullBuildInfo(): string {
  const { version, buildNumber, buildDate, commit } = BUILD_INFO;
  const parts = [
    `Version: ${version}`,
    `Build: ${buildNumber}`,
    `Date: ${new Date(buildDate).toLocaleString()}`,
  ];
  if (commit) {
    parts.push(`Commit: ${commit.substring(0, 8)}`);
  }
  return parts.join('\n');
}
