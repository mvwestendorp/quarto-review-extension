## Review Fixtures & GitHub Pages Workflow

The review demo now lives in its own repository (no submodule). This project publishes
build artefacts of the Quarto review extension so the fixture repository can download
and render the latest UI.

### How the pieces fit together

1. **Extension repository (this repo)**
   - `npm run package:extension` produces `dist/packages/quarto-review-extension-<version>.zip` containing `_extensions/review`.
   - The **Publish Extension Bundle** workflow uploads that archive to the `continuous`
     GitHub release every time `main` is updated.

2. **Fixture repository**
   - A GitHub Pages workflow downloads the bundle, extracts it into `_extensions/review`,
     renders the Quarto site, and publishes the HTML.

3. **Reviewers**
   - Read-only access to the published Pages site.
   - Reviewer changes are committed back to the fixture repo as usual (no special
     coupling to the extension repo).

### Packaging the extension locally

```bash
# Build + package the extension
npm run package:extension

# Optional: skip rebuilding if you already ran npm run build
npm run package:extension -- --skip-build
```

The output is created under `dist/packages/`. You can unzip that archive directly
into another Quarto project when testing locally:

```bash
unzip -o dist/packages/quarto-review-extension-<version>.zip -d path/to/another/project
```

### GitHub workflow (extension repo)

The `.github/workflows/publish-extension-bundle.yml` workflow:

1. Runs on pushes to `main` or manually.
2. Installs dependencies, runs `npm run package:extension`.
3. Uploads the resulting archive to the `continuous` release (creating/updating the
   release as needed) and stores it as a workflow artifact.

No extra configuration is required unless you want to change the release name or
retention policy.

### Consuming the bundle in the fixture repo

In the fixtures repository, add a step that downloads the release asset before
rendering. Example snippet for your Pages workflow:

```yaml
- name: Download latest extension bundle
  env:
    GITHUB_TOKEN: ${{ secrets.EXTENSION_BUNDLE_TOKEN }}    # PAT with repo read access
  run: |
    curl -L \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -o extension.zip \
      https://github.com/<owner>/quarto-review-extension/releases/download/continuous/quarto-review-extension-<version>.zip
    rm -rf _extensions/review
    unzip -o extension.zip -d _extensions
```

If the extension repository is public, the token can be omitted (`curl -L -o ...`).
For private repositories, create a fine-grained PAT with **Contents: read** access
and store it as `EXTENSION_BUNDLE_TOKEN` in the fixtures repo secrets.

After downloading the bundle, continue with the usual Quarto render and Pages
deployment:

```yaml
- uses: quarto-dev/quarto-actions/setup@v2
- run: quarto render
- uses: actions/upload-pages-artifact@v3
  with:
    path: _site
- uses: actions/deploy-pages@v4
```

### Manual refresh inside the fixtures repo

```bash
TOKEN=ghp_xxx  # optional if repo is private
curl -L \
  ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
  -o extension.zip \
  https://github.com/<owner>/quarto-review-extension/releases/download/continuous/quarto-review-extension-<version>.zip
rm -rf _extensions/review
unzip -o extension.zip -d _extensions
quarto render
```

Commit the resulting `_site` changes or rely on the GitHub Pages workflow to
publish them.

### Authentication options

| Scenario | Suggested credential | Notes |
|----------|----------------------|-------|
| Public extension repo | none (anonymous `curl`) | Use the release URL directly |
| Private extension repo | Repo-scoped PAT (`EXTENSION_BUNDLE_TOKEN`) | Grants read access to releases |
| Enterprise/on-prem | OAuth2 token | Same scope requirements as PAT |

### Troubleshooting

| Problem | Possible fix |
|---------|---------------|
| Bundle download fails with 404 | Ensure the `continuous` release exists and contains the zip |
| Pages workflow renders outdated UI | Confirm the workflow downloads the bundle before rendering |
| Local render fails with cache errors | Run `quarto render --no-cache` or delete `_extensions/review` and unzip again |
