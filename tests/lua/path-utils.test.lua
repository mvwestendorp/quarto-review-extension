#!/usr/bin/env lua5.4
-- Test suite for path-utils.lua module

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

function TestSuite:run()
  print("Running Path Utils Test Suite\n")
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

-- Load the module
package.path = package.path .. ";./_extensions/review/lib/?.lua"
local path_utils = require('path-utils')

-- Tests
local suite = TestSuite

-- to_forward_slashes tests
suite:add("Converts backslashes to forward slashes", function(s)
  local result = path_utils.to_forward_slashes("path\\to\\file")
  s:assertEqual(result, "path/to/file", "Should convert backslashes")
end)

suite:add("Handles nil input in to_forward_slashes", function(s)
  local result = path_utils.to_forward_slashes(nil)
  s:assertEqual(result, "", "Should return empty string for nil")
end)

suite:add("Preserves forward slashes", function(s)
  local result = path_utils.to_forward_slashes("path/to/file")
  s:assertEqual(result, "path/to/file", "Should preserve forward slashes")
end)

suite:add("Handles mixed slashes", function(s)
  local result = path_utils.to_forward_slashes("path\\to/file")
  s:assertEqual(result, "path/to/file", "Should convert all to forward slashes")
end)

-- normalize_path tests
suite:add("Normalizes relative paths with dot", function(s)
  local result = path_utils.normalize_path("path/./to/file")
  s:assertEqual(result, "path/to/file", "Should remove dot segments")
end)

suite:add("Resolves parent directory references", function(s)
  local result = path_utils.normalize_path("path/to/../file")
  s:assertEqual(result, "path/file", "Should resolve .. segments")
end)

suite:add("Handles nil input in normalize_path", function(s)
  local result = path_utils.normalize_path(nil)
  s:assertEqual(result, ".", "Should return . for nil")
end)

suite:add("Handles empty string in normalize_path", function(s)
  local result = path_utils.normalize_path("")
  s:assertEqual(result, ".", "Should return . for empty string")
end)

suite:add("Normalizes absolute Unix paths", function(s)
  local result = path_utils.normalize_path("/path/./to/file")
  s:assertEqual(result, "/path/to/file", "Should normalize absolute paths")
end)

suite:add("Normalizes Windows paths", function(s)
  local result = path_utils.normalize_path("C:\\path\\to\\file")
  s:assertEqual(result, "C:/path/to/file", "Should normalize Windows paths")
end)

suite:add("Handles root path", function(s)
  local result = path_utils.normalize_path("/")
  s:assertEqual(result, "/", "Should preserve root")
end)

suite:add("Handles Windows drive root", function(s)
  local result = path_utils.normalize_path("C:\\")
  s:assertEqual(result, "C:/", "Should normalize drive root")
end)

suite:add("Removes multiple consecutive dots", function(s)
  local result = path_utils.normalize_path("a/b/../../c")
  s:assertEqual(result, "c", "Should handle multiple ..")
end)

-- join_paths tests
suite:add("Joins two relative paths", function(s)
  local result = path_utils.join_paths("base", "child")
  s:assertEqual(result, "base/child", "Should join paths")
end)

suite:add("Handles nil base in join_paths", function(s)
  local result = path_utils.join_paths(nil, "child")
  s:assertEqual(result, "child", "Should return child for nil base")
end)

suite:add("Handles nil child in join_paths", function(s)
  local result = path_utils.join_paths("base", nil)
  s:assertEqual(result, "base", "Should return base for nil child")
end)

suite:add("Handles absolute child path", function(s)
  local result = path_utils.join_paths("base", "/absolute/path")
  s:assertEqual(result, "/absolute/path", "Should use absolute child")
end)

suite:add("Handles Windows absolute child", function(s)
  local result = path_utils.join_paths("base", "C:\\absolute\\path")
  s:assertEqual(result, "C:/absolute/path", "Should use Windows absolute")
end)

suite:add("Normalizes joined result", function(s)
  local result = path_utils.join_paths("base/./", "./file")
  s:assertEqual(result, "base/file", "Should normalize result")
end)

suite:add("Handles dot base in join_paths", function(s)
  local result = path_utils.join_paths(".", "child")
  s:assertEqual(result, "child", "Should handle dot base")
end)

suite:add("Handles root base in join_paths", function(s)
  local result = path_utils.join_paths("/", "child")
  s:assertEqual(result, "/child", "Should join to root")
end)

-- parent_directory tests
suite:add("Returns parent of relative path", function(s)
  local result = path_utils.parent_directory("path/to/file")
  s:assertEqual(result, "path/to", "Should return parent")
end)

suite:add("Returns parent of absolute path", function(s)
  local result = path_utils.parent_directory("/path/to/file")
  s:assertEqual(result, "/path/to", "Should return parent of absolute")
end)

suite:add("Returns dot for single segment", function(s)
  local result = path_utils.parent_directory("file")
  s:assertEqual(result, ".", "Should return dot for single segment")
end)

suite:add("Returns root for root path", function(s)
  local result = path_utils.parent_directory("/")
  s:assertEqual(result, "/", "Should return root")
end)

suite:add("Handles Windows parent", function(s)
  local result = path_utils.parent_directory("C:\\path\\to\\file")
  s:assertEqual(result, "C:/path/to", "Should handle Windows paths")
end)

-- make_relative tests
suite:add("Makes path relative to base", function(s)
  local result = path_utils.make_relative("/base/path/file", "/base/path")
  s:assertEqual(result, "file", "Should make relative")
end)

suite:add("Handles dot base in make_relative", function(s)
  local result = path_utils.make_relative("path/file", ".")
  s:assertEqual(result, "path/file", "Should return unchanged for dot")
end)

suite:add("Handles non-matching paths", function(s)
  local result = path_utils.make_relative("/other/path/file", "/base/path")
  s:assertEqual(result, "/other/path/file", "Should return unchanged")
end)

suite:add("Handles root base in make_relative", function(s)
  local result = path_utils.make_relative("/path/file", "/")
  s:assertEqual(result, "path/file", "Should strip leading /")
end)

-- file_exists tests
suite:add("Returns true for existing file", function(s)
  local result = path_utils.file_exists("tests/lua/path-utils.test.lua")
  s:assertTrue(result, "Should find this test file")
end)

suite:add("Returns false for non-existent file", function(s)
  local result = path_utils.file_exists("non_existent_file_xyz.txt")
  s:assertFalse(result, "Should return false for non-existent")
end)

-- read_file tests
suite:add("Reads existing file", function(s)
  local content = path_utils.read_file("tests/lua/path-utils.test.lua")
  s:assertTrue(content ~= nil, "Should read content")
  s:assertTrue(string.find(content, "Path Utils Test Suite"), "Should contain test suite text")
end)

suite:add("Returns nil for non-existent file", function(s)
  local content = path_utils.read_file("non_existent_file_xyz.txt")
  s:assertEqual(content, nil, "Should return nil")
end)

-- Cross-platform tests
suite:add("Normalizes Windows backslashes", function(s)
  local result = path_utils.normalize_path("C:\\Users\\test\\file.txt")
  s:assertEqual(result, "C:/Users/test/file.txt", "Should normalize Windows")
end)

suite:add("Handles Unix absolute paths", function(s)
  local result = path_utils.normalize_path("/home/user/file.txt")
  s:assertEqual(result, "/home/user/file.txt", "Should handle Unix")
end)

suite:add("Consistently handles relative paths", function(s)
  local result = path_utils.normalize_path("path/to/file")
  s:assertEqual(result, "path/to/file", "Should handle relative")
end)

-- Edge cases
suite:add("Handles paths with multiple parent refs", function(s)
  local result = path_utils.normalize_path("a/b/c/../../d")
  s:assertEqual(result, "a/d", "Should resolve multiple ..")
end)

suite:add("Handles empty segments", function(s)
  local result = path_utils.normalize_path("path//to///file")
  s:assertEqual(result, "path/to/file", "Should remove empty segments")
end)

suite:add("Handles trailing slash", function(s)
  local result = path_utils.normalize_path("path/to/file/")
  s:assertEqual(result, "path/to/file", "Should remove trailing slash")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
