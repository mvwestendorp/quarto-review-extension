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
  branch?: string;
  pr?: number;
  buildType?: 'release' | 'pr' | 'main' | 'dev';
  buildUrl?: string;
}

// Build info injected during build process
export const BUILD_INFO: BuildInfo = {
  version: '0.1.0',
  buildNumber: 'dev',
  buildDate: '2025-11-18T17:35:11.545Z',
  commit: '4bbf8e6579df9a4e77bf35541fa56092d24e98ff',
  branch: 'claude/multi-provider-translation-01LSZsBtcryabsxrkmmKct9C',
  pr: undefined,
  buildType: 'dev',
  buildUrl: undefined,
};

/**
 * Get formatted build string for display
 */
export function getBuildString(): string {
  const { version, buildNumber, pr } = BUILD_INFO;
  if (buildNumber === 'dev') {
    return `${version}-dev`;
  }
  if (pr) {
    return `${version}-pr.${pr}.${buildNumber}`;
  }
  return `${version}+${buildNumber}`;
}

/**
 * Get full build information string
 */
export function getFullBuildInfo(): string {
  const { version, buildNumber, buildDate, commit, branch, pr, buildType, buildUrl } = BUILD_INFO;
  const parts = [
    `Version: ${version}`,
    `Build: ${buildNumber}`,
    `Type: ${buildType}`,
    `Date: ${new Date(buildDate).toLocaleString()}`,
  ];
  if (branch) {
    parts.push(`Branch: ${branch}`);
  }
  if (pr) {
    parts.push(`PR: #${pr}`);
  }
  if (commit) {
    parts.push(`Commit: ${commit.substring(0, 8)}`);
  }
  if (buildUrl) {
    parts.push(`Build URL: ${buildUrl}`);
  }
  return parts.join('\n');
}
