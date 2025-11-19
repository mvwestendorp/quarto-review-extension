#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Check if example/_output exists
if [ ! -d "$ROOT_DIR/example/_output" ]; then
  echo "❌ Error: example/_output directory not found"
  echo ""
  echo "E2E tests require the example to be built first."
  echo "Please run the following commands:"
  echo ""
  echo "  1. Build the extension:"
  echo "     npm run build"
  echo ""
  echo "  2. Render the example:"
  echo "     cd example && quarto render && cd .."
  echo ""
  echo "  3. Then run e2e tests:"
  echo "     npm run test:e2e"
  echo ""
  exit 1
fi

if [ -z "${PLAYWRIGHT_BROWSERS_PATH:-}" ]; then
  export PLAYWRIGHT_BROWSERS_PATH="$ROOT_DIR/node_modules/.cache/playwright"
fi

install_browsers() {
  if [ -d "$PLAYWRIGHT_BROWSERS_PATH" ] && [ -n "$(ls -A "$PLAYWRIGHT_BROWSERS_PATH" 2>/dev/null)" ]; then
    return
  fi
  local install_args=("chromium")
  if [ "$(id -u)" -eq 0 ]; then
    install_args=(--with-deps chromium)
  fi
  npx playwright install "${install_args[@]}" >/dev/null
}

install_browsers

RUN_CMD=("npx" "playwright" "test")
if [ "$#" -gt 0 ]; then
  RUN_CMD+=("$@")
fi

if command -v xvfb-run >/dev/null 2>&1 && [ -z "${DISPLAY:-}" ]; then
  exec xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' "${RUN_CMD[@]}"
else
  exec "${RUN_CMD[@]}"
fi
