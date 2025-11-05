# GitHub Pages Setup Guide

## What Was Implemented

A comprehensive documentation publishing system using GitHub Pages that automatically deploys on every push to the `main` branch.

### Files Created/Modified

1. **docs/index.html** (NEW)
   - Professional landing page for documentation portal
   - Navigation to all documentation sections
   - Project statistics and badges
   - Modern responsive design

2. **.github/workflows/ci.yml** (MODIFIED)
   - Added artifact uploads for coverage reports and API docs
   - Added `deploy-docs` job that publishes to GitHub Pages
   - Runs only on `main` branch pushes

3. **README.md** (MODIFIED)
   - Added status badges for CI, coverage, and documentation
   - Badges link to GitHub Actions and GitHub Pages site

---

## Documentation Structure

Your GitHub Pages site will have the following structure:

```
https://mvwestendorp.github.io/quarto-review-extension/
├── index.html                      # Landing page
├── api/                            # TypeDoc API reference
│   └── [auto-generated]
├── coverage/                       # Test coverage reports
│   └── [auto-generated]
├── user/                           # User documentation
│   ├── README.md
│   ├── FEATURES.md
│   ├── QUICK_START.md
│   ├── KEYBOARD_SHORTCUTS.md
│   ├── FAQ.md
│   ├── TROUBLESHOOTING.md
│   └── DEBUG.md
├── dev/                            # Developer documentation
│   ├── README.md
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   ├── CONTRIBUTING.md
│   └── CORRESPONDENCE_MAPPING.md
├── README.md                       # Project README
├── CHANGELOG.md                    # Version history
├── SECURITY.md                     # Security policy
├── TEST_COVERAGE_PLAN.md          # Coverage roadmap
├── TEST_COVERAGE_PROGRESS.md      # Coverage achievements
└── SECURITY_CI_PROPOSAL.md        # Security analysis
```

---

## Required: Enable GitHub Pages

**You need to enable GitHub Pages in your repository settings:**

### Step 1: Push Your Changes

```bash
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository: https://github.com/mvwestendorp/quarto-review-extension
2. Click **Settings** (top right)
3. Scroll down to **Pages** in the left sidebar
4. Under "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` (select from dropdown)
   - **Folder**: `/ (root)`
5. Click **Save**

### Step 3: Wait for Deployment

- The first deployment takes 2-5 minutes
- GitHub will show a blue banner: "Your site is ready to be published at..."
- When complete, the banner turns green: "Your site is live at..."
- Visit: https://mvwestendorp.github.io/quarto-review-extension/

---

## How It Works

### On Every Push to Main:

1. **Test job runs** (`npm test -- --coverage`)
   - Generates coverage report in `coverage/` directory
   - Uploads coverage as artifact

2. **Test job builds docs** (`npm run docs`)
   - Generates TypeDoc API docs in `docs/generated/api/`
   - Uploads API docs as artifact

3. **Deploy-docs job runs** (depends on test job)
   - Downloads coverage and API docs artifacts
   - Copies static markdown docs from `docs/user/` and `docs/dev/`
   - Copies project metadata (README, CHANGELOG, SECURITY)
   - Copies landing page (`docs/index.html`)
   - Publishes everything to `gh-pages` branch

4. **GitHub Pages serves** the `gh-pages` branch
   - Updates automatically on every deployment
   - Typically takes 1-2 minutes to reflect changes

---

## What Gets Published

### ✅ Auto-Generated (Updated on Every Push)

- **API Documentation**: TypeDoc-generated from JSDoc comments
- **Coverage Reports**: HTML coverage report from Vitest
- **Build artifacts**: Latest successful build

### ✅ Static Documentation (Updated When Changed)

- User guides and tutorials
- Developer documentation
- Architecture and design docs
- Contribution guidelines
- Project metadata

---

## Updating Documentation

### To Update User/Developer Docs:

1. Edit files in `docs/user/` or `docs/dev/`
2. Commit and push to `main`
3. GitHub Pages will auto-deploy (1-2 minutes)

### To Update API Docs:

1. Update JSDoc comments in your TypeScript source
2. Commit and push to `main`
3. CI will regenerate TypeDoc and deploy

### To Update Coverage Reports:

- Coverage reports update automatically on every push
- As you add tests, coverage percentage will increase
- No manual action needed

### To Update Landing Page:

1. Edit `docs/index.html`
2. Update statistics (coverage %, test count, etc.)
3. Commit and push to `main`

---

## Status Badges in README

Your README now includes these badges:

```markdown
[![CI](https://github.com/mvwestendorp/quarto-review-extension/workflows/CI/badge.svg)](...)
[![Test Coverage](https://img.shields.io/badge/coverage-71.27%25-yellow)](...)
[![Documentation](https://img.shields.io/badge/docs-latest-blue)](...)
[![License](https://img.shields.io/badge/license-MIT-green)](...)
```

### Updating Coverage Badge:

When coverage increases, update the badge manually:

1. Open `README.md`
2. Find the coverage badge line
3. Update percentage: `coverage-71.27%25` → `coverage-80.00%25`
4. Update color: `yellow` → `brightgreen` (if ≥80%)

**Color scheme**:
- Red: <50%
- Orange: 50-70%
- Yellow: 70-80%
- Bright green: ≥80%

---

## Troubleshooting

### Pages Not Deploying?

1. Check Actions tab: https://github.com/mvwestendorp/quarto-review-extension/actions
2. Look for failed "Deploy Documentation" jobs
3. Check job logs for errors

### 404 on GitHub Pages?

1. Verify `gh-pages` branch exists
2. Check branch has content (should have `index.html`, `api/`, etc.)
3. Verify Settings → Pages source is set to `gh-pages` branch

### Coverage/API Docs Not Updating?

1. Verify `test` job completed successfully
2. Check that artifacts were uploaded (Actions → Workflow Run → Artifacts)
3. Verify `deploy-docs` job downloaded artifacts successfully

### Markdown Not Rendering?

- Markdown files (.md) are served as plain text by GitHub Pages
- Consider adding a static site generator like Jekyll/MkDocs if you need rendered markdown
- Current setup serves HTML and displays .md as raw text

---

## Optional Enhancements

### Custom Domain

Add a custom domain (e.g., `docs.yourproject.com`):

1. Settings → Pages → Custom domain
2. Enter your domain
3. Add CNAME record in your DNS settings

### Markdown Rendering

To render markdown files as HTML, add a static site generator:

**Option A: Jekyll** (GitHub native)
```yaml
# Add to deploy-docs job
- name: Setup Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: 3.1
    bundler-cache: true
- run: bundle install
- run: bundle exec jekyll build
```

**Option B: MkDocs**
```yaml
# Add to deploy-docs job
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: 3.x
- run: pip install mkdocs mkdocs-material
- run: mkdocs build
```

### Search Functionality

Add Algolia DocSearch or lunr.js for site-wide search.

---

## Maintenance

### Regular Updates

- **Weekly**: Review new coverage reports
- **Monthly**: Update statistics in landing page
- **Per Release**: Update version badges and CHANGELOG

### Artifact Retention

- Coverage and API docs are stored as artifacts for 90 days
- After 90 days, they're deleted from GitHub Actions
- The published site on GitHub Pages remains indefinitely

---

## Summary

✅ **What's Automated**:
- API documentation generation
- Coverage report generation
- Deployment to GitHub Pages
- Artifact management

⚠️ **What Requires Manual Action**:
- Enabling GitHub Pages (one-time setup)
- Updating coverage badge percentage
- Updating statistics in landing page
- Markdown rendering (if desired)

🎉 **Result**:
- Professional documentation site
- Always up-to-date API reference
- Visible test coverage reports
- Single source of truth for all docs

---

## Next Steps

1. ✅ Commit already created
2. 🚀 Push to GitHub: `git push origin main`
3. ⚙️ Enable GitHub Pages in Settings
4. 🌐 Visit your docs site in 2-5 minutes!

**Your documentation will be live at**:
https://mvwestendorp.github.io/quarto-review-extension/
