## Review Fixtures & GitHub Pages Workflow

This repository embeds a GitHub demo project under `fixtures/github`. The demo site can be published to GitHub Pages and updated from exported review artefacts.

### Terminology

- **Fixtures repo**: `fixtures/github` submodule. Treat it as the canonical repo for the review demo.
- **Review branch**: branch in the fixtures repo that accumulates reviewer changes (defaults to `review/live`).
- **Pages branch**: branch used for GitHub Pages (e.g. `gh-pages`), generated from QMD sources.

> **Prerequisite checklist**
> 1. Enable GitHub Pages in the fixtures repo (Settings ▸ Pages ▸ Build and deployment ▸ GitHub Actions).
> 2. Add a secret named `REVIEW_REPO_TOKEN` to this repository (or an organisation secret) containing a PAT/GitHub App token with `contents:write` access to the fixtures repo.  
>    This allows the `review-sync` workflow to push changes automatically. If the secret is omitted, the workflow will leave the commit staged locally and remind you to push manually.

### Local Setup

```bash
git submodule update --init --recursive
npm install
```

Render the fixtures demo locally:

```bash
npm run fixtures:render            # Renders QMD sources with Quarto
```

To sync exported QMD files from the main extension back into the fixtures repo:

```bash
# Example for exporting into ./exports and committing to review/live
npm run fixtures:sync -- --source ./exports --branch review/live --message "chore(review): sync demo"
```

The script stages files and creates a commit inside `fixtures/github`. Push manually:

```bash
cd fixtures/github
git push origin review/live
```

### GitHub Pages Publishing

1. In the fixtures repo, create a workflow (example below) that renders QMDs and deploys to Pages.
2. Enable Pages via Settings ▸ Pages ▸ Build and deployment ▸ GitHub Actions.
3. Ensure the workflow commits artefacts to the Pages branch or uses the built-in Pages deploy actions.

Example workflow (`fixtures/github/.github/workflows/publish.yml`):

```yaml
name: Publish review demo

on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Set up Quarto
        uses: quarto-dev/quarto-actions/setup@v2

      - name: Render site
        run: |
          npm install
          npm run fixtures:render

      - name: Upload artefacts
        uses: actions/upload-pages-artifact@v3
        with:
          path: fixtures/github/_site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Authentication Options

| Scenario | Recommended Approach | Notes |
|----------|---------------------|-------|
| GitHub-hosted | Fine-grained PAT stored as `REVIEW_REPO_TOKEN` | Minimal setup, per-user tokens |
| Automated CI | GitHub App installation token | Scoped permissions, auditable |
| Deploy keys | Read-only publishing | Use SSH keys tied to the fixtures repo |
| Enterprise/on-prem | OAuth2 tokens (Authorization Code for users, Client Credentials for automation) | Integrate with self-hosted runners and internal secret store |

### Workflow for Reviewers

1. Render the QMD with the web review extension and export reviewed QMD/markdown.
2. Run `npm run fixtures:sync -- --source <export-dir>`.
3. Push the resulting commit to the fixtures repo (`review/live` or a feature branch).
4. Open a PR in the fixtures repo to merge the changes into `main`.
5. Trigger the Pages workflow (automatic on merge or manual via workflow_dispatch).

### CI Integration in the Main Repo

- Create a workflow (`.github/workflows/review-sync.yml`) that, when triggered, runs the sync script using the exported artefacts and commits to the fixtures repo.
- Gate execution behind manual trigger or label-based PR comment.
- Store secrets (`REVIEW_REPO_TOKEN`, or GitHub App credentials) in repository or organization-level secrets.

Example skeleton:

```yaml
name: Sync review fixtures

on:
  workflow_dispatch:
    inputs:
      source:
        description: Path to exported QMD artefacts
        required: true
        default: dist/export
      branch:
        description: Target branch in fixtures repo
        required: true
        default: review/live

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Prepare git credentials
        env:
          REVIEW_REPO_TOKEN: ${{ secrets.REVIEW_REPO_TOKEN }}
        run: |
          git config --global user.name "Review Bot"
          git config --global user.email "review-bot@example.com"
          git config --global url."https://${REVIEW_REPO_TOKEN}@github.com/".insteadOf "https://github.com/"

      - name: Sync fixtures
        run: |
          npm install
          npm run fixtures:sync -- --source "${{ github.event.inputs.source }}" --branch "${{ github.event.inputs.branch }}" --message "chore(review): sync via workflow"

      - name: Push changes
        working-directory: fixtures/github
        run: git push origin "${{ github.event.inputs.branch }}"
```

### Security Considerations

- Protect branches in the fixtures repo (`main`, `review/template`, `gh-pages`).
- Store tokens or SSH keys securely (GitHub Secrets or enterprise secret store).
- Rotate credentials regularly; document rotation procedures.
- Monitor workflow logs and enable Dependabot/security alerts for the fixtures repo.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `fixtures/github` reports dirty working tree | Run `git submodule update --init --recursive` then `git reset --hard HEAD` inside the submodule |
| Sync script says “No files matched pattern” | Ensure exports exist; pass `--source` pointing to the export directory |
| Pages site stale | Trigger the publish workflow manually or merge a new commit to `main` |
| Authentication failures in CI | Verify secrets, token scopes, and that the automation account has repo access |
