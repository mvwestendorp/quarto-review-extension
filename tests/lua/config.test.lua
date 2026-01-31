#!/usr/bin/env lua5.4
-- Test suite for config.lua module

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
  print("Running Config Test Suite\n")
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
local config_module = require('config')

-- Mock pandoc.utils.stringify for load_config paths that call it on meta values
pandoc = {
  utils = {
    stringify = function(v)
      if type(v) == 'string' then return v end
      return tostring(v)
    end
  }
}

-- Tests
local suite = TestSuite

-- load_config tests
suite:add("Loads config from meta with review table", function(s)
  local meta = {
    review = {
      enabled = true,
      debug = false
    }
  }
  local config = {
    enabled = false,
    debug = false,
    id_prefix = "",
    id_separator = "."
  }
  config_module.load_config(meta, config)
  s:assertTrue(config.enabled, "Should set enabled to true")
end)

suite:add("Uses default values when meta is empty", function(s)
  local meta = {}
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "",
    id_separator = "."
  }
  config_module.load_config(meta, config)
  s:assertTrue(config.enabled, "Should keep default enabled")
  s:assertEqual(config.id_separator, ".", "Should keep default separator")
end)

suite:add("Handles nil meta gracefully", function(s)
  local config = {
    enabled = true,
    debug = false
  }
  -- Should not crash
  local success = pcall(function()
    config_module.load_config(nil, config)
  end)
  s:assertTrue(success, "Should handle nil meta without error")
end)

suite:add("Applies document identifier as prefix", function(s)
  local meta = {
    title = "Test Document"
  }
  local config = {
    enabled = true,
    id_prefix = "",
    document_prefix_applied = false
  }
  config_module.load_config(meta, config)
  s:assertNotNil(config.id_prefix, "Should set some prefix")
end)

suite:add("Respects enabled flag from meta", function(s)
  local meta = {
    review = {
      enabled = false
    }
  }
  local config = {
    enabled = true
  }
  config_module.load_config(meta, config)
  s:assertFalse(config.enabled, "Should disable when meta says false")
end)

suite:add("Handles debug configuration", function(s)
  local meta = {
    review = {
      debug = true
    }
  }
  local config = {
    debug = false
  }
  config_module.load_config(meta, config)
  s:assertTrue(config.debug, "Should enable debug")
end)

suite:add("Loads custom id-prefix", function(s)
  local meta = {
    review = {
      ['id-prefix'] = "custom"
    }
  }
  local config = {
    id_prefix = "",
    document_prefix_applied = false
  }
  config_module.load_config(meta, config)
  s:assertEqual(config.id_prefix, "custom", "Should use custom prefix")
end)

suite:add("Loads custom id-separator", function(s)
  local meta = {
    review = {
      ['id-separator'] = "-"
    }
  }
  local config = {
    id_separator = "."
  }
  config_module.load_config(meta, config)
  s:assertEqual(config.id_separator, "-", "Should use custom separator")
end)

-- detect_document_identifier tests
suite:add("Returns input file from PANDOC_STATE", function(s)
  PANDOC_STATE = { input_files = { "my-document.qmd" } }
  local id = config_module.detect_document_identifier({})
  s:assertEqual(id, "my-document.qmd", "Should return input file")
  PANDOC_STATE = nil
end)

suite:add("Returns nil when no file sources available", function(s)
  PANDOC_STATE = nil
  local id = config_module.detect_document_identifier({})
  s:assertEqual(id, nil, "Should return nil without file sources")
end)

suite:add("Sanitizes path-based identifier in load_config", function(s)
  PANDOC_STATE = { input_files = { "path/to/my document!.qmd" } }
  local config = { enabled = true, id_prefix = "", document_prefix_applied = false }
  config_module.load_config({}, config)
  s:assertFalse(string.find(config.id_prefix, "!"), "Should not contain !")
  s:assertFalse(string.find(config.id_prefix, " "), "Should not contain space")
  PANDOC_STATE = nil
end)

suite:add("Returns nil without file sources regardless of title", function(s)
  PANDOC_STATE = nil
  local id = config_module.detect_document_identifier({ title = "" })
  s:assertEqual(id, nil, "Should return nil when no file sources")
end)

suite:add("Handles nil meta in detect_document_identifier", function(s)
  local id = config_module.detect_document_identifier(nil)
  s:assertEqual(id, nil, "Should return nil for nil meta")
end)

suite:add("Returns consistent identifier", function(s)
  local meta = {
    title = "Test"
  }
  local id1 = config_module.detect_document_identifier(meta)
  local id2 = config_module.detect_document_identifier(meta)
  s:assertEqual(id1, id2, "Should return same identifier")
end)

-- build_debug_config tests
suite:add("Returns nil when no debug config", function(s)
  local meta = {}
  local debug_config = config_module.build_debug_config(meta)
  s:assertEqual(debug_config, nil, "Should return nil")
end)

suite:add("Builds debug config when present", function(s)
  local meta = {
    review = {
      debug = {
        enabled = true,
        verbose = true
      }
    }
  }
  local debug_config = config_module.build_debug_config(meta)
  s:assertNotNil(debug_config, "Should return debug config")
end)

suite:add("Handles simple boolean debug flag", function(s)
  local meta = {
    review = {
      debug = true
    }
  }
  -- Should not crash
  local success = pcall(function()
    config_module.build_debug_config(meta)
  end)
  s:assertTrue(success, "Should handle boolean debug")
end)

-- has_translation_support tests
suite:add("Returns boolean for translation support", function(s)
  local result = config_module.has_translation_support()
  s:assertTrue(type(result) == "boolean", "Should return boolean")
end)

-- debug_print tests
suite:add("Handles string message in debug_print", function(s)
  local success = pcall(function()
    config_module.debug_print("Test message", true)
  end)
  s:assertTrue(success, "Should not error")
end)

suite:add("Respects debug flag in debug_print", function(s)
  local success = pcall(function()
    config_module.debug_print("Test message", false)
  end)
  s:assertTrue(success, "Should not error when debug is false")
end)

suite:add("Handles nil message in debug_print", function(s)
  local success = pcall(function()
    config_module.debug_print(nil, true)
  end)
  s:assertTrue(success, "Should handle nil message")
end)

-- build_embedded_sources_script tests
suite:add("Returns nil for empty sources", function(s)
  local script = config_module.build_embedded_sources_script({})
  s:assertEqual(script, nil, "Should return nil for empty")
end)

suite:add("Builds script for valid sources", function(s)
  local sources = {
    {filename = "test.qmd", content = "# Test"}
  }
  local script = config_module.build_embedded_sources_script(sources)
  if script then
    s:assertTrue(string.find(script, "script"), "Should contain script tag")
    s:assertTrue(string.find(script, "test.qmd"), "Should contain filename")
  end
end)

suite:add("Handles nil input in build_embedded_sources_script", function(s)
  local script = config_module.build_embedded_sources_script(nil)
  s:assertEqual(script, nil, "Should return nil")
end)

-- Configuration merging tests
suite:add("Merges extension config with meta config", function(s)
  local meta = {
    review = {
      ['id-separator'] = "#"
    }
  }
  local config = {
    id_separator = ".",
    enabled = true
  }
  config_module.load_config(meta, config)
  s:assertEqual(config.id_separator, "#", "Should use meta value")
  s:assertTrue(config.enabled, "Should preserve other values")
end)

suite:add("Prioritizes meta config over defaults", function(s)
  local meta = {
    review = {
      enabled = false
    }
  }
  local config = {
    enabled = true
  }
  config_module.load_config(meta, config)
  s:assertFalse(config.enabled, "Should use meta value")
end)

-- Edge cases
suite:add("Handles malformed meta structure", function(s)
  local meta = {
    review = "not a table"
  }
  local config = {
    enabled = true
  }
  local success = pcall(function()
    config_module.load_config(meta, config)
  end)
  s:assertTrue(success, "Should handle malformed meta")
end)

suite:add("Handles long file path", function(s)
  PANDOC_STATE = { input_files = { string.rep("a", 500) .. ".qmd" } }
  local id = config_module.detect_document_identifier({})
  s:assertNotNil(id, "Should handle long path")
  PANDOC_STATE = nil
end)

suite:add("Handles special characters in file path", function(s)
  PANDOC_STATE = { input_files = { "Test & Document <html>.qmd" } }
  local id = config_module.detect_document_identifier({})
  s:assertNotNil(id, "Should handle special chars")
  PANDOC_STATE = nil
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
