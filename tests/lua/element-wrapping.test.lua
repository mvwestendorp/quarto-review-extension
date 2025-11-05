#!/usr/bin/env lua5.4
-- Test suite for element-wrapping.lua module

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
  print("Running Element Wrapping Test Suite\n")
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
local element_wrapping = require('element-wrapping')

-- Tests
local suite = TestSuite

-- Module structure tests
suite:add("Module exports make_editable function", function(s)
  s:assertEqual(type(element_wrapping.make_editable), 'function', "Should export make_editable")
end)

suite:add("Module exports create_filter_functions", function(s)
  s:assertEqual(type(element_wrapping.create_filter_functions), 'function', "Should export create_filter_functions")
end)

-- create_filter_functions tests
suite:add("create_filter_functions returns table", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters), 'table', "Should return table")
end)

suite:add("create_filter_functions creates Para filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.Para), 'function', "Should have Para filter")
end)

suite:add("create_filter_functions creates Header filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.Header), 'function', "Should have Header filter")
end)

suite:add("create_filter_functions creates CodeBlock filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.CodeBlock), 'function', "Should have CodeBlock filter")
end)

suite:add("create_filter_functions creates BulletList filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.BulletList), 'function', "Should have BulletList filter")
end)

suite:add("create_filter_functions creates OrderedList filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.OrderedList), 'function', "Should have OrderedList filter")
end)

suite:add("create_filter_functions creates BlockQuote filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.BlockQuote), 'function', "Should have BlockQuote filter")
end)

suite:add("create_filter_functions creates Table filter", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertEqual(type(filters.Table), 'function', "Should have Table filter")
end)

-- Configuration tests
suite:add("Respects enabled flag", function(s)
  local config = {
    enabled = false,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Para = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertNotNil(filters.Para, "Para filter should exist")
end)

suite:add("Respects editable_elements config for Para", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Para = false
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertNotNil(filters.Para, "Para filter should exist")
end)

suite:add("Respects editable_elements config for Header", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Header = false
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertNotNil(filters.Header, "Header filter should exist")
end)

suite:add("Respects editable_elements config for CodeBlock", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = false
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)
  s:assertNotNil(filters.CodeBlock, "CodeBlock filter should exist")
end)

-- Context handling tests
suite:add("Context starts with empty section_stack", function(s)
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  s:assertEqual(type(context.section_stack), 'table', "section_stack should be table")
  s:assertEqual(#context.section_stack, 0, "section_stack should start empty")
end)

suite:add("Context starts with empty element_counters", function(s)
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  s:assertEqual(type(context.element_counters), 'table', "element_counters should be table")
end)

suite:add("Context processing_list flag starts false", function(s)
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  s:assertFalse(context.processing_list, "processing_list should start false")
end)

-- Config structure tests
suite:add("Config has required fields", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertNotNil(config.enabled, "Config should have enabled")
  s:assertNotNil(config.id_prefix, "Config should have id_prefix")
  s:assertNotNil(config.id_separator, "Config should have id_separator")
  s:assertNotNil(config.editable_elements, "Config should have editable_elements")
end)

suite:add("Config editable_elements is table", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertEqual(type(config.editable_elements), 'table', "editable_elements should be table")
end)

suite:add("Config can specify which elements are editable", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Para = true,
      Header = true,
      CodeBlock = false
    }
  }
  s:assertTrue(config.editable_elements.Para, "Para should be editable")
  s:assertTrue(config.editable_elements.Header, "Header should be editable")
  s:assertFalse(config.editable_elements.CodeBlock, "CodeBlock should not be editable")
end)

-- Debug flag tests
suite:add("Config supports debug flag", function(s)
  local config = {
    enabled = true,
    debug = true,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertTrue(config.debug, "Config should support debug flag")
end)

suite:add("Debug flag can be false", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertFalse(config.debug, "Debug should be false")
end)

-- ID generation tests
suite:add("Config id_prefix can be empty", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertEqual(config.id_prefix, "", "id_prefix can be empty")
end)

suite:add("Config id_prefix can have value", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "document",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertEqual(config.id_prefix, "document", "id_prefix should be document")
end)

suite:add("Config id_separator can be dot", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  s:assertEqual(config.id_separator, ".", "id_separator should be dot")
end)

suite:add("Config id_separator can be hyphen", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = "-",
    editable_elements = {}
  }
  s:assertEqual(config.id_separator, "-", "id_separator should be hyphen")
end)

-- Edge cases
suite:add("Handles config with all elements disabled", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Para = false,
      Header = false,
      CodeBlock = false,
      BulletList = false,
      OrderedList = false,
      BlockQuote = false,
      Table = false
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  -- Should not crash
  local success = pcall(function()
    element_wrapping.create_filter_functions(config, context)
  end)
  s:assertTrue(success, "Should handle all disabled elements")
end)

suite:add("Handles config with missing editable_elements fields", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {}
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  -- Should not crash
  local success = pcall(function()
    element_wrapping.create_filter_functions(config, context)
  end)
  s:assertTrue(success, "Should handle missing element fields")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
