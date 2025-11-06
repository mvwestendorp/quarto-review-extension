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
  buildDate: '2025-11-06T08:21:19.097Z',
  commit: '118374c4ef4cd776c35b8dc7e8ac2d0886edb330',
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
