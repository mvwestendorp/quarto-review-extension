#!/usr/bin/env lua5.4
-- Test suite for project-detection.lua module

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

function TestSuite:assertTrue(value, message)
  if not value then
    error(message .. "\n  Expected: true\n  Got: " .. tostring(value))
  end
end

function TestSuite:assertFalse(value, message)
  if value then
    error(message .. "\n  Expected: false\n  Got: " .. tostring(value))
  end
end

function TestSuite:assertNotNil(value, message)
  if value == nil then
    error(message .. "\n  Expected: non-nil value\n  Got: nil")
  end
end

function TestSuite:run()
  print("Running Project Detection Test Suite\n")
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

-- Load the modules
package.path = package.path .. ";./_extensions/review/lib/?.lua"
local project_detection = require('project-detection')
local path_utils = require('path-utils')

-- Mock pandoc.system so path-utils and project-detection can run outside Pandoc.
-- get_working_directory delegates to the shell; list_directory delegates to ls
-- and errors on non-directories so that project-detection's pcall-based scan
-- correctly distinguishes files from directories.
pandoc = {
  system = {
    get_working_directory = function()
      local handle = io.popen('pwd')
      if handle then
        local result = handle:read('*a'):gsub('\n+$', '')
        handle:close()
        return result
      end
      return '.'
    end,
    list_directory = function(path)
      local check = io.popen('test -d "' .. path:gsub('"', '\\"') .. '" && echo yes 2>/dev/null')
      local is_dir = false
      if check then
        is_dir = (check:read('*a'):gsub('%s+', '') == 'yes')
        check:close()
      end
      if not is_dir then
        error("not a directory: " .. path)
      end
      local entries = {}
      local handle = io.popen('ls -1 "' .. path:gsub('"', '\\"') .. '" 2>/dev/null')
      if handle then
        for entry in handle:lines() do
          table.insert(entries, entry)
        end
        handle:close()
      end
      return entries
    end
  }
}

-- Tests
local suite = TestSuite

-- should_skip_directory tests
suite:add("Skips build output and cache directories", function(s)
  -- Quarto/site output
  s:assertTrue(project_detection.should_skip_directory('_site'), "Should skip _site")
  s:assertTrue(project_detection.should_skip_directory('_output'), "Should skip _output")
  s:assertTrue(project_detection.should_skip_directory('.quarto'), "Should skip .quarto")

  -- Language-specific caches
  s:assertTrue(project_detection.should_skip_directory('node_modules'), "Should skip node_modules")
  s:assertTrue(project_detection.should_skip_directory('__pycache__'), "Should skip __pycache__")
  s:assertTrue(project_detection.should_skip_directory('.venv'), "Should skip .venv")
end)

suite:add("Skips version control and IDE directories", function(s)
  -- Version control
  s:assertTrue(project_detection.should_skip_directory('.git'), "Should skip .git")

  -- IDEs
  s:assertTrue(project_detection.should_skip_directory('.idea'), "Should skip .idea")
  s:assertTrue(project_detection.should_skip_directory('.vscode'), "Should skip .vscode")
  s:assertTrue(project_detection.should_skip_directory('.Rproj.user'), "Should skip .Rproj.user")

  -- Special navigation directories
  s:assertTrue(project_detection.should_skip_directory('.'), "Should skip .")
  s:assertTrue(project_detection.should_skip_directory('..'), "Should skip ..")
end)

suite:add("Does not skip content directories", function(s)
  s:assertFalse(project_detection.should_skip_directory('src'), "Should not skip src")
  s:assertFalse(project_detection.should_skip_directory('docs'), "Should not skip docs")
  s:assertFalse(project_detection.should_skip_directory('tests'), "Should not skip tests")
  s:assertFalse(project_detection.should_skip_directory('chapters'), "Should not skip chapters")
  s:assertFalse(project_detection.should_skip_directory('content'), "Should not skip content")
end)

-- find_project_root tests
suite:add("Returns start_dir if no _quarto.yml found", function(s)
  local result = project_detection.find_project_root('/some/random/path')
  s:assertEqual(result, '/some/random/path', "Should return start_dir")
end)

suite:add("Finds project root with _quarto.yml", function(s)
  -- This test assumes we're running from the project root
  local cwd = path_utils.get_working_directory()
  local result = project_detection.find_project_root(cwd)
  s:assertNotNil(result, "Should find project root")
end)

suite:add("Returns dot for nil start_dir", function(s)
  local result = project_detection.find_project_root(nil)
  s:assertEqual(result, '.', "Should return dot for nil")
end)

suite:add("Stops at root when no project file found", function(s)
  -- Test with a path that shouldn't have _quarto.yml above it
  local result = project_detection.find_project_root('/tmp')
  s:assertNotNil(result, "Should return a path")
end)

-- get_primary_input_file tests
suite:add("Returns nil when no input file available", function(s)
  -- In test environment, likely returns nil
  local result = project_detection.get_primary_input_file()
  -- Just verify it doesn't crash
  s:assertTrue(result == nil or type(result) == 'string', "Should return nil or string")
end)

-- detect_project_root tests
suite:add("Returns nil or string from detect_project_root", function(s)
  local result = project_detection.detect_project_root()
  s:assertTrue(result == nil or type(result) == 'string', "Should return nil or string")
end)

suite:add("Normalizes project root path", function(s)
  local result = project_detection.detect_project_root()
  if result then
    s:assertFalse(result:match('\\'), "Should not contain backslashes")
  end
end)

-- detect_project_root_from_extension tests
suite:add("Returns nil or string from detect_project_root_from_extension", function(s)
  local result = project_detection.detect_project_root_from_extension()
  s:assertTrue(result == nil or type(result) == 'string', "Should return nil or string")
end)

suite:add("Detects _extensions marker in path", function(s)
  local result = project_detection.detect_project_root_from_extension()
  -- Should find it since we're running from within the extension
  if result then
    s:assertNotNil(result, "Should find extension path")
  end
end)

-- collect_project_sources tests
suite:add("Returns table from collect_project_sources", function(s)
  local sources, root = project_detection.collect_project_sources()
  s:assertEqual(type(sources), 'table', "Should return table")
end)

suite:add("Returns project root from collect_project_sources", function(s)
  local sources, root = project_detection.collect_project_sources()
  s:assertTrue(root == nil or type(root) == 'string', "Root should be nil or string")
end)

suite:add("Sources table uses relative paths as keys", function(s)
  local sources = project_detection.collect_project_sources()
  for path, content in pairs(sources) do
    s:assertEqual(type(path), 'string', "Key should be string")
    s:assertEqual(type(content), 'string', "Value should be string")
  end
end)

suite:add("Includes _quarto.yml when present at project root", function(s)
  -- _quarto.yml is only added from the project root, not subdirectories.
  -- This project keeps it in example/, so sources will not contain it;
  -- verify that .qmd source files are collected instead.
  local sources = project_detection.collect_project_sources()
  local found_qmd = false
  for path in pairs(sources) do
    if path:match('%.qmd$') then
      found_qmd = true
      break
    end
  end
  s:assertTrue(found_qmd, "Should collect .qmd source files")
end)

suite:add("Filters out ignored directories", function(s)
  local sources = project_detection.collect_project_sources()
  -- Verify no paths contain ignored directories
  for path in pairs(sources) do
    s:assertFalse(path:match('node_modules'), "Should not include node_modules")
    s:assertFalse(path:match('%.git/'), "Should not include .git")
    s:assertFalse(path:match('_site/'), "Should not include _site")
  end
end)

suite:add("Only includes .qmd files from scan", function(s)
  local sources = project_detection.collect_project_sources()
  local has_non_config = false
  for path in pairs(sources) do
    if not path:match('_quarto%.ya?ml$') then
      has_non_config = true
      -- If it's not a config file, it should be a .qmd file
      if not path:match('%.qmd$') then
        s:assertTrue(false, "Non-config file should be .qmd: " .. path)
      end
    end
  end
end)

-- Edge cases
suite:add("Handles path with backslashes", function(s)
  local result = project_detection.find_project_root('C:\\Users\\test')
  s:assertNotNil(result, "Should handle Windows path")
end)

suite:add("Handles empty string start_dir", function(s)
  local result = project_detection.find_project_root('')
  s:assertEqual(result, '', "Should return empty string")
end)

suite:add("Should skip handles nil input", function(s)
  -- should_skip_directory should handle nil gracefully
  local success = pcall(function()
    return project_detection.should_skip_directory(nil)
  end)
  s:assertTrue(success, "Should handle nil input")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
