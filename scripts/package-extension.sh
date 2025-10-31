#!/usr/bin/env bash

# Package the Quarto review extension into a distributable archive.
#
# Usage:
#   scripts/package-extension.sh [--skip-build]
#
# Outputs a zip file under dist/packages containing the `_extensions/review`
# directory (including built assets).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/dist/packages"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      ;;
    -h|--help)
      grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if ! $SKIP_BUILD; then
  pushd "$ROOT_DIR" >/dev/null
  npm run build
  popd >/dev/null
fi

if [[ ! -d "$ROOT_DIR/_extensions/review" ]]; then
  echo "Extension directory not found at _extensions/review" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
ARCHIVE="$OUTPUT_DIR/quarto-review-extension-$VERSION.zip"

echo "Creating package $ARCHIVE"
rm -f "$ARCHIVE"
pushd "$ROOT_DIR" >/dev/null
zip -r "$ARCHIVE" _extensions/review -x "*.DS_Store" >/dev/null
popd >/dev/null

echo "Package created at $ARCHIVE"
