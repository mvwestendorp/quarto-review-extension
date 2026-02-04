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
suite:add("Generates ID with all components", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id = string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  s:assertEqual(id, "doc.para-1-occ1", "Should generate ID with prefix and counter")
  s:assertEqual(counters["Para"], 1, "Should increment counter")
end)

suite:add("Generates IDs with section stack", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id = string_utils.generate_id("doc", ".", {"intro", "background"}, counters, "Para", nil)
  s:assertEqual(id, "doc.intro.background.para-1-occ1", "Should include section hierarchy")
end)

suite:add("Generates IDs with level", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id = string_utils.generate_id("doc", ".", {}, counters, "Header", 2)
  s:assertEqual(id, "doc.header-1-occ1", "Should generate header ID")
  s:assertEqual(counters["Header-2"], 1, "Should use level in counter key")
end)

suite:add("Increments counters correctly", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id1 = string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  local id2 = string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  local id3 = string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  s:assertEqual(id1, "doc.para-1-occ1", "First para should be para-1-occ1")
  s:assertEqual(id2, "doc.para-2-occ2", "Second para should be para-2-occ2")
  s:assertEqual(id3, "doc.para-3-occ3", "Third para should be para-3-occ3")
  s:assertEqual(counters["Para"], 3, "Counter should be 3")
end)

suite:add("Uses custom separator", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id = string_utils.generate_id("doc", "-", {"section"}, counters, "Para", nil)
  s:assertEqual(id, "doc-section-para-1-occ1", "Should use custom separator")
end)

suite:add("Handles empty prefix", function(s)
  string_utils.reset_global_counter()
  local counters = {}
  local id = string_utils.generate_id("", ".", {}, counters, "Para", nil)
  s:assertEqual(id, ".para-1-occ1", "Should work with empty prefix")
end)

suite:add("Different element types have separate counters", function(s)
  local counters = {}
  string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  string_utils.generate_id("doc", ".", {}, counters, "Para", nil)
  string_utils.generate_id("doc", ".", {}, counters, "Header", 1)
  string_utils.generate_id("doc", ".", {}, counters, "CodeBlock", nil)

  s:assertEqual(counters["Para"], 2, "Para counter should be 2")
  s:assertEqual(counters["Header-1"], 1, "Header counter should be 1")
  s:assertEqual(counters["CodeBlock"], 1, "CodeBlock counter should be 1")
end)

-- meta_to_json tests (with mocking for pandoc dependency)
suite:add("Converts nil to nil", function(s)
  local result = string_utils.meta_to_json(nil)
  s:assertEqual(result, nil, "Should return nil")
end)

suite:add("Converts boolean values", function(s)
  local result_true = string_utils.meta_to_json(true)
  local result_false = string_utils.meta_to_json(false)
  s:assertEqual(result_true, true, "Should return true")
  s:assertEqual(result_false, false, "Should return false")
end)

suite:add("Converts string values", function(s)
  local result = string_utils.meta_to_json("test string")
  s:assertEqual(result, "test string", "Should return string unchanged")
end)

suite:add("Converts MetaBool", function(s)
  -- Mock pandoc.utils.stringify
  if not pandoc then pandoc = {} end
  if not pandoc.utils then pandoc.utils = {} end
  pandoc.utils.stringify = function(v) return tostring(v) end

  local meta_bool = {t = 'MetaBool', bool = true}
  local result = string_utils.meta_to_json(meta_bool)
  s:assertEqual(result, true, "Should extract bool value from MetaBool")
end)

suite:add("Converts MetaString using stringify", function(s)
  -- Mock pandoc.utils.stringify
  if not pandoc then pandoc = {} end
  if not pandoc.utils then pandoc.utils = {} end
  pandoc.utils.stringify = function(v) return "stringified" end

  local meta_string = {t = 'MetaString', text = "test"}
  local result = string_utils.meta_to_json(meta_string)
  s:assertEqual(result, "stringified", "Should use stringify for MetaString")
end)

suite:add("Converts MetaList recursively", function(s)
  -- Mock pandoc.utils.stringify
  if not pandoc then pandoc = {} end
  if not pandoc.utils then pandoc.utils = {} end
  pandoc.utils.stringify = function(v) return "item" end

  local meta_list = {
    t = 'MetaList',
    [1] = "first",
    [2] = "second",
    [3] = "third"
  }
  local result = string_utils.meta_to_json(meta_list)
  s:assertEqual(type(result), "table", "Should return table")
  s:assertEqual(#result, 3, "Should have 3 items")
  s:assertEqual(result[1], "first", "First item should be converted")
  s:assertEqual(result[2], "second", "Second item should be converted")
  s:assertEqual(result[3], "third", "Third item should be converted")
end)

suite:add("Converts MetaMap recursively", function(s)
  -- Mock pandoc.utils.stringify
  if not pandoc then pandoc = {} end
  if not pandoc.utils then pandoc.utils = {} end
  pandoc.utils.stringify = function(v) return "value" end

  local meta_map = {
    t = 'MetaMap',
    key1 = "value1",
    key2 = "value2"
  }
  local result = string_utils.meta_to_json(meta_map)
  s:assertEqual(type(result), "table", "Should return table")
  s:assertEqual(result.key1, "value1", "Should convert key1")
  s:assertEqual(result.key2, "value2", "Should convert key2")
end)

suite:add("Converts plain array tables with strings", function(s)
  local array = {"first", "second", "third"}
  local result = string_utils.meta_to_json(array)
  s:assertEqual(type(result), "table", "Should return table")
  s:assertEqual(#result, 3, "Should have 3 items")
  s:assertEqual(result[1], "first", "First item correct")
  s:assertEqual(result[2], "second", "Second item correct")
  s:assertEqual(result[3], "third", "Third item correct")
end)

suite:add("Converts plain map tables with string values", function(s)
  local map = {a = "value1", b = "value2"}
  local result = string_utils.meta_to_json(map)
  s:assertEqual(type(result), "table", "Should return table")
  s:assertEqual(result.a, "value1", "Key a should be converted")
  s:assertEqual(result.b, "value2", "Key b should be converted")
end)

suite:add("Handles nested structures in meta_to_json", function(s)
  local nested = {
    outer = {
      inner = {
        value = "test"
      }
    }
  }
  local result = string_utils.meta_to_json(nested)
  s:assertEqual(type(result), "table", "Should return table")
  s:assertEqual(type(result.outer), "table", "Outer should be table")
  s:assertEqual(type(result.outer.inner), "table", "Inner should be table")
  s:assertEqual(result.outer.inner.value, "test", "Nested value should be preserved")
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
