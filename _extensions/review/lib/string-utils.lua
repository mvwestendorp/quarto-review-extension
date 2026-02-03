--[[
String Utilities Module
Handles string manipulation, sanitization, and JSON conversion
]]--

local M = {}

-- Sanitize a value to create a valid HTML/CSS identifier
function M.sanitize_identifier(value)
  if not value or value == '' then
    return ''
  end

  -- Step 1: Normalize path separators (backslash to forward slash) for cross-platform support
  local normalized = value:gsub('\\', '/')

  -- Step 1b: Remove Windows drive letters (C:/, D:/, etc.) for consistency
  normalized = normalized:gsub('^%a:/', '')

  -- Step 2: Strip Quarto temporary directories
  normalized = normalized:gsub('^.*/quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^.*/quarto%-session[^/]+/', '')
  normalized = normalized:gsub('^quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^quarto%-session[^/]+/', '')

  -- Step 3: Strip leading ./ relative path marker
  normalized = normalized:gsub('^%./', '')

  -- Step 4: Remove file extension
  local without_extension = normalized:gsub('%.%w+$', '')

  -- Step 5: Replace all forward slashes with hyphens
  local with_hyphens = without_extension:gsub('/', '-')

  -- Step 6: Normalize to valid ID characters
  local sanitized = with_hyphens:lower():gsub('[^%w%-]', '-')

  -- Step 7: Clean up multiple consecutive hyphens
  sanitized = sanitized:gsub('%-+', '-')

  -- Step 8: Remove leading and trailing hyphens
  sanitized = sanitized:gsub('^%-+', ''):gsub('%-+$', '')

  -- Step 9: Fallback to 'document' if result is empty
  if sanitized == '' then
    sanitized = 'document'
  end

  return sanitized
end

-- Escape HTML special characters
function M.escape_html(text)
  local replacements = {
    ['&'] = '&amp;',
    ['<'] = '&lt;',
    ['>'] = '&gt;',
    ['"'] = '&quot;',
    ["'"] = '&#39;'
  }
  return text:gsub('[&<>"\']', replacements)
end

-- Deep copy a table or value
function M.deepcopy(orig)
  local orig_type = type(orig)
  local copy
  if orig_type == 'table' then
    copy = {}
    for orig_key, orig_value in next, orig, nil do
      copy[M.deepcopy(orig_key)] = M.deepcopy(orig_value)
    end
    setmetatable(copy, M.deepcopy(getmetatable(orig)))
  else
    copy = orig
  end
  return copy
end

-- Convert table to JSON string (fallback encoding - no external dependencies)
function M.table_to_json(tbl)
  local function encode_value(v)
    if type(v) == 'string' then
      local escaped = v
        :gsub('\\', '\\\\')
        :gsub('"', '\\"')
        :gsub('\r', '\\r')
        :gsub('\n', '\\n')
        :gsub('\t', '\\t')
      return '"' .. escaped .. '"'
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

-- Convert Pandoc metadata to JSON-compatible table
function M.meta_to_json(value)
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
      table.insert(result, M.meta_to_json(v))
    end
    return result
  elseif value.t == 'MetaMap' then
    local result = {}
    for k, v in pairs(value) do
      result[k] = M.meta_to_json(v)
    end
    return result
  elseif type(value) == 'table' then
    local is_array = value[1] ~= nil
    if is_array then
      local result = {}
      for _, item in ipairs(value) do
        table.insert(result, M.meta_to_json(item))
      end
      return result
    else
      local result = {}
      for k, item in pairs(value) do
        result[k] = M.meta_to_json(item)
      end
      return result
    end
  else
    return pandoc.utils.stringify(value)
  end
end

-- Generate deterministic ID based on document structure
function M.generate_id(id_prefix, id_separator, section_stack, element_counters, element_type, level)
  local parts = {id_prefix}

  -- Add section hierarchy
  for _, section in ipairs(section_stack) do
    table.insert(parts, section)
  end

  -- Add element type and counter
  local key = element_type
  if level then
    key = key .. "-" .. level
  end

  element_counters[key] = (element_counters[key] or 0) + 1
  local counter = element_counters[key]

  table.insert(parts, element_type:lower() .. "-" .. counter)

  local generated_id = table.concat(parts, id_separator)

  return generated_id
end

-- Get source position from element
function M.get_source_position(elem)
  if elem.attr and elem.attr.attributes then
    local line = elem.attr.attributes['data-line']
    local column = elem.attr.attributes['data-column']
    if line then
      return {line = line, column = column or 0}
    end
  end
  return nil
end

return M
