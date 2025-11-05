#!/usr/bin/env lua5.4
-- Test suite for string-utils.lua module

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

function TestSuite:assertContains(str, substring, message)
  if not str or not string.find(str, substring, 1, true) then
    error(message .. "\n  String: " .. tostring(str) .. "\n  Should contain: " .. substring)
  end
end

function TestSuite:run()
  print("Running String Utils Test Suite\n")
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
local string_utils = require('string-utils')

-- Tests
local suite = TestSuite

-- escape_html tests
suite:add("Escapes less than and greater than", function(s)
  local result = string_utils.escape_html("<tag>")
  s:assertEqual(result, "&lt;tag&gt;", "Should escape < and >")
end)

suite:add("Escapes ampersand", function(s)
  local result = string_utils.escape_html("A & B")
  s:assertEqual(result, "A &amp; B", "Should escape &")
end)

suite:add("Escapes double quotes", function(s)
  local result = string_utils.escape_html('"test"')
  s:assertContains(result, "quot", "Should escape quotes")
end)

suite:add("Handles empty string in escape_html", function(s)
  local result = string_utils.escape_html("")
  s:assertEqual(result, "", "Should return empty string")
end)

suite:add("Handles normal text without special chars", function(s)
  local result = string_utils.escape_html("test")
  s:assertEqual(result, "test", "Should return unchanged")
end)

suite:add("Escapes mixed HTML content", function(s)
  local result = string_utils.escape_html('<div class="test">')
  s:assertContains(result, "&lt;", "Should escape opening bracket")
  s:assertContains(result, "&gt;", "Should escape closing bracket")
end)

-- deepcopy tests
suite:add("Deep copies simple table", function(s)
  local original = {a = 1, b = 2}
  local copy = string_utils.deepcopy(original)
  s:assertEqual(copy.a, 1, "Should copy value a")
  s:assertEqual(copy.b, 2, "Should copy value b")
  s:assertTrue(original ~= copy, "Should be different table reference")
end)

suite:add("Deep copies nested tables", function(s)
  local original = {a = 1, b = {c = 2, d = 3}}
  local copy = string_utils.deepcopy(original)
  s:assertEqual(copy.b.c, 2, "Should copy nested value")
  s:assertTrue(original.b ~= copy.b, "Nested table should be different reference")
end)

suite:add("Handles nil input in deepcopy", function(s)
  local result = string_utils.deepcopy(nil)
  s:assertEqual(result, nil, "Should return nil")
end)

suite:add("Copies array-like tables", function(s)
  local original = {1, 2, 3, 4}
  local copy = string_utils.deepcopy(original)
  s:assertEqual(copy[1], 1, "Should copy first element")
  s:assertEqual(copy[4], 4, "Should copy last element")
end)

suite:add("Creates independent copy", function(s)
  local original = {a = 1, b = {c = 2}}
  local copy = string_utils.deepcopy(original)
  copy.b.c = 99
  s:assertEqual(original.b.c, 2, "Original should not change")
  s:assertEqual(copy.b.c, 99, "Copy should change")
end)

suite:add("Handles deeply nested structures", function(s)
  local original = {a = {b = {c = {d = {e = 1}}}}}
  local copy = string_utils.deepcopy(original)
  s:assertEqual(copy.a.b.c.d.e, 1, "Should copy deep values")
  copy.a.b.c.d.e = 99
  s:assertEqual(original.a.b.c.d.e, 1, "Original should remain unchanged")
end)

-- table_to_json tests
suite:add("Converts simple table to JSON", function(s)
  local tbl = {a = 1, b = 2}
  local json = string_utils.table_to_json(tbl)
  s:assertTrue(json ~= nil, "Should return JSON string")
  s:assertContains(json, "a", "Should contain key 'a'")
end)

suite:add("Converts nested tables to JSON", function(s)
  local tbl = {a = 1, b = {c = 2}}
  local json = string_utils.table_to_json(tbl)
  s:assertTrue(json ~= nil, "Should return JSON string")
end)

suite:add("Converts arrays to JSON", function(s)
  local tbl = {1, 2, 3}
  local json = string_utils.table_to_json(tbl)
  s:assertTrue(json ~= nil, "Should return JSON string")
  s:assertContains(json, "1", "Should contain value 1")
  s:assertContains(json, "2", "Should contain value 2")
  s:assertContains(json, "3", "Should contain value 3")
end)

suite:add("Handles string values in JSON", function(s)
  local tbl = {name = "test"}
  local json = string_utils.table_to_json(tbl)
  s:assertContains(json, "test", "Should contain string value")
end)

suite:add("Handles boolean values in JSON", function(s)
  local tbl = {enabled = true, disabled = false}
  local json = string_utils.table_to_json(tbl)
  s:assertContains(json, "true", "Should contain true")
  s:assertContains(json, "false", "Should contain false")
end)

suite:add("Handles empty table in JSON", function(s)
  local json = string_utils.table_to_json({})
  s:assertTrue(json ~= nil, "Should return JSON string")
end)

-- generate_id tests
suite:add("Generates non-empty ID", function(s)
  local id = string_utils.generate_id()
  s:assertTrue(id ~= nil and #id > 0, "Should generate non-empty ID")
end)

suite:add("Generates unique IDs", function(s)
  local id1 = string_utils.generate_id()
  local id2 = string_utils.generate_id()
  s:assertTrue(id1 ~= id2, "Should generate different IDs")
end)

suite:add("Generates IDs with prefix", function(s)
  local id = string_utils.generate_id("test")
  s:assertContains(id, "test", "Should include prefix")
end)

suite:add("Generates multiple unique IDs", function(s)
  local ids = {}
  for i = 1, 50 do
    local id = string_utils.generate_id()
    s:assertFalse(ids[id] ~= nil, "Should not generate duplicate: " .. tostring(id))
    ids[id] = true
  end
end)

-- Edge cases
suite:add("Handles very long strings in escape_html", function(s)
  local long_string = string.rep("a", 1000)
  local result = string_utils.escape_html(long_string)
  s:assertTrue(#result >= 1000, "Should handle long strings")
end)

suite:add("Handles special characters in deepcopy keys", function(s)
  local original = {["key-with-dash"] = 1, ["key.with.dot"] = 2}
  local copy = string_utils.deepcopy(original)
  s:assertEqual(copy["key-with-dash"], 1, "Should copy special key 1")
  s:assertEqual(copy["key.with.dot"], 2, "Should copy special key 2")
end)

suite:add("Handles numeric keys in table_to_json", function(s)
  local tbl = {[1] = "first", [2] = "second", [100] = "hundredth"}
  local json = string_utils.table_to_json(tbl)
  s:assertTrue(json ~= nil, "Should handle numeric keys")
end)

suite:add("Handles mixed key types", function(s)
  local tbl = {a = 1, [1] = "one", [2] = "two"}
  local json = string_utils.table_to_json(tbl)
  s:assertTrue(json ~= nil, "Should handle mixed key types")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
