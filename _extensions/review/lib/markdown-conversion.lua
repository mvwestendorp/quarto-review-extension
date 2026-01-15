--[[
Markdown Conversion Module
Handles conversion of Pandoc elements to markdown strings
]]--

local M = {}

-- Check if a chunk class should be included
local function should_include_chunk_class(class_name)
  if not class_name or class_name == '' then
    return false
  end
  if class_name:match('^cell%-') then
    return false
  end
  if class_name:match('^code%-') then
    return false
  end
  if class_name:match('^quarto%-') then
    return false
  end
  return true
end

-- Format chunk option values
local function format_chunk_option_value(value)
  if value == nil then
    return 'null'
  end
  if type(value) ~= 'string' then
    value = tostring(value)
  end
  local trimmed = value:match('^%s*(.-)%s*$')
  if trimmed == '' then
    return '""'
  end
  if trimmed:match('^[%w_%.-]+$') then
    return trimmed
  end
  local contains_double = trimmed:find('"', 1, true)
  local contains_single = trimmed:find("'", 1, true)
  if not contains_double then
    return '"' .. trimmed .. '"'
  elseif not contains_single then
    return "'" .. trimmed .. "'"
  end
  return '"' .. trimmed:gsub('"', '\\"') .. '"'
end

-- Sort chunk options with priority
local function sort_chunk_options(options)
  table.sort(options, function(a, b)
    local priority = {
      label = 0,
      ['fig-cap'] = 1,
      ['tbl-cap'] = 1,
    }
    local pa = priority[a.key] or 10
    local pb = priority[b.key] or 10
    if pa == pb then
      return a.key < b.key
    end
    return pa < pb
  end)
end

-- Convert codeblock to markdown representation
function M.codeblock_to_markdown(elem)
  local attr = elem.attr or {}
  local classes = attr.classes or {}
  local options = {}
  local seen_label = false
  local language = nil
  local extra_classes = {}

  for _, class_name in ipairs(classes) do
    if not language and should_include_chunk_class(class_name) then
      language = class_name
    elseif should_include_chunk_class(class_name) then
      table.insert(extra_classes, class_name)
    end
  end

  if attr.attributes then
    for key, value in pairs(attr.attributes) do
      if type(key) == 'string' and key ~= '' and not key:match('^data%-') then
        if key == 'label' then
          seen_label = true
        end
        table.insert(options, { key = key, value = value })
      end
    end
  end

  if not seen_label and attr.identifier and attr.identifier ~= '' then
    table.insert(options, 1, { key = 'label', value = attr.identifier })
  end

  if #options > 0 then
    sort_chunk_options(options)
  end

  local fence_parts = {}
  if language then
    table.insert(fence_parts, language)
  end
  for _, class_name in ipairs(extra_classes) do
    table.insert(fence_parts, '.' .. class_name)
  end

  local lines = {}
  if #fence_parts > 0 then
    table.insert(lines, '```{' .. table.concat(fence_parts, ' ') .. '}')
  else
    table.insert(lines, '```')
  end

  for _, option in ipairs(options) do
    table.insert(
      lines,
      '#| ' .. option.key .. ': ' .. format_chunk_option_value(option.value)
    )
  end

  if elem.text and elem.text ~= '' then
    table.insert(lines, elem.text)
  end

  table.insert(lines, '```')
  return table.concat(lines, '\n')
end

-- Convert div to markdown representation preserving original syntax
function M.div_to_markdown(elem)
  local attr = elem.attr or {}
  local identifier = attr.identifier or ""
  local classes = attr.classes or {}
  local attributes = attr.attributes or {}

  -- Build the attribute string parts
  local attr_parts = {}

  -- Add identifier with # prefix if present
  if identifier and identifier ~= "" then
    table.insert(attr_parts, "#" .. identifier)
  end

  -- Add classes with . prefix
  for _, class in ipairs(classes) do
    table.insert(attr_parts, "." .. class)
  end

  -- Add key-value attributes
  for key, value in pairs(attributes) do
    -- Escape quotes in value
    local escaped_value = value:gsub('"', '\\"')
    table.insert(attr_parts, key .. '="' .. escaped_value .. '"')
  end

  -- Build opening fence line
  local fence = ":::"
  if #attr_parts > 0 then
    fence = fence .. " {" .. table.concat(attr_parts, " ") .. "}"
  end

  -- Convert content blocks to markdown recursively
  local content_lines = {}
  if elem.content and #elem.content > 0 then
    for _, block in ipairs(elem.content) do
      local block_md = M.element_to_markdown(block)
      table.insert(content_lines, block_md)
    end
  end

  -- Assemble the complete div with fences
  local lines = {fence}
  if #content_lines > 0 then
    table.insert(lines, table.concat(content_lines, "\n\n"))
  end
  table.insert(lines, ":::")

  return table.concat(lines, "\n")
end

-- Convert any element to markdown string
function M.element_to_markdown(elem)
  if elem.t == 'CodeBlock' then
    return M.codeblock_to_markdown(elem)
  end
  if elem.t == 'Div' then
    return M.div_to_markdown(elem)
  end
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

return M
