#!/usr/bin/env bash

#
# Lua Test Runner
# Runs all Lua test files in sequence
#

set -e  # Exit on first failure

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

# Run each test file
for test_file in "${TEST_FILES[@]}"; do
  test_path="$SCRIPT_DIR/$test_file"
  if [ -f "$test_path" ]; then
    echo "→ Running $test_file"
    lua5.4 "$test_path"
  else
    echo "✗ Test file not found: $test_file"
    exit 1
  fi
done

echo
echo "✅ All Lua tests passed!"
