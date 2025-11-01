# Git Review Workflow

This document describes how the in-browser review experience creates pull requests across the supported git providers.

## Configuration Overview

Enable the git backend in your Quarto document or project metadata:

```yaml
review:
  git:
    provider: github            # github | gitlab | gitea | forgejo | azure-devops
    owner: <repository-owner>   # GitHub/GitLab/Gitea: org or user. Azure DevOps: organisation.
    repo: <repository-name>
    base-branch: main           # optional; defaults to `main`
    options:
      # provider-specific values (see below)
    auth:
      mode: pat
      token: ${REVIEW_REPO_TOKEN}
```

Any authentication mode supported by `ReviewGitConfig` works:

- `pat`: supply a personal access token (suitable for local development).
- `header`: the embedding application injects an HTTP header (behind a proxy).
- `cookie`: credentials are read from a cookie (SSO friendly).  

The UI surfaces a **Submit Review** button as soon as both the git configuration and authentication are available.

### Provider-specific options

| Provider        | Required options            | Optional options                    | Notes |
|-----------------|-----------------------------|-------------------------------------|-------|
| `github`        | none                        | `options.apiUrl` (GHES)             | Uses the official REST v3 API. |
| `gitlab`        | none                        | `options.apiUrl`, `options.projectId` | `projectId` is useful for self-managed instances with numeric IDs. |
| `gitea` / `forgejo` | none                    | `options.apiUrl`                    | API URL must include `/api/v1` when pointing at a self-hosted server. |
| `azure-devops`  | `options.project`           | `options.collection`, `options.apiVersion`, `options.issueType` | Works for both dev.azure.com and on-premises Azure DevOps Server. |

> ℹ️  The automated flow is not available for the `local` provider because it has no remote API.

### Supplying personal access tokens

When `auth.mode` is set to `pat`, you can omit the token in the document metadata. In that case the UI asks for a personal access token the first time you submit a review, and the token is kept only in memory for the current browser session—it is **not** written back to the QMD file. This allows you to distribute credentials out-of-band while still using the automated submission flow.

## Workflow Outline

1. The reviewer edits the document in the browser. Content changes are tracked by the `ChangesModule`.
2. When ready, the reviewer clicks **Submit Review** and fills in branch / PR information.
3. `GitReviewService` exports the relevant QMD files with `QmdExportService`.
4. The selected git provider creates (or updates) a review branch, uploads the files, and opens a pull request/merge request.
5. On success the UI shows the PR/MR URL. On failure the payload is saved into the fallback store (`review-fallback-<timestamp>.json`) for manual recovery.

## Dialog Defaults

The review dialog is pre-populated using:

- Reviewer display name from `UserModule` (fallback: `"Reviewer"`).
- Branch name: `review/<reviewer>-<timestamp>`.
- Commit message and PR title: `Review updates from <reviewer>`.
- PR body: a short note indicating the review originated from the web UI.

All values can be adjusted before submitting.

## Fallback Storage

If the remote provider returns an error, the submission payload (without raw file contents) is written to the embedded fallback store. Use `listEmbeddedSources()` in the developer console to download the stored JSON and retry manually from your workstation.
