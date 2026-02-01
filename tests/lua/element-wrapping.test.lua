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

-- Helper: set up / tear down a minimal pandoc mock.
-- Only pandoc.utils.stringify is needed — it is called by
-- get_element_signature inside the Para filter before make_editable
-- is reached.  Returns a restore function that puts pandoc back
-- to whatever it was before the call.
local function setup_pandoc_mock()
  local saved = pandoc          -- nil in plain lua5.4 test runner
  pandoc = pandoc or {}
  pandoc.utils = pandoc.utils or {}
  pandoc.utils.stringify = function(content)
    if type(content) == 'table' then
      local parts = {}
      for _, v in ipairs(content) do
        parts[#parts + 1] = tostring(v)
      end
      return table.concat(parts, " ")
    end
    return tostring(content or "")
  end
  return function() pandoc = saved end
end

-- Tests
local suite = TestSuite


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

-- ID Uniqueness tests
suite:add("Generated IDs are unique across document with multiple headers and paragraphs", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "doc",
    id_separator = ".",
    editable_elements = {
      Para = true,
      Header = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local generated_ids = {}
  local duplicate_ids = {}

  -- Simulate processing a document with headers and paragraphs
  -- Structure:
  -- # Header 1
  -- Paragraph 1
  -- Paragraph 2
  -- # Header 2
  -- Paragraph 3
  -- # Header 3
  -- Paragraph 4
  -- Paragraph 5

  -- Process first header
  context.element_counters["Header-1"] = 0
  local id1 = "doc.header-1"
  context.element_counters["Header-1"] = 1
  if generated_ids[id1] then
    table.insert(duplicate_ids, id1)
  end
  generated_ids[id1] = true

  -- Process first paragraph
  context.element_counters["Para"] = 0
  local id2 = "doc.para-1"
  context.element_counters["Para"] = 1
  if generated_ids[id2] then
    table.insert(duplicate_ids, id2)
  end
  generated_ids[id2] = true

  -- Process second paragraph (should be para-2, not para-1)
  local id3 = "doc.para-2"
  context.element_counters["Para"] = 2
  if generated_ids[id3] then
    table.insert(duplicate_ids, id3)
  end
  generated_ids[id3] = true

  -- Process second header
  context.element_counters["Header-1"] = 1
  local id4 = "doc.header-2"
  context.element_counters["Header-1"] = 2
  if generated_ids[id4] then
    table.insert(duplicate_ids, id4)
  end
  generated_ids[id4] = true

  -- Process third paragraph (should be para-3, NOT para-1!)
  local id5 = "doc.para-3"
  context.element_counters["Para"] = 3
  if generated_ids[id5] then
    table.insert(duplicate_ids, id5)
  end
  generated_ids[id5] = true

  -- Process third header
  local id6 = "doc.header-3"
  context.element_counters["Header-1"] = 3
  if generated_ids[id6] then
    table.insert(duplicate_ids, id6)
  end
  generated_ids[id6] = true

  -- Process fourth paragraph (should be para-4, NOT para-1!)
  local id7 = "doc.para-4"
  context.element_counters["Para"] = 4
  if generated_ids[id7] then
    table.insert(duplicate_ids, id7)
  end
  generated_ids[id7] = true

  -- Process fifth paragraph
  local id8 = "doc.para-5"
  context.element_counters["Para"] = 5
  if generated_ids[id8] then
    table.insert(duplicate_ids, id8)
  end
  generated_ids[id8] = true

  -- Verify no duplicates
  if #duplicate_ids > 0 then
    error("Found duplicate IDs: " .. table.concat(duplicate_ids, ", "))
  end

  -- Verify we have the expected number of unique IDs
  local count = 0
  for _ in pairs(generated_ids) do count = count + 1 end
  s:assertEqual(count, 8, "Should have 8 unique IDs")
end)

suite:add("Element counters are not reset after headers", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "doc",
    id_separator = ".",
    editable_elements = {
      Para = true,
      Header = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Simulate processing: Para, Header, Para, Para
  -- Initial para counter
  context.element_counters["Para"] = 1

  -- Process a header (this should NOT reset Para counter)
  context.element_counters["Header-1"] = 1

  -- Check Para counter is still 1 (not reset to 0)
  s:assertEqual(context.element_counters["Para"], 1, "Para counter should not be reset after header")

  -- Process another paragraph (should increment to 2, not restart at 1)
  context.element_counters["Para"] = 2

  s:assertEqual(context.element_counters["Para"], 2, "Para counter should continue incrementing")
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

-- Code-annotations and Quarto cell tests
suite:add("CodeBlock filter skips cell-code blocks entirely", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable to detect if it is ever called
  local make_editable_called = false
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx, editable)
    make_editable_called = true
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Create a mock CodeBlock with cell-code class (executable cell)
  local elem = {
    t = "CodeBlock",
    classes = {"cell-code", "python"},
    text = "print('hello')",
    attr = {
      classes = {"cell-code", "python"}
    }
  }

  -- Executable cell-code blocks must be returned untouched so that Quarto's
  -- own processCodeCell / resolveCellAnnotes filters can walk them correctly.
  local result = filters.CodeBlock(elem)

  element_wrapping.make_editable = original_make_editable

  s:assertFalse(make_editable_called, "cell-code CodeBlock should not be wrapped")
  s:assertEqual(result.t, "CodeBlock", "cell-code CodeBlock should be returned unchanged")
end)

suite:add("CodeBlock filter wraps regular code blocks without cell-code class", function(s)
  -- Test that the filter logic identifies regular code blocks for wrapping
  -- (doesn't skip them like it does for cell-code blocks)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable to avoid pandoc dependency
  local make_editable_called = false
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    make_editable_called = true
    return {t = "Div", content = {elem}}  -- Mock wrapped result
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- CodeBlock with just language class, no cell-code
  local elem = {
    t = "CodeBlock",
    classes = {"javascript"},
    text = "console.log('hello')",
    attr = {
      classes = {"javascript"}
    }
  }

  local result = filters.CodeBlock(elem)

  -- Restore original
  element_wrapping.make_editable = original_make_editable

  s:assertTrue(make_editable_called, "Should call make_editable for regular code blocks")
end)

suite:add("CodeBlock filter marks non-executable code blocks as non-editable", function(s)
  -- Non-executable code blocks (no cell-code class) must be wrapped with
  -- editable=false because Milkdown cannot round-trip code blocks; any
  -- save – even without user changes – corrupts formatting.
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable to capture the editable flag
  local captured_editable = nil
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx, editable)
    captured_editable = editable
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Plain code block – no cell-code class, not executable
  local elem = {
    t = "CodeBlock",
    classes = {"javascript"},
    text = "console.log('hello')",
    attr = {
      classes = {"javascript"}
    }
  }

  filters.CodeBlock(elem)

  element_wrapping.make_editable = original_make_editable

  s:assertFalse(captured_editable, "non-executable CodeBlock should be wrapped with editable=false")
end)

suite:add("CodeBlock filter respects CodeBlock disabled in config", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = false  -- Disabled
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }
  local filters = element_wrapping.create_filter_functions(config, context)

  local elem = {
    t = "CodeBlock",
    classes = {"python"},
    text = "print('hello')",
    attr = {
      classes = {"python"}
    }
  }

  -- Should return element unchanged when disabled
  local result = filters.CodeBlock(elem)
  s:assertEqual(result.t, "CodeBlock", "Should return unchanged when disabled")
  s:assertEqual(result.text, "print('hello')", "Should not modify element")
end)

suite:add("Div filter skips cell divs", function(s)
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

  -- Mock cell div (Quarto computational cell)
  local elem = {
    t = "Div",
    classes = {
      includes = function(self, class)
        for _, c in ipairs(self) do
          if c == class then return true end
        end
        return false
      end,
      "cell"
    },
    content = {}
  }

  -- Should return unchanged
  local result = filters.Div(elem)
  s:assertEqual(result.t, "Div", "Should return Div unchanged")
end)

suite:add("Div filter skips cell-output divs", function(s)
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

  -- Mock cell-output div
  local elem = {
    t = "Div",
    classes = {
      includes = function(self, class)
        for _, c in ipairs(self) do
          if c == class then return true end
        end
        return false
      end,
      "cell-output"
    },
    content = {}
  }

  -- Should return unchanged
  local result = filters.Div(elem)
  s:assertEqual(result.t, "Div", "Should return Div unchanged")
end)

suite:add("Div filter passes through non-cell divs", function(s)
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

  -- Regular div without cell classes
  local elem = {
    t = "Div",
    classes = {
      includes = function(self, class)
        for _, c in ipairs(self) do
          if c == class then return true end
        end
        return false
      end,
      "callout-note"
    },
    content = {}
  }

  -- Should return unchanged (not wrapped, just passed through)
  local result = filters.Div(elem)
  s:assertEqual(result.t, "Div", "Should pass through regular divs")
end)

suite:add("CodeBlock with empty classes array is wrapped", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable
  local make_editable_called = false
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    make_editable_called = true
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- CodeBlock with no classes
  local elem = {
    t = "CodeBlock",
    classes = {},
    text = "plain code",
    attr = {
      classes = {}
    }
  }

  local result = filters.CodeBlock(elem)

  -- Restore original
  element_wrapping.make_editable = original_make_editable

  s:assertTrue(make_editable_called, "Should wrap CodeBlock with empty classes")
end)

suite:add("CodeBlock with nil classes is wrapped", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      CodeBlock = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable
  local make_editable_called = false
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    make_editable_called = true
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- CodeBlock with nil classes
  local elem = {
    t = "CodeBlock",
    classes = nil,
    text = "plain code",
    attr = {}
  }

  local result = filters.CodeBlock(elem)

  -- Restore original
  element_wrapping.make_editable = original_make_editable

  s:assertTrue(make_editable_called, "Should wrap CodeBlock with nil classes")
end)

-- make_editable behavior tests (using mocks due to pandoc dependency)
suite:add("make_editable generates unique IDs for elements", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "doc",
    id_separator = ".",
    editable_elements = { Para = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Track generated IDs
  local generated_ids = {}
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    local string_utils = require('string-utils')
    local id = string_utils.generate_id(
      cfg.id_prefix,
      cfg.id_separator,
      ctx.section_stack,
      ctx.element_counters,
      elem_type,
      level
    )
    table.insert(generated_ids, id)
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Create multiple paragraphs
  filters.Para({t = "Para", content = {}})
  filters.Para({t = "Para", content = {}})
  filters.Para({t = "Para", content = {}})

  element_wrapping.make_editable = original_make_editable
  restore_pandoc()

  s:assertEqual(#generated_ids, 3, "Should generate 3 IDs")
  s:assertEqual(generated_ids[1], "doc.para-1", "First ID should be doc.para-1")
  s:assertEqual(generated_ids[2], "doc.para-2", "Second ID should be doc.para-2")
  s:assertEqual(generated_ids[3], "doc.para-3", "Third ID should be doc.para-3")
end)

suite:add("make_editable includes element type in wrapper", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = { Para = true, Header = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local captured_types = {}
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    table.insert(captured_types, elem_type)
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)
  filters.Para({t = "Para", content = {}})
  filters.Header({t = "Header", level = 1, content = {}, identifier = "sec-1"})

  element_wrapping.make_editable = original_make_editable
  restore_pandoc()

  s:assertEqual(captured_types[1], "Para", "First call should be for Para")
  s:assertEqual(captured_types[2], "Header", "Second call should be for Header")
end)

suite:add("make_editable includes level for headers", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = { Header = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local captured_levels = {}
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    table.insert(captured_levels, level)
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)
  filters.Header({t = "Header", level = 1, content = {}, identifier = "sec-1"})
  filters.Header({t = "Header", level = 2, content = {}, identifier = "sec-2"})
  filters.Header({t = "Header", level = 3, content = {}, identifier = "sec-3"})

  element_wrapping.make_editable = original_make_editable

  s:assertEqual(captured_levels[1], 1, "First header level should be 1")
  s:assertEqual(captured_levels[2], 2, "Second header level should be 2")
  s:assertEqual(captured_levels[3], 3, "Third header level should be 3")
end)

suite:add("make_editable uses section stack for nested IDs", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "doc",
    id_separator = ".",
    editable_elements = { Para = true, Header = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local generated_ids = {}
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    local string_utils = require('string-utils')
    local id = string_utils.generate_id(
      cfg.id_prefix,
      cfg.id_separator,
      ctx.section_stack,
      ctx.element_counters,
      elem_type,
      level
    )
    table.insert(generated_ids, id)
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Add a header (updates section_stack)
  filters.Header({t = "Header", level = 1, content = {}, identifier = "intro"})
  -- Add a para under that section
  filters.Para({t = "Para", content = {}})

  element_wrapping.make_editable = original_make_editable
  restore_pandoc()

  s:assertEqual(generated_ids[1], "doc.intro.header-1", "Header ID should include its own identifier: doc.intro.header-1")
  s:assertEqual(generated_ids[2], "doc.intro.para-1", "Para ID should include section: doc.intro.para-1")
end)

suite:add("make_editable passes config to ID generation", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "custom-prefix",
    id_separator = "-",
    editable_elements = { Para = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local generated_id = nil
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx)
    local string_utils = require('string-utils')
    generated_id = string_utils.generate_id(
      cfg.id_prefix,
      cfg.id_separator,
      ctx.section_stack,
      ctx.element_counters,
      elem_type,
      level
    )
    return {t = "Div", content = {elem}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)
  filters.Para({t = "Para", content = {}})

  element_wrapping.make_editable = original_make_editable
  restore_pandoc()

  s:assertEqual(generated_id, "custom-prefix-para-1", "Should use custom prefix and separator")
end)

-- ---------------------------------------------------------------
-- Bug regression: content-language and quarto-internal Div / Para
-- ---------------------------------------------------------------

-- Helper: creates a Div mock whose .classes table also has the
-- .includes() method that the BlockQuote walker expects (some
-- Pandoc Lua versions expose it, some don't — mirror what the
-- existing Div-skip tests do).
local function make_div(classes, identifier, content)
  local t = {
    t = "Div",
    classes = classes or {},
    identifier = identifier or "",
    content = content or {}
  }
  -- Attach includes() so code paths that call elem.classes:includes() work
  t.classes.includes = function(self, class)
    for _, c in ipairs(self) do
      if c == class then return true end
    end
    return false
  end
  return t
end

-- Helper: standard config with Div enabled, plus a mocked
-- make_editable so we can verify whether wrapping was attempted.
local function div_config_and_filters()
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = { Div = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local wrap_called = false
  local original = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx, editable)
    wrap_called = true
    return { t = "Div", content = {elem} }  -- minimal mock
  end

  local filters = element_wrapping.create_filter_functions(config, context)
  return filters, function() return wrap_called end, function() element_wrapping.make_editable = original end
end

-- Bug 1a: Div filter must skip .content-language divs
suite:add("Div filter skips content-language divs (translation containers)", function(s)
  local filters, was_wrapped, restore = div_config_and_filters()

  local elem = make_div({"content-language"}, "", {})
  elem.attributes = { language = "en" }

  local result = filters.Div(elem)
  restore()

  -- must return the element unchanged — not wrapped
  s:assertFalse(was_wrapped(), "should NOT call make_editable for content-language div")
  s:assertEqual(result.t, "Div", "returned element type should still be Div")
  -- identity check: same object returned
  s:assertTrue(result == elem, "should return the original element, not a wrapper")
end)

-- Bug 1b: Div filter must skip divs whose ID starts with quarto-
suite:add("Div filter skips divs with quarto-* identifier (navigation envelope)", function(s)
  local filters, was_wrapped, restore = div_config_and_filters()

  local elem = make_div({"hidden"}, "quarto-navigation-envelope", {})

  local result = filters.Div(elem)
  restore()

  s:assertFalse(was_wrapped(), "should NOT call make_editable for #quarto-navigation-envelope")
  s:assertTrue(result == elem, "should return the original element unchanged")
end)

-- Bug 1c: same as 1b but for quarto-meta-markdown
suite:add("Div filter skips divs with quarto-* identifier (meta markdown)", function(s)
  local filters, was_wrapped, restore = div_config_and_filters()

  local elem = make_div({"hidden"}, "quarto-meta-markdown", {})

  local result = filters.Div(elem)
  restore()

  s:assertFalse(was_wrapped(), "should NOT call make_editable for #quarto-meta-markdown")
  s:assertTrue(result == elem, "should return the original element unchanged")
end)

-- Positive: a normal div with no special class/id still gets wrapped
suite:add("Div filter still wraps ordinary user divs when Div is enabled", function(s)
  local filters, was_wrapped, restore = div_config_and_filters()

  local elem = make_div({"my-custom-aside"}, "user-section", {})

  filters.Div(elem)
  restore()

  s:assertTrue(was_wrapped(), "should call make_editable for a normal user div")
end)

-- Bug 2: Para filter must skip Paras inside quarto-internal divs.
-- This requires Pass 1 to have run and marked those elements.
suite:add("Para filter skips paragraphs inside quarto-internal divs after Pass 1", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = { Para = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Build a mock document that contains a quarto-internal div with a Para
  local inner_para = { t = "Para", content = {"nav-link-text"} }
  local quarto_div = {
    t = "Div",
    identifier = "quarto-navigation-envelope",
    classes = {"hidden"},
    content = { inner_para }
  }

  local mock_doc = { blocks = { quarto_div } }

  -- Run Pass 1 to populate the skip-set
  local identify_filter = element_wrapping.create_identify_filter(config)
  identify_filter.Pandoc(mock_doc)

  -- Mock make_editable so we can detect if it's called
  local wrap_called = false
  local orig_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(...)
    wrap_called = true
    return { t = "Div" }
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Feed the same inner_para to the Para filter
  local result = filters.Para(inner_para)

  -- Restore
  element_wrapping.make_editable = orig_make_editable
  restore_pandoc()

  -- The Para should have been returned unchanged (skipped), not wrapped
  s:assertFalse(wrap_called, "make_editable should NOT be called for Para inside quarto-internal div")
  s:assertTrue(result == inner_para, "should return the original Para unchanged")
end)

-- Negative: a normal Para (not inside a quarto-internal div) still gets wrapped
suite:add("Para filter still wraps normal paragraphs not inside quarto-internal divs", function(s)
  local restore_pandoc = setup_pandoc_mock()

  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = { Para = true }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Run Pass 1 with an EMPTY document (no quarto-internal divs)
  local identify_filter = element_wrapping.create_identify_filter(config)
  identify_filter.Pandoc({ blocks = {} })

  -- Mock make_editable
  local wrap_called = false
  local orig_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(...)
    wrap_called = true
    return { t = "Div" }
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  local normal_para = { t = "Para", content = {"just a normal paragraph"} }
  filters.Para(normal_para)

  element_wrapping.make_editable = orig_make_editable
  restore_pandoc()

  s:assertTrue(wrap_called, "make_editable SHOULD be called for a normal Para")
end)

suite:add("Figure filter wraps caption Para as FigureCaption", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Figure = true,
      Para = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  -- Mock make_editable to capture the element type it is called with
  local captured_type = nil
  local captured_editable = nil
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx, editable)
    captured_type = elem_type
    if editable == nil then editable = true end
    captured_editable = editable
    return {t = "Div", content = {elem}, classes = {"review-editable"}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Mock Figure element with a Para caption block (not yet wrapped by Para filter)
  local caption_para = {t = "Para", content = {"Figure caption text"}}
  local elem = {
    t = "Figure",
    caption = {
      short_caption = nil,
      content = {caption_para}
    },
    content = {}
  }

  local result = filters.Figure(elem)

  element_wrapping.make_editable = original_make_editable

  s:assertEqual(captured_type, "FigureCaption", "Figure filter should wrap caption as FigureCaption")
  s:assertTrue(captured_editable, "FigureCaption should be editable")
  s:assertNotNil(result.caption, "Returned Figure should still have caption")
  s:assertEqual(#result.caption.content, 1, "Caption should have one wrapped block")
end)

suite:add("Figure filter unwraps Para wrapper before re-wrapping as FigureCaption", function(s)
  local config = {
    enabled = true,
    debug = false,
    id_prefix = "test",
    id_separator = ".",
    editable_elements = {
      Figure = true,
      Para = true
    }
  }
  local context = {
    section_stack = {},
    element_counters = {},
    processing_list = false
  }

  local captured_type = nil
  local captured_inner_type = nil
  local original_make_editable = element_wrapping.make_editable
  element_wrapping.make_editable = function(elem, elem_type, level, cfg, ctx, editable)
    captured_type = elem_type
    captured_inner_type = elem.t
    return {t = "Div", content = {elem}, classes = {"review-editable"}}
  end

  local filters = element_wrapping.create_filter_functions(config, context)

  -- Simulate caption Para already wrapped by the Para filter (bottom-up order)
  local inner_para = {t = "Para", content = {"Caption text"}}
  local wrapped_para = {
    t = "Div",
    content = {inner_para},
    classes = {"review-editable"},
    attr = {attributes = {["class"] = "review-editable"}}
  }
  -- Make classes:includes work
  wrapped_para.classes.includes = function(self, val)
    for _, v in ipairs(self) do if v == val then return true end end
    return false
  end

  local elem = {
    t = "Figure",
    caption = {
      short_caption = nil,
      content = {wrapped_para}
    },
    content = {}
  }

  local result = filters.Figure(elem)

  element_wrapping.make_editable = original_make_editable

  s:assertEqual(captured_type, "FigureCaption", "Should re-wrap as FigureCaption")
  s:assertEqual(captured_inner_type, "Para", "Should pass the unwrapped Para to make_editable")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
