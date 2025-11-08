#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
