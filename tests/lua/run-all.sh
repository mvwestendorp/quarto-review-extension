#!/usr/bin/env bash

#
# Lua Test Runner
# Runs all Lua test files in sequence, always executing every file
# even when earlier ones fail.  Exits non-zero if any file failed.
#

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Array of test files in execution order
TEST_FILES=(
  "sanitize-identifier.test.lua"
  "path-utils.test.lua"
  "string-utils.test.lua"
  "config.test.lua"
  "project-detection.test.lua"
  "markdown-conversion.test.lua"
  "element-wrapping.test.lua"
)

echo "Running Lua tests..."
echo

failed_files=()

for test_file in "${TEST_FILES[@]}"; do
  test_path="$SCRIPT_DIR/$test_file"
  if [ -f "$test_path" ]; then
    echo "→ Running $test_file"
    if ! lua5.4 "$test_path"; then
      failed_files+=("$test_file")
    fi
    echo
  else
    echo "✗ Test file not found: $test_file"
    failed_files+=("$test_file")
  fi
done

if [ ${#failed_files[@]} -gt 0 ]; then
  echo "✗ ${#failed_files[@]} test file(s) had failures:"
  for f in "${failed_files[@]}"; do
    echo "  - $f"
  done
  exit 1
fi

echo "✅ All Lua tests passed!"
