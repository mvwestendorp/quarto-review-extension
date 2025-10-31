#!/usr/bin/env bash

## Synchronise exported review QMD files back into the fixtures repository.
##
## Usage:
##   scripts/fixtures/sync-review.sh --source <path> [--branch <branch>] [--message <msg>]
##
## Environment variables:
##   FIXTURE_REPO    Path to the fixtures repository (default: fixtures/github)
##   SOURCE_PATTERN  Glob for QMD files to copy (default: *.qmd in source path)
##
## The script stages files inside the fixtures repo but does not push. This lets
## maintainers review and push changes manually or via CI.

set -euo pipefail

FIXTURE_REPO="${FIXTURE_REPO:-fixtures/github}"
SOURCE_PATH=""
SOURCE_PATTERN="${SOURCE_PATTERN:-*.qmd}"
TARGET_BRANCH=""
COMMIT_MESSAGE=""

usage() {
  grep '^##' "$0" | sed -e 's/^## \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_PATH="$2"
      shift 2
      ;;
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --message)
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$SOURCE_PATH" ]]; then
  echo "Missing --source argument." >&2
  usage
  exit 1
fi

if [[ ! -d "$SOURCE_PATH" ]]; then
  echo "Source path does not exist: $SOURCE_PATH" >&2
  exit 1
fi

if [[ ! -d "$FIXTURE_REPO" ]]; then
  echo "Fixture repository not found at $FIXTURE_REPO" >&2
  exit 1
fi

pushd "$FIXTURE_REPO" >/dev/null

if [[ -n "$TARGET_BRANCH" ]]; then
  git fetch origin "$TARGET_BRANCH" >/dev/null 2>&1 || true
  git checkout "$TARGET_BRANCH"
fi

shopt -s nullglob
files_to_copy=("$SOURCE_PATH"/$SOURCE_PATTERN)
shopt -u nullglob

if [[ ${#files_to_copy[@]} -eq 0 ]]; then
  echo "No files matched pattern '$SOURCE_PATTERN' in $SOURCE_PATH" >&2
  exit 1
fi

for file in "${files_to_copy[@]}"; do
  filename=$(basename "$file")
  echo "Copying $file -> $filename"
  cp "$file" "$filename"
  git add "$filename"
done

if [[ -z "$COMMIT_MESSAGE" ]]; then
  COMMIT_MESSAGE="chore(review): sync reviewed QMD content"
fi

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$COMMIT_MESSAGE"
  echo "Commit created. Review and push manually when ready."
fi

popd >/dev/null
