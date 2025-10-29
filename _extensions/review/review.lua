--[[
Quarto Review Extension - Lua Filter
Adds deterministic IDs to elements for review functionality
]]--

local config = {
  id_prefix = "review",
  id_separator = ".",
  enabled = true,
  debug = false,
  editable_elements = {
    Para = true,
    Header = true,
    CodeBlock = true,
    BulletList = true,
    OrderedList = true,
    BlockQuote = true,
    Table = true
  }
}

-- Context to track position in document tree
local context = {
  section_stack = {},
  section_counters = {},
  element_counters = {}
}

--[[
NOTE: Nested list handling limitation

Due to Pandoc's bottom-up processing order, we cannot reliably prevent nested lists
from being wrapped in the Lua filter. Attempts to use object identity, attributes,
or processing flags all fail because:
1. Object references don't persist between filter passes
2. BulletList/OrderedList elements don't support custom attributes
3. Global flags don't work with bottom-up processing (children run before parents)

The solution is handled on the UI side:
- The cleanNestedDivs() function in UIModule strips fence syntax from markdown
- Users edit the entire list (including nested items) in one editor session
]]--

-- Load configuration from metadata
function load_config(meta)
  if meta.review then
    if meta.review.enabled ~= nil then
      config.enabled = meta.review.enabled
    end
    if meta.review['id-prefix'] then
      config.id_prefix = pandoc.utils.stringify(meta.review['id-prefix'])
    end
    if meta.review['id-separator'] then
      config.id_separator = pandoc.utils.stringify(meta.review['id-separator'])
    end
    if meta.review.debug ~= nil then
      config.debug = meta.review.debug
    end
  end
end

-- Debug print function (only prints if debug mode is enabled)
function debug_print(message)
  if config.debug then
    print("DEBUG: " .. message)
  end
end

-- Convert Pandoc metadata to JSON-compatible table
function meta_to_json(value)
  if value == nil then
    return nil
  elseif type(value) == 'boolean' then
    return value
  elseif type(value) == 'string' then
    return value
  elseif value.t == 'MetaBool' then
    return value.bool
  elseif value.t == 'MetaString' then
    return pandoc.utils.stringify(value)
  elseif value.t == 'MetaInlines' then
    return pandoc.utils.stringify(value)
  elseif value.t == 'MetaBlocks' then
    return pandoc.utils.stringify(value)
  elseif value.t == 'MetaList' then
    local result = {}
    for i, v in ipairs(value) do
      table.insert(result, meta_to_json(v))
    end
    return result
  elseif value.t == 'MetaMap' then
    local result = {}
    for k, v in pairs(value) do
      result[k] = meta_to_json(v)
    end
    return result
  else
    return pandoc.utils.stringify(value)
  end
end

-- Build debug configuration from metadata
function build_debug_config(meta)
  local debug_config = {}

  if meta.review and meta.review.debug then
    local debug_meta = meta.review.debug

    if debug_meta.enabled ~= nil then
      debug_config.enabled = meta_to_json(debug_meta.enabled)
    end

    if debug_meta.level then
      debug_config.level = pandoc.utils.stringify(debug_meta.level)
    end

    if debug_meta.modules then
      debug_config.modules = meta_to_json(debug_meta.modules)
    end

    if debug_meta['exclude-modules'] then
      debug_config.excludeModules = meta_to_json(debug_meta['exclude-modules'])
    end

    if debug_meta['format-timestamp'] ~= nil then
      debug_config.formatTimestamp = meta_to_json(debug_meta['format-timestamp'])
    end
  end

  return next(debug_config) ~= nil and debug_config or nil
end

-- Convert table to JSON string (fallback encoding - no external dependencies)
function table_to_json(tbl)
  local function encode_value(v)
    if type(v) == 'string' then
      return '"' .. v:gsub('"', '\\"') .. '"'
    elseif type(v) == 'number' then
      return tostring(v)
    elseif type(v) == 'boolean' then
      return v and 'true' or 'false'
    elseif type(v) == 'table' then
      if v[1] then  -- Array
        local arr = {}
        for _, item in ipairs(v) do
          table.insert(arr, encode_value(item))
        end
        return '[' .. table.concat(arr, ',') .. ']'
      else  -- Object
        local pairs_list = {}
        for k, item in pairs(v) do
          table.insert(pairs_list, '"' .. tostring(k) .. '":' .. encode_value(item))
        end
        return '{' .. table.concat(pairs_list, ',') .. '}'
      end
    else
      return 'null'
    end
  end
  return encode_value(tbl)
end

-- Generate deterministic ID based on document structure
function generate_id(element_type, level)
  local parts = {config.id_prefix}

  -- Add section hierarchy
  for _, section in ipairs(context.section_stack) do
    table.insert(parts, section)
  end

  -- Add element type and counter
  local key = element_type
  if level then
    key = key .. "-" .. level
  end

  context.element_counters[key] = (context.element_counters[key] or 0) + 1
  local counter = context.element_counters[key]

  table.insert(parts, element_type:lower() .. "-" .. counter)

  return table.concat(parts, config.id_separator)
end

-- Get source position from element
function get_source_position(elem)
  if elem.attr and elem.attr.attributes then
    local line = elem.attr.attributes['data-line']
    local column = elem.attr.attributes['data-column']
    if line then
      return {line = line, column = column or 0}
    end
  end
  return nil
end

-- Escape HTML special characters
function escape_html(text)
  local replacements = {
    ['&'] = '&amp;',
    ['<'] = '&lt;',
    ['>'] = '&gt;',
    ['"'] = '&quot;',
    ["'"] = '&#39;'
  }
  return text:gsub('[&<>"\']', replacements)
end

-- Deep copy a Pandoc element (safe fallback if utils.clone doesn't exist)
function deepcopy(orig)
  local orig_type = type(orig)
  local copy
  if orig_type == 'table' then
    copy = {}
    for orig_key, orig_value in next, orig, nil do
      copy[deepcopy(orig_key)] = deepcopy(orig_value)
    end
    setmetatable(copy, deepcopy(getmetatable(orig)))
  else
    copy = orig
  end
  return copy
end


-- Convert element to markdown string
function element_to_markdown(elem)
  -- Create a temporary Pandoc document with just this element
  local doc = pandoc.Pandoc({elem})

  -- For tables, use GFM format to preserve pipe tables
  -- For other elements, use standard markdown
  local format = 'markdown'
  if elem.t == 'Table' then
    format = 'gfm'  -- GitHub Flavored Markdown preserves pipe tables
  end

  -- Convert to markdown
  local markdown = pandoc.write(doc, format)
  -- Remove trailing newlines
  markdown = markdown:gsub('\n+$', '')
  return markdown
end

-- Wrap element in div with review attributes
function make_editable(elem, elem_type, level)
  local id = generate_id(elem_type, level)
  local source_pos = get_source_position(elem)

  -- Clone the original element before modifying
  local has_clone = pandoc.utils and pandoc.utils.clone

  local markdown_elem = has_clone and pandoc.utils.clone(elem) or deepcopy(elem)

  -- Recursively strip review-editable divs from the markdown clone
  local function strip_review_divs(el)
    local found_nested = false
    local result = el:walk {
      Div = function(div)
        if div.classes:includes("review-editable") then
          found_nested = true
          debug_print(string.format("Found nested review-editable div in %s, stripping it", elem_type))
          -- Recursively strip review divs inside this div's content
          local inner = pandoc.Div(div.content)
          local cleaned = strip_review_divs(inner)
          -- Return the cleaned content blocks without wrapping div
          return pandoc.Blocks(cleaned.content)
        end
      end
    }
    if not found_nested then
      debug_print(string.format("No nested review-editable divs found in %s", elem_type))
    end
    return result
  end

  local clean_elem = strip_review_divs(markdown_elem)

  -- Convert clean element to markdown
  local markdown = element_to_markdown(clean_elem)

  local attrs = {
    ['data-review-id'] = id,
    ['data-review-type'] = elem_type,
    ['data-review-origin'] = 'source',
    ['data-review-markdown'] = escape_html(markdown),
    class = 'review-editable'
  }

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


-- Filter functions for each element type
function Para(elem)
  if not config.enabled or not config.editable_elements.Para then
    return elem
  end
  return make_editable(elem, 'Para', nil)
end

function Header(elem)
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

  -- Reset element counters for deeper levels
  for key, _ in pairs(context.element_counters) do
    if not key:match("^header") then
      context.element_counters[key] = 0
    end
  end

  return make_editable(elem, 'Header', level)
end

function CodeBlock(elem)
  if not config.enabled or not config.editable_elements.CodeBlock then
    return elem
  end
  return make_editable(elem, 'CodeBlock', nil)
end

function BulletList(elem)
  if not config.enabled or not config.editable_elements.BulletList then
    return elem
  end

  -- Check if we're already processing a list (this would be nested)
  if context.processing_list then
    debug_print("Skipping nested BulletList")
    return elem
  end

  -- Mark that we're processing a list
  context.processing_list = true
  debug_print("Wrapping BulletList")

  local result = make_editable(elem, 'BulletList', nil)

  -- Reset flag after wrapping
  context.processing_list = false

  return result
end

function OrderedList(elem)
  if not config.enabled or not config.editable_elements.OrderedList then
    return elem
  end

  -- Check if we're already processing a list (this would be nested)
  if context.processing_list then
    debug_print("Skipping nested OrderedList")
    return elem
  end

  -- Mark that we're processing a list
  context.processing_list = true
  debug_print("Wrapping OrderedList")

  local result = make_editable(elem, 'OrderedList', nil)

  -- Reset flag after wrapping
  context.processing_list = false

  return result
end



function BlockQuote(elem)
  if not config.enabled or not config.editable_elements.BlockQuote then
    return elem
  end
  return make_editable(elem, 'BlockQuote', nil)
end

function Table(elem)
  if not config.enabled or not config.editable_elements.Table then
    return elem
  end

  -- Skip tables that are from code output (have computational origin)
  -- These typically have attributes set by Quarto's code execution
  if elem.attr then
    -- Check for common code output markers in attributes
    if elem.attr.attributes then
      if elem.attr.attributes['data-quarto-computed'] or
         elem.attr.attributes['data-execution'] then
        debug_print("Skipping computational table (has data attributes)")
        return elem
      end
    end

    -- Check if table has classes indicating it's from code output
    if elem.attr.classes then
      for _, class in ipairs(elem.attr.classes) do
        if class == 'cell-output' or class == 'cell-output-display' then
          debug_print("Skipping computational table (has cell-output class)")
          return elem
        end
      end
    end
  end

  debug_print("Wrapping Table")
  return make_editable(elem, 'Table', nil)
end

-- Meta filter to load config and inject resources
function Meta(meta)
  load_config(meta)

  -- Only inject resources for HTML format
  if quarto.doc.is_format("html") and config.enabled then
    -- Get the extension directory path (relative to the document)
    local ext_path = "_extensions/review/assets"

    -- Add CSS to header
    quarto.doc.include_text("in-header", '<link rel="stylesheet" href="' .. ext_path .. '/review.css" />')

    -- Build initialization config
    local init_config = {
      autoSave = false
    }

  -- Add debug config if present
  local debug_config = build_debug_config(meta)
  if debug_config then
    init_config.debug = debug_config
  end

    -- Add git configuration if present
    if meta.review and meta.review.git then
      local git_config = meta_to_json(meta.review.git)
      if git_config then
        init_config.git = git_config
      end
    end

  -- Convert config to JSON string (with fallback encoding)
  local config_json = table_to_json(init_config)

    -- Add JS and initialization div to body
    quarto.doc.include_text("after-body", [[
<script type="module" src="]] .. ext_path .. [[/review.js"></script>
<div data-review data-review-config=']] .. config_json .. [['></div>
]])
  end

  return meta
end

-- Post-processor to unwrap nested review-editable divs
-- This ensures nested lists are part of their parent list's content
function unwrap_nested_editable(elem)
  -- Only unwrap nested divs in known container elements
  if elem.t == "Div" and elem.classes:includes("review-editable") then
    local function unwrap_in_blocks(blocks)
      local result = pandoc.List()
      for _, block in ipairs(blocks) do
        if block.t == "Div" and block.classes:includes("review-editable") then
          -- Unwrap inner div
          for _, inner_block in ipairs(block.content) do
            result:insert(inner_block)
          end
        else
          -- Recurse if block has content
          if block.content and type(block.content) == "table" then
            block.content = unwrap_in_blocks(block.content)
          end
          result:insert(block)
        end
      end
      return result
    end

    -- Only apply unwrapping if the content contains nested editable divs
    local contains_nested_editable = false
    for _, block in ipairs(elem.content) do
      if block.t == "Div" and block.classes:includes("review-editable") then
        contains_nested_editable = true
        break
      end
    end

    if contains_nested_editable then
      elem.content = unwrap_in_blocks(elem.content)
    end
  end

  return elem
end


-- Return filters in order
return {
  {Meta = Meta},
  {
    Para = Para,
    Header = Header,
    CodeBlock = CodeBlock,
    BulletList = BulletList,
    OrderedList = OrderedList,
    BlockQuote = BlockQuote,
    Table = Table
  },
  {Div = unwrap_nested_editable}  -- Post-process to unwrap nested divs
}
