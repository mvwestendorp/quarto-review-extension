#!/usr/bin/env lua5.4
-- Comprehensive test suite for Lua filter functions
-- Tests the filename sanitization and ID generation logic

-- Test framework
local TestSuite = {}
TestSuite.tests = {}
TestSuite.passed = 0
TestSuite.failed = 0

function TestSuite:add(name, fn)
  table.insert(self.tests, {name = name, fn = fn})
end

function TestSuite:assertEqual(actual, expected, message)
  if actual ~= expected then
    error(message .. "\n  Expected: " .. tostring(expected) .. "\n  Got: " .. tostring(actual))
  end
end

function TestSuite:assertContains(str, substring, message)
  if not str or not string.find(str, substring, 1, true) then
    error(message .. "\n  String: " .. tostring(str) .. "\n  Should contain: " .. substring)
  end
end

function TestSuite:run()
  print("Running Lua Filter Test Suite\n")
  print(string.rep("=", 60))

  for _, test in ipairs(self.tests) do
    local success, err = pcall(test.fn, self)
    if success then
      self.passed = self.passed + 1
      print("✓ " .. test.name)
    else
      self.failed = self.failed + 1
      print("✗ " .. test.name)
      print("  Error: " .. err)
    end
  end

  print(string.rep("=", 60))
  print("\nResults: " .. self.passed .. " passed, " .. self.failed .. " failed")
  print("Total: " .. (self.passed + self.failed) .. " tests\n")

  return self.failed == 0
end

-- ============================================================================
-- Function implementations (from review.lua)
-- ============================================================================

local function sanitize_identifier(value)
  if not value or value == '' then
    return ''
  end

  -- Step 1: Normalize path separators (backslash to forward slash) for cross-platform support
  -- This handles both Windows and Unix paths
  local normalized = value:gsub('\\', '/')

  -- Step 2: Strip Quarto temporary directories
  -- Quarto uses random temp directories like:
  -- - /tmp/quarto-input-abc123/... (absolute)
  -- - /tmp/quarto-session-xyz789/... (absolute)
  -- - quarto-input-abc123/... (relative, at start)
  -- We match both absolute paths (with leading /) and relative paths (at start)

  -- First, handle absolute paths or paths with leading content
  normalized = normalized:gsub('^.*/quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^.*/quarto%-session[^/]+/', '')

  -- Then, handle relative paths that start with quarto dirs
  normalized = normalized:gsub('^quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^quarto%-session[^/]+/', '')

  -- Step 3: Strip leading ./ relative path marker
  normalized = normalized:gsub('^%./', '')

  -- Step 4: Remove file extension (handles single extension like .qmd, .md, etc.)
  local without_extension = normalized:gsub('%.%w+$', '')

  -- Replace path separators with hyphens to preserve directory structure
  local with_hyphens = without_extension:gsub('/', '-')

  -- Sanitize to valid ID characters: lowercase, replace non-word chars with hyphens
  local sanitized = with_hyphens:lower():gsub('[^%w%-]', '-')

  -- Clean up multiple consecutive hyphens
  sanitized = sanitized:gsub('%-+', '-')

  -- Remove leading and trailing hyphens
  sanitized = sanitized:gsub('^%-+', ''):gsub('%-+$', '')

  -- Fallback to 'document' if result is empty
  if sanitized == '' then
    sanitized = 'document'
  end

  return sanitized
end

-- ============================================================================
-- Test Suite
-- ============================================================================

local suite = TestSuite

-- Basic filename tests
suite:add("Simple filename with extension", function(s)
  s:assertEqual(sanitize_identifier("document.qmd"), "document", "Should remove .qmd extension")
end)

suite:add("Markdown file extension", function(s)
  s:assertEqual(sanitize_identifier("intro.md"), "intro", "Should remove .md extension")
end)

suite:add("TypeScript file extension", function(s)
  s:assertEqual(sanitize_identifier("main.ts"), "main", "Should remove .ts extension")
end)

suite:add("HTML file extension", function(s)
  s:assertEqual(sanitize_identifier("index.html"), "index", "Should remove .html extension")
end)

-- Path with directories
suite:add("Single directory level", function(s)
  s:assertEqual(sanitize_identifier("chapters/intro.qmd"), "chapters-intro", "Should convert / to -")
end)

suite:add("Multiple directory levels", function(s)
  s:assertEqual(sanitize_identifier("docs/api/reference.qmd"), "docs-api-reference", "Should handle nested paths")
end)

suite:add("Deep nested path", function(s)
  s:assertEqual(sanitize_identifier("src/modules/ui/components/editor.ts"), "src-modules-ui-components-editor", "Should handle deep nesting")
end)

-- Relative path markers
suite:add("Relative path with ./", function(s)
  s:assertEqual(sanitize_identifier("./document.qmd"), "document", "Should strip leading ./")
end)

suite:add("Relative path with ./ and directories", function(s)
  s:assertEqual(sanitize_identifier("./chapters/intro.qmd"), "chapters-intro", "Should handle both ./ and /")
end)

-- Windows paths (backslashes)
suite:add("Windows path with single backslash", function(s)
  s:assertEqual(sanitize_identifier("chapters\\intro.qmd"), "chapters-intro", "Should convert \\ to -")
end)

suite:add("Windows path with multiple backslashes", function(s)
  s:assertEqual(sanitize_identifier("docs\\api\\reference.qmd"), "docs-api-reference", "Should handle multiple \\")
end)

suite:add("Mixed forward and backslashes", function(s)
  local result = sanitize_identifier("docs/api\\reference.qmd")
  s:assertEqual(result, "docs-api-reference", "Should normalize mixed separators")
end)

-- Quarto temporary directories
suite:add("Quarto input temp directory", function(s)
  s:assertEqual(sanitize_identifier("/tmp/quarto-input-abc123/document.qmd"), "document", "Should strip quarto-input-*")
end)

suite:add("Quarto session temp directory", function(s)
  s:assertEqual(sanitize_identifier("/tmp/quarto-session-xyz789/document.qmd"), "document", "Should strip quarto-session-*")
end)

suite:add("Quarto input with relative path", function(s)
  s:assertEqual(sanitize_identifier("quarto-input-xyz/chapters/intro.qmd"), "chapters-intro", "Should strip quarto dirs and keep rest")
end)

suite:add("Absolute path with quarto temp", function(s)
  s:assertEqual(sanitize_identifier("/home/user/quarto-input-123/docs/guide.qmd"), "docs-guide", "Should strip from quarto marker onward")
end)

-- Special characters
suite:add("Filename with hyphen", function(s)
  s:assertEqual(sanitize_identifier("my-document.qmd"), "my-document", "Should preserve hyphens")
end)

suite:add("Filename with underscore", function(s)
  s:assertEqual(sanitize_identifier("my_document.qmd"), "my-document", "Should convert _ to -")
end)

suite:add("Filename with space", function(s)
  s:assertEqual(sanitize_identifier("my document.qmd"), "my-document", "Should convert spaces to -")
end)

suite:add("Filename with parentheses", function(s)
  s:assertEqual(sanitize_identifier("document (draft).qmd"), "document-draft", "Should remove special chars")
end)

suite:add("Filename with dots", function(s)
  s:assertEqual(sanitize_identifier("document.backup.qmd"), "document-backup", "Should handle multiple dots")
end)

suite:add("Filename with special chars", function(s)
  s:assertEqual(sanitize_identifier("doc@2024#final!.qmd"), "doc-2024-final", "Should remove @#! symbols")
end)

-- Case handling
suite:add("Uppercase filename", function(s)
  s:assertEqual(sanitize_identifier("DOCUMENT.QMD"), "document", "Should convert to lowercase")
end)

suite:add("Mixed case with hyphen", function(s)
  s:assertEqual(sanitize_identifier("My-Document.QMD"), "my-document", "Should lowercase and preserve hyphen")
end)

suite:add("CamelCase filename", function(s)
  s:assertEqual(sanitize_identifier("MyDocument.qmd"), "mydocument", "Should convert to lowercase")
end)

-- Edge cases
suite:add("Empty string", function(s)
  s:assertEqual(sanitize_identifier(""), "", "Should return empty string")
end)

suite:add("Nil value", function(s)
  s:assertEqual(sanitize_identifier(nil), "", "Should handle nil gracefully")
end)

suite:add("Whitespace only", function(s)
  s:assertEqual(sanitize_identifier("   "), "document", "Should fallback to 'document'")
end)

suite:add("Only extension", function(s)
  s:assertEqual(sanitize_identifier(".qmd"), "document", "Should fallback to 'document' when nothing left")
end)

suite:add("Multiple extensions", function(s)
  s:assertEqual(sanitize_identifier("...qmd"), "document", "Should handle multiple dots")
end)

suite:add("Leading hyphens", function(s)
  s:assertEqual(sanitize_identifier("---document.qmd"), "document", "Should remove leading hyphens")
end)

suite:add("Trailing hyphens", function(s)
  s:assertEqual(sanitize_identifier("document---.qmd"), "document", "Should remove trailing hyphens")
end)

suite:add("Multiple consecutive hyphens in middle", function(s)
  s:assertEqual(sanitize_identifier("my---document.qmd"), "my-document", "Should collapse consecutive hyphens")
end)

suite:add("Only hyphens and extensions", function(s)
  s:assertEqual(sanitize_identifier("---.qmd"), "document", "Should fallback to document")
end)

-- Uniqueness tests (files with same name in different dirs should differ)
suite:add("Same filename different directories", function(s)
  local intro1 = sanitize_identifier("chapters/intro.qmd")
  local intro2 = sanitize_identifier("appendix/intro.qmd")
  s:assertContains(intro1, "chapters", "Should contain 'chapters'")
  s:assertContains(intro2, "appendix", "Should contain 'appendix'")
  -- They should be different
  if intro1 == intro2 then
    error("Files in different directories should produce different IDs")
  end
end)

-- Complex real-world examples
suite:add("Real example: API documentation", function(s)
  s:assertEqual(sanitize_identifier("docs/api/reference.qmd"), "docs-api-reference", "Should handle real doc path")
end)

suite:add("Real example: chapter with spaces", function(s)
  s:assertEqual(sanitize_identifier("chapters/chapter 1 - introduction.qmd"), "chapters-chapter-1-introduction", "Should handle spaces and hyphens")
end)

suite:add("Real example: src/modules structure", function(s)
  s:assertEqual(sanitize_identifier("src/modules/changes/index.ts"), "src-modules-changes-index", "Should handle TypeScript path")
end)

suite:add("Real example: with version numbers", function(s)
  s:assertEqual(sanitize_identifier("docs/v2.0/guide.qmd"), "docs-v2-0-guide", "Should handle dots in path")
end)

-- Cross-platform Windows path tests
suite:add("Windows absolute path C: drive", function(s)
  s:assertEqual(sanitize_identifier("C:\\Users\\project\\document.qmd"), "c-users-project-document", "Should handle Windows C: paths")
end)

suite:add("Windows absolute path with spaces", function(s)
  s:assertEqual(sanitize_identifier("C:\\Users\\My Documents\\document.qmd"), "c-users-my-documents-document", "Should handle spaces in Windows paths")
end)

suite:add("Windows path with mixed separators", function(s)
  s:assertEqual(sanitize_identifier("C:\\project\\src/modules\\changes.ts"), "c-project-src-modules-changes", "Should normalize mixed separators")
end)

suite:add("Windows path with Quarto temp dir", function(s)
  s:assertEqual(sanitize_identifier("C:\\temp\\quarto-input-abc123\\document.qmd"), "document", "Should strip quarto-input on Windows")
end)

suite:add("Windows path with dots in directory names", function(s)
  s:assertEqual(sanitize_identifier("C:\\v2.0\\docs\\guide.qmd"), "c-v2-0-docs-guide", "Should handle dots in Windows dir names")
end)

-- Cross-platform relative path tests
suite:add("Relative path on Windows style", function(s)
  -- Note: In Lua test, backslashes are literal in paths
  local result = sanitize_identifier(".\\chapters\\intro.qmd")
  s:assertEqual(result, "chapters-intro", "Should handle .\\ relative paths")
end)

suite:add("Relative path with backslashes and forward slashes", function(s)
  local result = sanitize_identifier("docs\\api/reference.qmd")
  s:assertEqual(result, "docs-api-reference", "Should normalize mixed separators in relative paths")
end)

-- Drive letter edge cases
suite:add("Windows UNC path", function(s)
  s:assertEqual(sanitize_identifier("\\\\server\\share\\document.qmd"), "server-share-document", "Should handle UNC paths")
end)

suite:add("Multiple drive letters in path (edge case)", function(s)
  -- This shouldn't happen in practice but test robustness
  s:assertEqual(sanitize_identifier("C:\\D:\\project\\document.qmd"), "c-d-project-document", "Should handle unusual Windows paths")
end)

-- Unicode and extended characters
suite:add("Path with Unicode characters", function(s)
  -- Unicode accented characters get decomposed and sanitized
  -- é becomes e with combining acute, which gets replaced
  -- This is correct behavior - HTML IDs must be ASCII-safe
  local result = sanitize_identifier("docs/détails/guide.qmd")
  -- Result should be valid: only alphanumeric and hyphens
  if string.match(result, "^[%w%-]+$") then
    -- Valid: contains only word chars and hyphens
  else
    error("Unicode path should produce valid ID characters")
  end
end)

suite:add("Path with emojis (edge case)", function(s)
  -- Non-word characters including emojis should be replaced with hyphens
  local result = sanitize_identifier("docs/guide📋.qmd")
  -- Result should not contain emoji, just hyphens and alphanumeric
  if string.match(result, "^[%w%-]+$") then
    -- Valid: contains only word chars and hyphens
  else
    error("Path with emoji should produce valid ID characters")
  end
end)

-- Absolute vs relative path normalization
suite:add("Absolute Unix path with home directory", function(s)
  s:assertEqual(sanitize_identifier("/home/user/projects/document.qmd"), "home-user-projects-document", "Should handle Unix home paths")
end)

suite:add("Root absolute Unix path", function(s)
  s:assertEqual(sanitize_identifier("/tmp/document.qmd"), "tmp-document", "Should handle Unix root paths")
end)

-- ============================================================================
-- Title ID generation tests
-- ============================================================================

-- Helper function to generate title ID like the Lua filter does
local function generate_title_id(filename_prefix)
  local separator = "."
  return filename_prefix .. separator .. "document-title"
end

suite:add("Title ID generation for simple document", function(s)
  local filename_prefix = sanitize_identifier("document.qmd")
  local title_id = generate_title_id(filename_prefix)
  s:assertEqual(title_id, "document.document-title", "Should generate correct title ID")
end)

suite:add("Title ID generation for nested document", function(s)
  local filename_prefix = sanitize_identifier("docs/guide.qmd")
  local title_id = generate_title_id(filename_prefix)
  s:assertEqual(title_id, "docs-guide.document-title", "Should generate correct title ID with path")
end)

suite:add("Title ID generation for Windows path", function(s)
  local filename_prefix = sanitize_identifier("C:\\Users\\project\\document.qmd")
  local title_id = generate_title_id(filename_prefix)
  s:assertEqual(title_id, "c-users-project-document.document-title", "Should generate title ID from Windows path")
end)

suite:add("Title ID is always unique per document", function(s)
  local id1 = generate_title_id(sanitize_identifier("chapters/intro.qmd"))
  local id2 = generate_title_id(sanitize_identifier("appendix/intro.qmd"))
  -- Different directories = different prefix = different title IDs
  if id1 == id2 then
    error("Title IDs should be unique for different documents")
  end
end)

-- ============================================================================
-- Run tests
-- ============================================================================

local success = suite:run()

if not success then
  os.exit(1)
end
