#!/usr/bin/env bash

## Render the review fixtures site.
##
## Usage:
##   scripts/fixtures/render-review.sh [--branch <branch>] [--quarto <path>] [--clean]
##
## Environment variables:
##   FIXTURE_REPO    Path to the fixtures repository (default: fixtures/github)
##   QUARTO_BIN      Quarto executable (default: quarto)
##
## This script renders all QMD files in the fixtures repository into the
## `public/` directory (by default) so they can be published via GitHub Pages.

set -euo pipefail

FIXTURE_REPO="${FIXTURE_REPO:-fixtures/github}"
QUARTO_BIN="${QUARTO_BIN:-quarto}"
TARGET_BRANCH=""
CLEAN=false

usage() {
  grep '^##' "$0" | sed -e 's/^## \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --quarto)
      QUARTO_BIN="$2"
      shift 2
      ;;
    --clean)
      CLEAN=true
      shift
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

if [[ ! -d "$FIXTURE_REPO" ]]; then
  echo "Fixture repository not found at $FIXTURE_REPO" >&2
  exit 1
fi

pushd "$FIXTURE_REPO" >/dev/null

if [[ -n "$TARGET_BRANCH" ]]; then
  git fetch origin "$TARGET_BRANCH" >/dev/null 2>&1 || true
  git checkout "$TARGET_BRANCH"
fi

if ! command -v "$QUARTO_BIN" >/dev/null 2>&1; then
  echo "Quarto binary not found: $QUARTO_BIN" >&2
  exit 1
fi

# Workaround for environments where Quarto's caches reside on read-only FS
export QUARTO_DISABLE_SCSS_CACHE=1
export QUARTO_DISABLE_SASS_CACHE=1
if [[ -z "${QUARTO_USER_DIR:-}" ]]; then
  export QUARTO_USER_DIR="${PWD}/.quarto"
fi
mkdir -p "$QUARTO_USER_DIR"

CACHE_ROOT=$(mktemp -d -t quarto-cache-XXXXXX)
export QUARTO_DENO_KV_PATH="$CACHE_ROOT/quarto-kv.db"
export DENO_KV_PATH="$CACHE_ROOT/quarto-kv.db"
export DENO_DIR="$CACHE_ROOT/deno"
mkdir -p "$DENO_DIR"
touch "$QUARTO_DENO_KV_PATH"
chmod 600 "$QUARTO_DENO_KV_PATH"
export XDG_CACHE_HOME="$CACHE_ROOT/xdg"
mkdir -p "$XDG_CACHE_HOME"

if $CLEAN && [[ -d "_site" ]]; then
  rm -rf _site
fi

echo "Rendering Quarto fixtures with $QUARTO_BIN…"

if [[ -f "_quarto.yml" || -f "_quarto.yaml" ]]; then
  "$QUARTO_BIN" render --no-cache
else
  mkdir -p _site
  shopt -s nullglob
  qmd_files=(*.qmd)
  shopt -u nullglob
  if [[ ${#qmd_files[@]} -eq 0 ]]; then
    echo "No QMD files found in $PWD" >&2
    exit 1
  fi
  for file in "${qmd_files[@]}"; do
    echo "Rendering $file"
    "$QUARTO_BIN" render "$file" --output-dir _site --no-cache
  done
fi

echo "Quarto rendering complete."
popd >/dev/null
