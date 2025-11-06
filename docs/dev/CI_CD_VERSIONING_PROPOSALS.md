# CI/CD and Versioning Improvement Proposals

**Status:** Proposal
**Date:** 2025-11-06
**Author:** Development Team

## Executive Summary

This document outlines proposals for improving the CI/CD pipeline and versioning strategy for the Quarto Review Extension, specifically:

1. **Automatic version incrementing** on main branch commits
2. **PR build releases** for testing before merge
3. **Enhanced build metadata** tracking

## Current State Analysis

### Existing Infrastructure ✅

**Version System:**
- Version stored in `package.json`: `0.1.0`
- Build info in `src/version.ts` (auto-generated)
- Build script: `scripts/inject-build-info.js`
- Build number from `GITHUB_RUN_NUMBER` environment variable
- Commit hash automatically captured

**CI/CD Workflows:**
- `ci.yml`: Lint, build, test on push/PR
- `release.yml`: Release on version tags (`v*`)
- `publish-extension-bundle.yml`: (existing)
- `review-sync.yml`: (existing)

**Build Process:**
```bash
npm run prebuild   # inject-build-info.js
npm run build      # vite build + docs + css
npm run postbuild  # copy-assets.js
```

### Gaps Identified ⚠️

1. **Manual version bumping** - version in package.json must be manually updated
2. **No PR preview builds** - PRs don't generate testable release artifacts
3. **No semantic versioning automation** - no automatic major/minor/patch increments
4. **Limited version metadata** - no PR number, branch name in build info

---

## Proposal 1: Automatic Version Incrementing

### Strategy: Semantic Versioning with Conventional Commits

**Goal:** Automatically increment version numbers based on commit messages.

### Implementation Options

#### Option A: GitHub Action with semantic-release (Recommended)

**Pros:**
- Industry standard
- Automatic CHANGELOG generation
- Supports conventional commits
- Handles git tagging automatically
- Rich plugin ecosystem

**Cons:**
- Adds dependency
- Requires conventional commit discipline

**Implementation:**

```yaml
# .github/workflows/version-bump.yml
name: Version Bump

on:
  push:
    branches:
      - main

jobs:
  bump:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

**Configuration (.releaserc.json):**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

**Commit Convention:**
```
feat: new feature          → minor version bump (0.1.0 → 0.2.0)
fix: bug fix              → patch version bump (0.1.0 → 0.1.1)
feat!: breaking change    → major version bump (0.1.0 → 1.0.0)
docs: documentation       → no version bump
chore: maintenance        → no version bump
```

#### Option B: Manual Script with Pattern Detection

**Pros:**
- No external dependencies
- Full control
- Simpler setup

**Cons:**
- More maintenance
- Limited features
- Must implement CHANGELOG manually

**Implementation:**

```javascript
// scripts/bump-version.js
import fs from 'fs';
import { execSync } from 'child_process';

// Get commit messages since last tag
const commits = execSync('git log $(git describe --tags --abbrev=0)..HEAD --oneline', { encoding: 'utf8' });

// Determine bump type
let bumpType = 'patch';
if (commits.match(/BREAKING CHANGE|^feat!:/m)) {
  bumpType = 'major';
} else if (commits.match(/^feat:/m)) {
  bumpType = 'minor';
}

// Read current version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log(`Version bumped: ${pkg.version} → ${newVersion} (${bumpType})`);
```

### Recommendation

**Use Option A (semantic-release)** for the following reasons:
1. Industry-proven solution
2. Automatic CHANGELOG generation
3. Integrated with GitHub releases
4. Handles git operations automatically
5. Extensible with plugins

---

## Proposal 2: PR Preview Builds

### Goal

Generate testable build artifacts for every PR to enable:
- QA testing before merge
- Client preview/approval
- Regression testing
- Performance benchmarking

### Implementation Strategy

#### Workflow: pr-preview.yml

```yaml
name: PR Preview Build

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main, develop]

jobs:
  preview-build:
    name: Build PR Preview
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate PR version
        id: pr_version
        run: |
          BASE_VERSION=$(node -p "require('./package.json').version")
          PR_NUMBER=${{ github.event.pull_request.number }}
          PR_VERSION="${BASE_VERSION}-pr.${PR_NUMBER}.${GITHUB_RUN_NUMBER}"
          echo "VERSION=${PR_VERSION}" >> $GITHUB_OUTPUT
          echo "PR_NUMBER=${PR_NUMBER}" >> $GITHUB_OUTPUT

      - name: Update version for PR
        run: |
          node -e "const pkg = require('./package.json'); pkg.version = '${{ steps.pr_version.outputs.VERSION }}'; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"

      - name: Build extension
        run: npm run build
        env:
          GITHUB_RUN_NUMBER: ${{ github.run_number }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_BRANCH: ${{ github.head_ref }}

      - name: Run tests
        run: npm test

      - name: Create preview bundle
        run: |
          mkdir -p preview
          cp -r _extensions preview/
          cp README.md preview/
          cp package.json preview/
          cd preview
          tar -czf ../quarto-review-pr${{ steps.pr_version.outputs.PR_NUMBER }}.tar.gz .
          cd ..
          zip -r quarto-review-pr${{ steps.pr_version.outputs.PR_NUMBER }}.zip preview/_extensions

      - name: Upload preview artifacts
        uses: actions/upload-artifact@v4
        with:
          name: pr-preview-${{ steps.pr_version.outputs.PR_NUMBER }}
          path: |
            quarto-review-pr${{ steps.pr_version.outputs.PR_NUMBER }}.tar.gz
            quarto-review-pr${{ steps.pr_version.outputs.PR_NUMBER }}.zip
          retention-days: 30

      - name: Comment on PR with preview info
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = ${{ steps.pr_version.outputs.PR_NUMBER }};
            const version = '${{ steps.pr_version.outputs.VERSION }}';
            const runId = context.runId;

            const body = `## 🎉 Preview Build Ready!

            **Version:** \`${version}\`
            **Build:** [#${context.runNumber}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId})

            ### 📦 Download Preview

            [⬇️ Download Preview Bundle](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId})

            ### 🧪 Test Instructions

            1. Download the preview artifact from the workflow run
            2. Extract the archive
            3. Install the extension:
               \`\`\`bash
               quarto install extension ./path/to/extracted/_extensions/review
               \`\`\`
            4. Test your changes in a Quarto document

            ### ℹ️ About This Build

            - Commit: ${context.payload.pull_request.head.sha.substring(0, 7)}
            - Branch: \`${context.payload.pull_request.head.ref}\`
            - Author: @${context.payload.pull_request.user.login}

            ---
            *This preview build is automatically generated for testing purposes and expires in 30 days.*`;

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
              body: body
            });
```

### Benefits

1. **Early Testing:** QA can test PR changes before merge
2. **Client Preview:** Stakeholders can review changes
3. **Version Tracking:** Each PR build has unique version identifier
4. **Artifact Retention:** 30-day retention for investigation
5. **Automated Comments:** PR gets automatic comment with download links

### Version Format for PRs

```
Base version: 0.1.0
PR #123, run 5 → 0.1.0-pr.123.5

Examples:
- 0.1.0-pr.42.1   → PR #42, first build
- 0.1.0-pr.42.2   → PR #42, second build (after update)
- 0.2.0-pr.100.1  → PR #100 against v0.2.0, first build
```

---

## Proposal 3: Enhanced Build Metadata

### Goal

Capture richer metadata for better traceability and debugging.

### Extended BuildInfo Interface

```typescript
// src/version.ts
export interface BuildInfo {
  version: string;
  buildNumber: string;
  buildDate: string;
  commit?: string;
  branch?: string;          // NEW
  pr?: number;              // NEW
  buildType?: 'release' | 'pr' | 'dev';  // NEW
  buildUrl?: string;        // NEW
}
```

### Updated inject-build-info.js

```javascript
// scripts/inject-build-info.js
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

// Get build information from environment
const version = packageJson.version;
const buildNumber = process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'dev';
const buildDate = new Date().toISOString();

// Git information
let commit, branch;
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not determine git information');
}

// PR information
const pr = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER, 10) : undefined;

// Build type
let buildType = 'dev';
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
  buildType = 'release';
} else if (pr) {
  buildType = 'pr';
}

// Build URL
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
  buildType?: 'release' | 'pr' | 'dev';
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
```

---

## Implementation Roadmap

### Phase 1: PR Preview Builds (Week 1)
- [ ] Create `.github/workflows/pr-preview.yml`
- [ ] Update `inject-build-info.js` with PR metadata
- [ ] Test with sample PR
- [ ] Document testing workflow

### Phase 2: Automatic Versioning (Week 2)
- [ ] Install `semantic-release` dependencies
- [ ] Configure `.releaserc.json`
- [ ] Create `.github/workflows/version-bump.yml`
- [ ] Update CONTRIBUTING.md with commit conventions
- [ ] Test on feature branch

### Phase 3: Enhanced Metadata (Week 3)
- [ ] Extend `BuildInfo` interface
- [ ] Update `inject-build-info.js` fully
- [ ] Update UI to display build type/PR info
- [ ] Add build info to error reports

### Phase 4: Documentation & Training (Week 4)
- [ ] Document new workflows
- [ ] Create team training materials
- [ ] Update CI/CD documentation
- [ ] Add troubleshooting guide

---

## Alternative Approaches Considered

### 1. CalVer (Calendar Versioning)
**Format:** `YYYY.MM.PATCH` (e.g., `2025.11.0`)

**Pros:**
- Easy to understand when release was made
- No semantic meaning to track

**Cons:**
- Doesn't convey API compatibility
- Less common in npm ecosystem

**Decision:** Rejected in favor of SemVer for npm compatibility

### 2. Manual Tagging
**Process:** Maintainer manually creates tags

**Pros:**
- Full control
- Simple

**Cons:**
- Error-prone
- Slows down releases
- Requires manual CHANGELOG

**Decision:** Rejected in favor of automation

### 3. Version from Commit Count
**Format:** `0.1.{commit-count}`

**Pros:**
- Always increments
- Simple

**Cons:**
- No semantic meaning
- Can't distinguish breaking changes

**Decision:** Rejected in favor of semantic versioning

---

## Success Metrics

### Adoption Metrics
- [ ] 100% of PRs receive preview builds within 5 minutes
- [ ] 80% of releases use automated versioning
- [ ] Zero manual version conflicts

### Quality Metrics
- [ ] Reduced time from PR to merge by 20%
- [ ] Increased testing coverage before merge
- [ ] Faster identification of breaking changes

### Developer Experience
- [ ] Reduced cognitive load (no manual versioning)
- [ ] Faster feedback loop
- [ ] Better traceability in production

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Commit convention not followed | Medium | Medium | Add commit linter, update PR template |
| Build artifacts too large | Low | Low | Add size limits, implement compression |
| Workflow failures delay merges | High | Low | Add fallback to manual versioning |
| Version conflicts on concurrent PRs | Medium | Low | Use PR-specific version format |

---

## Conclusion

### Recommended Action Plan

**Immediate (This Sprint):**
1. Implement PR preview builds (Proposal 2)
2. Update build metadata with PR info (Proposal 3 - partial)

**Short Term (Next Sprint):**
1. Implement semantic-release (Proposal 1)
2. Full build metadata enhancement (Proposal 3 - complete)

**Long Term (Next Quarter):**
1. Monitor and optimize workflows
2. Collect feedback and iterate
3. Expand to other automation opportunities

### Questions for Discussion

1. Should we require conventional commits immediately or gradually?
2. What should be the retention period for PR preview artifacts?
3. Should we automatically create GitHub Releases for every version bump?
4. Do we need separate workflows for `develop` branch?

---

## References

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [semantic-release](https://semantic-release.gitbook.io/)
- [GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
