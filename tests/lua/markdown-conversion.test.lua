#!/usr/bin/env lua5.4
-- Test suite for markdown-conversion.lua module

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

function TestSuite:assertNotNil(value, message)
  if value == nil then
    error(message .. "\n  Expected: non-nil value\n  Got: nil")
  end
end

function TestSuite:run()
  print("Running Markdown Conversion Test Suite\n")
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
local markdown_conversion = require('markdown-conversion')

-- Tests
local suite = TestSuite

-- codeblock_to_markdown tests
suite:add("Converts simple code block", function(s)
  local elem = {
    text = "code here",
    attr = {
      classes = {},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "```", "Should contain fence")
  s:assertContains(md, "code here", "Should contain code")
end)

suite:add("Includes language class", function(s)
  local elem = {
    text = "print('hello')",
    attr = {
      classes = {"python"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "{python}", "Should contain python language")
  s:assertContains(md, "print('hello')", "Should contain code")
end)

suite:add("Includes chunk options", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        echo = "true",
        eval = "false"
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "echo", "Should contain echo option")
  s:assertContains(md, "eval", "Should contain eval option")
end)

suite:add("Handles label from identifier", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {},
      identifier = "fig-plot"
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "label", "Should contain label")
  s:assertContains(md, "fig-plot", "Should contain identifier as label")
end)

suite:add("Handles explicit label attribute", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        label = "my-label"
      },
      identifier = "other-id"
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "label", "Should contain label")
  s:assertContains(md, "my-label", "Should use explicit label")
end)

suite:add("Handles empty code block", function(s)
  local elem = {
    text = "",
    attr = {
      classes = {},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "```", "Should contain fences")
  s:assertFalse(md:match("^```\n```$") == nil, "Should handle empty code")
end)

suite:add("Filters out cell- classes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"python", "cell-code"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "python", "Should contain python")
  s:assertFalse(md:match("cell%-code"), "Should not contain cell-code")
end)

suite:add("Filters out code- classes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"python", "code-fold"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertFalse(md:match("code%-fold"), "Should not contain code-fold")
end)

suite:add("Filters out quarto- classes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"python", "quarto-special"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertFalse(md:match("quarto%-special"), "Should not contain quarto-special")
end)

suite:add("Filters out data- attributes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {},
      attributes = {
        ["data-attr"] = "value",
        ["other"] = "keep"
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "other", "Should contain other attribute")
  s:assertFalse(md:match("data%-attr"), "Should not contain data-attr")
end)

suite:add("Handles multiple extra classes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"python", "highlight", "custom"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "python", "Should contain python")
  -- Extra classes should be included
  local has_extra = md:match("highlight") or md:match("custom")
  s:assertTrue(has_extra, "Should contain extra classes")
end)

suite:add("Formats string options with spaces", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        ["fig-cap"] = "A nice plot"
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "fig-cap", "Should contain fig-cap")
  -- Should be quoted
  s:assertTrue(md:match('"A nice plot"') or md:match("'A nice plot'"), "Should quote value with spaces")
end)

suite:add("Formats simple alphanumeric options", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        echo = "true"
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "echo: true", "Should not quote simple value")
end)

suite:add("Handles boolean attribute values", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        echo = true,
        eval = false
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertNotNil(md, "Should handle boolean values")
end)

suite:add("Handles nil attribute values", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        optional = nil
      },
      identifier = ""
    }
  }
  -- Should not crash
  local success = pcall(function()
    markdown_conversion.codeblock_to_markdown(elem)
  end)
  s:assertTrue(success, "Should handle nil values")
end)

suite:add("Handles missing attr", function(s)
  local elem = {
    text = "code"
  }
  -- Should not crash
  local success = pcall(function()
    markdown_conversion.codeblock_to_markdown(elem)
  end)
  s:assertTrue(success, "Should handle missing attr")
end)

suite:add("Handles missing classes", function(s)
  local elem = {
    text = "code",
    attr = {
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "```", "Should create fence")
end)

suite:add("Handles missing attributes", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "```", "Should create fence")
end)

suite:add("Handles code with backticks", function(s)
  local elem = {
    text = "```nested```",
    attr = {
      classes = {},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "```nested```", "Should preserve backticks in code")
end)

suite:add("Handles multiline code", function(s)
  local elem = {
    text = "line1\nline2\nline3",
    attr = {
      classes = {"python"},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "line1", "Should contain line1")
  s:assertContains(md, "line2", "Should contain line2")
  s:assertContains(md, "line3", "Should contain line3")
end)

suite:add("Sorts options with priority", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        echo = "true",
        label = "fig-1",
        eval = "false"
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  -- label should appear before other options
  local label_pos = md:find("label", 1, true)
  local echo_pos = md:find("echo", 1, true)
  if label_pos and echo_pos then
    s:assertTrue(label_pos < echo_pos, "Label should come before echo")
  end
end)

-- Edge cases
suite:add("Handles very long code", function(s)
  local long_code = string.rep("x", 1000)
  local elem = {
    text = long_code,
    attr = {
      classes = {},
      attributes = {},
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, long_code, "Should handle long code")
end)

suite:add("Handles special characters in options", function(s)
  local elem = {
    text = "code",
    attr = {
      classes = {"r"},
      attributes = {
        caption = 'Test "quoted" value'
      },
      identifier = ""
    }
  }
  local md = markdown_conversion.codeblock_to_markdown(elem)
  s:assertContains(md, "caption", "Should contain caption")
end)

-- Run the test suite
local success = suite:run()
os.exit(success and 0 or 1)
