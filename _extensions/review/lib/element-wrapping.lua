--[[
Element Wrapping Module
Handles wrapping of elements for review functionality
]]--

local string_utils = require('string-utils')
local markdown_conversion = require('markdown-conversion')

local M = {}

-- Module-level state for two-pass nested list detection
-- Use a set of list "signatures" instead of element references
local nested_list_signatures = {}
local list_counter = 0  -- Global counter for unique IDs

-- Module-level state for tracking elements inside footnotes (Notes)
-- Para elements inside Notes should not be wrapped
local elements_in_notes = {}

-- Module-level state for tracking elements inside Quarto-internal divs
-- (e.g. #quarto-navigation-envelope, #quarto-meta-markdown).
-- These contain generated navigation/metadata and must never be made editable.
local elements_in_quarto_internals = {}

-- Helper to create a unique signature for a list
local function get_list_signature(block)
  -- Create a simple signature based on list type and first item content
  -- This is a heuristic - in rare cases it might have false positives/negatives
  local sig = block.t
  if block.content and #block.content > 0 and block.content[1] and #block.content[1] > 0 then
    local first_item_first_block = block.content[1][1]
    if first_item_first_block then
      sig = sig .. "|" .. tostring(first_item_first_block.t)
      if first_item_first_block.content then
        sig = sig .. "|" .. pandoc.utils.stringify(first_item_first_block.content):sub(1, 50)
      end
    end
  end
  return sig
end

-- Helper to create a unique signature for an element (Para, etc.)
local function get_element_signature(block)
  local sig = block.t
  if block.content then
    sig = sig .. "|" .. pandoc.utils.stringify(block.content):sub(1, 50)
  end
  return sig
end

-- Helper function to recursively identify nested lists
local function identify_nested_in_blocks(blocks, depth, config)
  for _, block in ipairs(blocks) do
    if block.t == 'BulletList' or block.t == 'OrderedList' then
      -- If we're already inside a list (depth > 0), mark as nested
      if depth > 0 then
        local sig = get_list_signature(block)
        nested_list_signatures[sig] = true
        if config and config.debug then
          print(string.format("DEBUG: Marking nested %s at depth %d (sig=%s)", block.t, depth, sig))
        end
      else
        if config and config.debug then
          print(string.format("DEBUG: Found top-level %s", block.t))
        end
      end

      -- Recursively process list items
      for _, item in ipairs(block.content) do
        identify_nested_in_blocks(item, depth + 1, config)
      end
    elseif block.content and type(block.content) == 'table' then
      -- For other block elements that contain blocks (BlockQuote, Div, etc.)
      identify_nested_in_blocks(block.content, depth, config)
    end
  end
end

-- Helper function to identify and mark elements inside Notes (footnotes)
local function identify_elements_in_notes(blocks, config)
  for _, block in ipairs(blocks) do
    if block.t == 'Note' then
      -- Mark all blocks inside this Note
      if block.content and type(block.content) == 'table' then
        for _, inner_block in ipairs(block.content) do
          if inner_block.t == 'Para' or inner_block.t == 'Plain' then
            local sig = get_element_signature(inner_block)
            elements_in_notes[sig] = true
            if config and config.debug then
              print(string.format("DEBUG: Marking %s inside Note (sig=%s)", inner_block.t, sig))
            end
          end
        end
      end
    elseif block.content and type(block.content) == 'table' then
      -- Recursively process other block elements
      identify_elements_in_notes(block.content, config)
    end
  end
end

-- Recursively mark every block descendant so the per-type filters skip them.
-- Guards against non-block items: Para.content is a list of Inlines (or raw
-- strings in test mocks), not Blocks, so we only process entries that are
-- tables with a .t field (i.e. actual Pandoc AST elements).
local function mark_all_descendants(blocks)
  for _, block in ipairs(blocks) do
    if type(block) == 'table' and block.t then
      local sig = get_element_signature(block)
      elements_in_quarto_internals[sig] = true
      if block.content and type(block.content) == 'table' then
        mark_all_descendants(block.content)
      end
    end
  end
end

-- Walk the document looking for Divs whose identifier starts with "quarto-".
-- All child blocks are marked so that element filters (Para, Header, etc.)
-- skip them unconditionally.
local function identify_elements_in_quarto_internals(blocks, config)
  for _, block in ipairs(blocks) do
    if block.t == 'Div' then
      if block.identifier and block.identifier:match('^quarto%-') then
        if config and config.debug then
          print(string.format("DEBUG: Found Quarto-internal div #%s, marking children as non-editable", block.identifier))
        end
        if block.content and type(block.content) == 'table' then
          mark_all_descendants(block.content)
        end
      else
        -- Recurse into non-internal divs
        if block.content and type(block.content) == 'table' then
          identify_elements_in_quarto_internals(block.content, config)
        end
      end
    elseif block.content and type(block.content) == 'table' then
      identify_elements_in_quarto_internals(block.content, config)
    end
  end
end

-- Create Pass 1 filter: Identify nested lists and elements inside Notes
-- This must be called with config to enable debug output
function M.create_identify_filter(config)
  return {
    Pandoc = function(doc)
      -- Reset state at the start of each document
      nested_list_signatures = {}
      elements_in_notes = {}
      elements_in_quarto_internals = {}
      list_counter = 0

      if config and config.debug then
        print("DEBUG: Pass 1 - Identifying nested lists, elements in Notes, and Quarto-internal elements")
      end

      -- Process the entire document body
      identify_nested_in_blocks(doc.blocks, 0, config)
      identify_elements_in_notes(doc.blocks, config)
      identify_elements_in_quarto_internals(doc.blocks, config)

      if config and config.debug then
        local nested_count = 0
        for _ in pairs(nested_list_signatures) do nested_count = nested_count + 1 end
        local note_count = 0
        for _ in pairs(elements_in_notes) do note_count = note_count + 1 end
        local quarto_internal_count = 0
        for _ in pairs(elements_in_quarto_internals) do quarto_internal_count = quarto_internal_count + 1 end
        print(string.format("DEBUG: Pass 1 complete - marked %d nested lists, %d elements in Notes, %d elements in Quarto-internal divs", nested_count, note_count, quarto_internal_count))
      end

      return doc
    end
  }
end

-- Default filter for backwards compatibility (without debug)
M.identify_nested_lists = M.create_identify_filter(nil)

-- Wrap element in div with review attributes
-- If editable is false, the element will have review metadata but won't be editable
function M.make_editable(elem, elem_type, level, config, context, editable)
  -- Default to editable if not specified
  if editable == nil then
    editable = true
  end

  local id = string_utils.generate_id(
    config.id_prefix,
    config.id_separator,
    context.section_stack,
    context.element_counters,
    elem_type,
    level
  )
  local source_pos = string_utils.get_source_position(elem)

  -- Clone the original element before modifying
  local has_clone = pandoc.utils and pandoc.utils.clone
  local markdown_elem = has_clone and pandoc.utils.clone(elem) or string_utils.deepcopy(elem)

  -- Convert element to markdown
  -- Note: With the two-pass filter approach, nested lists are not wrapped,
  -- so we no longer need to strip review-editable divs from the markdown clone
  local markdown = markdown_conversion.element_to_markdown(markdown_elem)

  local attrs = {
    ['data-review-id'] = id,
    ['data-review-type'] = elem_type,
    ['data-review-origin'] = 'source',
    ['data-review-markdown'] = string_utils.escape_html(markdown)
  }

  -- Only add review-editable class if element should be editable
  if editable then
    attrs.class = 'review-editable'
  end

  if source_pos then
    attrs['data-review-source-line'] = tostring(source_pos.line)
    if source_pos.column then
      attrs['data-review-source-column'] = tostring(source_pos.column)
    end
  end

  if level then
    attrs['data-review-level'] = tostring(level)
  end

  return pandoc.Div({elem}, pandoc.Attr("", {}, attrs))
end

-- Helper function to determine if a Div should be wrapped
local function should_wrap_div(elem)
  -- Skip Quarto-internal divs identified by ID (e.g. #quarto-navigation-envelope,
  -- #quarto-meta-markdown).  The class-based quarto-* check below only catches
  -- divs whose *class* starts with quarto-; these internal divs carry the prefix
  -- in their *identifier* instead, with an unrelated class like "hidden".
  if elem.identifier and elem.identifier:match('^quarto%-') then
    return false
  end

  -- Divs without classes are user content, wrap them
  if not elem.classes or #elem.classes == 0 then
    return true
  end

  for _, class in ipairs(elem.classes) do
    -- Skip computational cells
    if class == 'cell' or class:match('^cell%-') then
      return false
    end
    -- Skip Quarto internal rendering divs
    if class:match('^quarto%-') then
      return false
    end
    -- Skip layout container Divs (column-*, etc.)
    if class:match('^column%-') then
      return false
    end
    -- Skip Quarto translation content containers.
    -- In translation mode Quarto wraps each language variant in a
    -- .content-language div.  Wrapping it as an editable Div interferes
    -- with the translation pipeline and causes content duplication.
    if class == 'content-language' then
      return false
    end
  end

  -- Wrap content Divs (callouts, asides, custom divs, etc.)
  return true
end

-- Create filter functions for each element type
function M.create_filter_functions(config, context)
  local filters = {}

  -- Handle Div elements - wrap layout Divs, skip computational cells
  filters.Div = function(elem)
    if not config.enabled or not config.editable_elements.Div then
      return elem
    end

    -- Check if this Div should be wrapped
    if not should_wrap_div(elem) then
      if config.debug then
        local classes = table.concat(elem.classes or {}, ", ")
        print(string.format("DEBUG: Skipping Div with classes: %s (Quarto computational)", classes))
      end
      return elem
    end

    if config.debug then
      local classes = table.concat(elem.classes or {}, ", ")
      print(string.format("DEBUG: Wrapping Div with classes: %s", classes))
    end

    return M.make_editable(elem, 'Div', nil, config, context, true)
  end

  filters.Para = function(elem)
    if not config.enabled or not config.editable_elements.Para then
      return elem
    end

    -- Skip Para elements that are inside Notes (footnotes)
    -- These were marked in Pass 1
    local sig = get_element_signature(elem)
    if elements_in_notes[sig] then
      if config.debug then
        print(string.format("DEBUG: Skipping Para inside Note (sig=%s)", sig))
      end
      return elem
    end

    -- Skip Para elements inside Quarto-internal divs (navigation envelope,
    -- meta-markdown, etc.) — these were marked in Pass 1
    if elements_in_quarto_internals[sig] then
      if config.debug then
        print(string.format("DEBUG: Skipping Para inside Quarto-internal div (sig=%s)", sig))
      end
      return elem
    end

    return M.make_editable(elem, 'Para', nil, config, context)
  end

  filters.Header = function(elem)
    if not config.enabled or not config.editable_elements.Header then
      return elem
    end

    -- Update section context
    local level = elem.level
    local identifier = elem.identifier or ("sec-" .. pandoc.utils.stringify(elem.content))

    -- Trim section stack to current level
    for i = level, #context.section_stack do
      context.section_stack[i] = nil
    end

    -- Add current section
    context.section_stack[level] = identifier

    -- Note: Element counters are NOT reset here anymore
    -- All counters are document-wide to ensure unique data-review-id values
    -- across the entire document, not just within sections

    return M.make_editable(elem, 'Header', level, config, context)
  end

  filters.CodeBlock = function(elem)
    if not config.enabled or not config.editable_elements.CodeBlock then
      return elem
    end

    -- Check if this is an executable cell (cell-code class)
    local is_executable = false
    if elem.classes and #elem.classes > 0 then
      for _, class in ipairs(elem.classes) do
        if class == 'cell-code' then
          is_executable = true
          break
        end
      end
    end

    -- Wrap all code blocks with review metadata
    -- Executable cells are marked as non-editable (not fully supported yet)
    -- but still get review IDs for export purposes
    if is_executable then
      if config.debug then
        print("DEBUG: Wrapping executable CodeBlock (non-editable) with cell-code class")
      end
      return M.make_editable(elem, 'CodeBlock', nil, config, context, false)
    else
      return M.make_editable(elem, 'CodeBlock', nil, config, context, true)
    end
  end

  filters.BulletList = function(elem)
    if not config.enabled or not config.editable_elements.BulletList then
      return elem
    end

    -- Skip nested lists identified in Pass 1 by checking signature
    local sig = get_list_signature(elem)
    if nested_list_signatures[sig] then
      if config.debug then
        print(string.format("DEBUG: Skipping nested BulletList (sig=%s)", sig))
      end
      return elem
    end

    -- Wrap only top-level lists
    if config.debug then
      print(string.format("DEBUG: Wrapping top-level BulletList (sig=%s)", sig))
    end

    return M.make_editable(elem, 'BulletList', nil, config, context)
  end

  filters.OrderedList = function(elem)
    if not config.enabled or not config.editable_elements.OrderedList then
      return elem
    end

    -- Skip nested lists identified in Pass 1 by checking signature
    local sig = get_list_signature(elem)
    if nested_list_signatures[sig] then
      if config.debug then
        print(string.format("DEBUG: Skipping nested OrderedList (sig=%s)", sig))
      end
      return elem
    end

    -- Wrap only top-level lists
    if config.debug then
      print(string.format("DEBUG: Wrapping top-level OrderedList (sig=%s)", sig))
    end

    return M.make_editable(elem, 'OrderedList', nil, config, context)
  end

  filters.BlockQuote = function(elem)
    if not config.enabled or not config.editable_elements.BlockQuote then
      return elem
    end

    if config.debug then
      print("DEBUG: Processing BlockQuote element")
    end

    -- Strip nested review-editable divs BEFORE wrapping the blockquote
    -- Para elements inside BlockQuote get wrapped first (bottom-up processing)
    -- We need to unwrap them so the BlockQuote is a single editable segment
    elem = elem:walk {
      Div = function(div)
        -- Check if this div has the review-editable class
        -- Note: The class may be stored in either div.classes or div.attr.attributes["class"]
        local has_review_class = false

        if div.classes and div.classes:includes("review-editable") then
          has_review_class = true
        elseif div.attr and div.attr.attributes and div.attr.attributes["class"] then
          local class_attr = div.attr.attributes["class"]
          if class_attr:find("review%-editable") then
            has_review_class = true
          end
        end

        if has_review_class then
          if config.debug then
            print("DEBUG: Stripping review-editable div from inside BlockQuote element")
          end
          -- Return the content without the wrapping div
          return pandoc.Blocks(div.content)
        end
        return div
      end
    }

    -- Now wrap the clean blockquote as a single segment
    return M.make_editable(elem, 'BlockQuote', nil, config, context)
  end

  filters.Table = function(elem)
    if not config.enabled or not config.editable_elements.Table then
      return elem
    end

    -- Skip tables that are from code output (have computational origin)
    if elem.attr then
      -- Check for common code output markers in attributes
      if elem.attr.attributes then
        if elem.attr.attributes['data-quarto-computed'] or
           elem.attr.attributes['data-execution'] then
          if config.debug then
            print("DEBUG: Skipping computational table (has data attributes)")
          end
          return elem
        end
      end

      -- Check if table has classes indicating it's from code output
      if elem.attr.classes then
        for _, class in ipairs(elem.attr.classes) do
          if class == 'cell-output' or class == 'cell-output-display' then
            if config.debug then
              print("DEBUG: Skipping computational table (has cell-output class)")
            end
            return elem
          end
        end
      end
    end

    if config.debug then
      print("DEBUG: Wrapping Table")
    end
    return M.make_editable(elem, 'Table', nil, config, context)
  end

  return filters
end

return M
