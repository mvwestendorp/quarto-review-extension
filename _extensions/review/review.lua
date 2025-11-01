--[[
Quarto Review Extension - Lua Filter
Adds deterministic IDs to elements for review functionality
]]--

local config = {
  id_prefix = "",  -- Will be set to filename by detect_document_identifier
  id_separator = ".",
  enabled = true,
  debug = false,
  document_prefix_applied = false,
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

local IGNORE_DIRECTORIES = {
  ['.git'] = true,
  ['.quarto'] = true,
  ['_site'] = true,
  ['_output'] = true,
  ['node_modules'] = true,
  ['.venv'] = true,
  ['__pycache__'] = true,
  ['.Rproj.user'] = true,
  ['.pytest_cache'] = true,
  ['.idea'] = true,
  ['.vscode'] = true,
  ['_extensions'] = true
}

local function to_forward_slashes(path_str)
  return (path_str or ''):gsub('\\', '/')
end

local function normalize_path(path_str)
  if not path_str or path_str == '' then
    return '.'
  end
  path_str = to_forward_slashes(path_str)
  local drive = path_str:match('^([A-Za-z]:)')
  local remainder = path_str
  if drive then
    remainder = remainder:sub(#drive + 1)
    if remainder:sub(1, 1) == '/' then
      remainder = remainder:sub(2)
    end
  end
  local is_absolute = path_str:sub(1, 1) == '/' or drive ~= nil
  local segments = {}
  for segment in remainder:gmatch('[^/]+') do
    if segment == '..' then
      if #segments > 0 then
        table.remove(segments)
      end
    elseif segment ~= '.' and segment ~= '' then
      table.insert(segments, segment)
    end
  end
  local normalized = table.concat(segments, '/')
  if is_absolute then
    if drive then
      normalized = drive .. (normalized ~= '' and '/' .. normalized or '/')
    else
      normalized = '/' .. normalized
    end
  elseif normalized == '' then
    normalized = '.'
  end
  return normalized
end

local function join_paths(base, child)
  if not child or child == '' then
    return normalize_path(base or '.')
  end
  if child:sub(1, 1) == '/' or child:match('^[A-Za-z]:') then
    return normalize_path(child)
  end
  if not base or base == '' or base == '.' then
    return normalize_path(child)
  end
  local prefix = normalize_path(base)
  if prefix == '/' then
    return normalize_path('/' .. child)
  end
  return normalize_path(prefix .. '/' .. child)
end

local function parent_directory(path_str)
  local normalized = normalize_path(path_str)
  if normalized == '/' then
    return '/'
  end
  local parent = normalized:match('^(.*)/[^/]*$')
  if not parent or parent == '' then
    return '.'
  end
  return parent
end

local function make_relative(full, base)
  local norm_full = normalize_path(full)
  local norm_base = normalize_path(base)
  if norm_base == '.' then
    return norm_full
  end
  if norm_base ~= '/' and norm_full:sub(1, #norm_base + 1) == norm_base .. '/' then
    return norm_full:sub(#norm_base + 2)
  elseif norm_base == '/' and norm_full:sub(1, 1) == '/' then
    local rel = norm_full:sub(2)
    return rel ~= '' and rel or norm_full
  elseif norm_full == norm_base then
    local last = norm_full:match('[^/]+$')
    return last or norm_full
  end
  return norm_full
end

local function get_working_directory()
  if pandoc.system and pandoc.system.get_working_directory then
    return normalize_path(pandoc.system.get_working_directory())
  end
  return '.'
end

local function to_absolute_path(path_str)
  if not path_str then
    return nil
  end
  if path_str:sub(1, 1) == '/' or path_str:match('^[A-Za-z]:') then
    return normalize_path(path_str)
  end
  local cwd = get_working_directory()
  return normalize_path(join_paths(cwd, path_str))
end

local function file_exists(path_str)
  local fh = io.open(path_str, 'rb')
  if fh then
    fh:close()
    return true
  end
  return false
end

local function read_file(path_str)
  local fh = io.open(path_str, 'rb')
  if not fh then
    return nil
  end
  local content = fh:read('*a')
  fh:close()
  if not content then
    return nil
  end
  return content:gsub('\r\n', '\n')
end

local function get_primary_input_file()
  if PANDOC_STATE and PANDOC_STATE.input_files and #PANDOC_STATE.input_files > 0 then
    return PANDOC_STATE.input_files[1]
  end
  if quarto and quarto.doc and quarto.doc.input_file then
    return quarto.doc.input_file
  end
  return nil
end

local function detect_project_root_from_extension()
  local info = debug.getinfo(1, 'S')
  if not info or not info.source then
    return nil
  end
  local source_path = info.source
  if source_path:sub(1, 1) == '@' then
    source_path = source_path:sub(2)
  end
  source_path = normalize_path(source_path)
  local marker = '/_extensions/'
  local idx = source_path:find(marker, 1, true)
  if idx then
    return normalize_path(source_path:sub(1, idx - 1))
  end
  return nil
end

local function detect_project_root()
  if quarto and quarto.project and quarto.project.directory and quarto.project.directory ~= '' then
    return normalize_path(to_forward_slashes(quarto.project.directory))
  end
  local env_dir = os.getenv('QUARTO_PROJECT_DIR') or os.getenv('QUARTO_PROJECT_PATH')
  if env_dir and env_dir ~= '' then
    return normalize_path(to_forward_slashes(env_dir))
  end
  local from_extension = detect_project_root_from_extension()
  if from_extension then
    return from_extension
  end
  return nil
end

local function find_project_root(start_dir)
  if not start_dir then
    return '.'
  end
  local dir = normalize_path(start_dir)
  local last = nil
  while dir and dir ~= last do
    if file_exists(join_paths(dir, '_quarto.yml')) or file_exists(join_paths(dir, '_quarto.yaml')) then
      return dir
    end
    last = dir
    local next_dir = parent_directory(dir)
    if not next_dir or next_dir == dir then
      break
    end
    dir = next_dir
  end
  return start_dir
end

local function should_skip_directory(name)
  return name == '.' or name == '..' or IGNORE_DIRECTORIES[name] == true
end

local function collect_project_sources()
  local sources = {}
  local input_file = get_primary_input_file()
  local abs_input = input_file and to_absolute_path(input_file)
  local start_dir = abs_input and parent_directory(abs_input) or get_working_directory()
  local project_root = detect_project_root() or (start_dir and find_project_root(start_dir)) or start_dir
  project_root = normalize_path(project_root or '.')

  local function add_source(full_path)
    if not full_path then
      return
    end
    local content = read_file(full_path)
    if content then
      local relative = make_relative(full_path, project_root)
      if project_root ~= '.' and relative == normalize_path(full_path) then
        return
      end
      if not sources[relative] then
        sources[relative] = content
      end
    end
  end

  -- Always include primary input file
  if abs_input then
    add_source(abs_input)
  end

  -- Include project configuration files if present
  local project_yaml = join_paths(project_root, '_quarto.yml')
  if file_exists(project_yaml) then
    add_source(project_yaml)
  end
  local project_yaml_alt = join_paths(project_root, '_quarto.yaml')
  if file_exists(project_yaml_alt) then
    add_source(project_yaml_alt)
  end

  local function list_directory(path)
    local ok, entries = pcall(pandoc.system.list_directory, path)
    if not ok or type(entries) ~= 'table' then
      return nil
    end
    table.sort(entries)
    return entries
  end

  local function scan(dir, entries)
    entries = entries or list_directory(dir)
    if not entries then
      return
    end
    for _, entry in ipairs(entries) do
      if not should_skip_directory(entry) then
        local full = join_paths(dir, entry)
        local sub_entries = list_directory(full)
        if sub_entries then
          if not IGNORE_DIRECTORIES[entry] then
            scan(full, sub_entries)
          end
        elseif entry:match('%.qmd$') then
          add_source(full)
        end
      end
    end
  end

  if project_root then
    scan(project_root)
  end

  return sources, project_root
end

local function build_embedded_sources_script(sources)
  if not sources or next(sources) == nil then
    return nil
  end
  local timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ')
  local base_version = tostring(os.time())
  local payload = {
    timestamp = timestamp,
    version = base_version,
    sources = {}
  }
  local index = 0
  local keys = {}
  for filename, _ in pairs(sources) do
    table.insert(keys, filename)
  end
  table.sort(keys)
  for _, filename in ipairs(keys) do
    local content = sources[filename]
    index = index + 1
    payload.sources[filename] = {
      content = content,
      originalContent = content,
      lastModified = timestamp,
      version = base_version .. '-' .. tostring(index)
    }
  end
  local json = table_to_json(payload):gsub('</', '<\\/')
  return '<script id="embedded-sources" type="application/json">' .. json .. '</script>'
end

local function sanitize_identifier(value)
  if not value or value == '' then
    return ''
  end

  -- Step 1: Normalize path separators (backslash to forward slash) for cross-platform support
  -- This handles both Windows and Unix paths
  local normalized = value:gsub('\\', '/')

  -- Step 2: Strip Quarto temporary directories
  -- Quarto uses random temp directories like:
  -- - /tmp/quarto-input-abc123/... (absolute)
  -- - /tmp/quarto-session-xyz789/... (absolute)
  -- - quarto-input-abc123/... (relative, at start)
  -- We match both absolute paths (with leading /) and relative paths (at start)

  -- First, handle absolute paths or paths with leading content
  normalized = normalized:gsub('^.*/quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^.*/quarto%-session[^/]+/', '')

  -- Then, handle relative paths that start with quarto dirs
  normalized = normalized:gsub('^quarto%-input[^/]+/', '')
  normalized = normalized:gsub('^quarto%-session[^/]+/', '')

  -- Step 3: Strip leading ./ relative path marker
  normalized = normalized:gsub('^%./', '')

  -- Step 4: Remove file extension (handles single extension like .qmd, .md, etc.)
  local without_extension = normalized:gsub('%.%w+$', '')

  -- Step 5: Replace all forward slashes with hyphens
  -- This converts directory structure to valid ID characters
  -- e.g., "chapters/intro" -> "chapters-intro"
  -- e.g., "docs/api/reference" -> "docs-api-reference"
  local with_hyphens = without_extension:gsub('/', '-')

  -- Step 6: Normalize to valid ID characters
  -- Convert to lowercase and replace any non-word, non-hyphen chars with hyphens
  -- This handles spaces, underscores, special characters, etc.
  local sanitized = with_hyphens:lower():gsub('[^%w%-]', '-')

  -- Step 7: Clean up multiple consecutive hyphens
  -- Reduces "my---doc" to "my-doc"
  sanitized = sanitized:gsub('%-+', '-')

  -- Step 8: Remove leading and trailing hyphens
  -- Clean up edge cases from previous steps
  sanitized = sanitized:gsub('^%-+', ''):gsub('%-+$', '')

  -- Step 9: Fallback to 'document' if result is empty
  -- This handles edge cases like ".qmd", "---", whitespace-only paths
  if sanitized == '' then
    sanitized = 'document'
  end

  return sanitized
end

local function detect_document_identifier(meta)
  -- Priority 1: User-specified document ID in review metadata
  if meta.review and meta.review['document-id'] then
    return pandoc.utils.stringify(meta.review['document-id'])
  end

  -- Priority 2-4: Actual file paths (preferred over title)
  -- These are the most reliable for uniqueness
  if quarto and quarto.doc and quarto.doc.output_file then
    return quarto.doc.output_file
  end
  if PANDOC_STATE and PANDOC_STATE.input_files and #PANDOC_STATE.input_files > 0 then
    return PANDOC_STATE.input_files[1]
  end
  if quarto and quarto.doc and quarto.doc.input_file then
    return quarto.doc.input_file
  end

  -- NOTE: Deliberately NOT falling back to meta.title
  -- Using the document title would create non-unique IDs for documents with the same title
  -- Better to use a generic fallback than to create problematic IDs

  return nil
end

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
  -- Store custom prefix if provided
  local custom_prefix = nil
  if meta.review then
    if meta.review.enabled ~= nil then
      config.enabled = meta.review.enabled
    end
    if meta.review['id-prefix'] then
      custom_prefix = pandoc.utils.stringify(meta.review['id-prefix'])
    end
    if meta.review['id-separator'] then
      config.id_separator = pandoc.utils.stringify(meta.review['id-separator'])
    end
    if meta.review.debug ~= nil then
      config.debug = meta.review.debug
    end
  end

  if not config.document_prefix_applied then
    -- ALWAYS process filename first, then add custom prefix
    local identifier = detect_document_identifier(meta)
    debug_print('Detected document identifier: ' .. tostring(identifier))
    local filename_prefix = sanitize_identifier(identifier)

    -- Build prefix with filename FIRST, then any custom prefix
    if filename_prefix ~= '' then
      -- Start with filename as primary prefix
      config.id_prefix = filename_prefix
      debug_print('Applying filename prefix: ' .. filename_prefix)

      -- Add custom prefix if provided
      if custom_prefix and #custom_prefix > 0 then
        config.id_prefix = table.concat({config.id_prefix, custom_prefix}, config.id_separator)
        debug_print('Added custom prefix: ' .. custom_prefix)
      end
    else
      -- Fallback: if filename detection failed, use custom prefix or default
      if custom_prefix and #custom_prefix > 0 then
        config.id_prefix = custom_prefix
        debug_print('No valid filename, using custom prefix: ' .. custom_prefix)
      else
        config.id_prefix = 'review'
        debug_print('No valid filename and no custom prefix, using default: review')
      end
    end

    config.document_prefix_applied = true
    debug_print('Final id prefix: ' .. config.id_prefix)
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

-- Build translation configuration from metadata
function build_translation_config(meta)
  -- Check if translation is enabled either in document YAML or would be inherited from project
  local translation_enabled = false

  if meta.review and meta.review.translation then
    -- Document-level translation.enabled takes priority
    if meta.review.translation.enabled ~= nil then
      translation_enabled = meta_to_json(meta.review.translation.enabled)
    end
  end

  -- Return the enableTranslation flag if true, otherwise return nil
  if translation_enabled then
    return true
  end
  return nil
end

-- Convert table to JSON string (fallback encoding - no external dependencies)
function table_to_json(tbl)
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

local function codeblock_to_markdown(elem)
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

function element_to_markdown(elem)
  if elem.t == 'CodeBlock' then
    return codeblock_to_markdown(elem)
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
  config.document_prefix_applied = false
  config.id_prefix = ""  -- Reset to empty, will be populated with filename
  context.section_stack = {}
  context.section_counters = {}
  context.element_counters = {}

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

    -- Add translation enabled flag if present
    local translation_enabled = build_translation_config(meta)
    if translation_enabled then
      init_config.enableTranslation = true
    end

    -- Add git configuration if present
    if meta.review and meta.review.git then
      local git_config = meta_to_json(meta.review.git)
      if git_config then
        init_config.git = git_config
      end
    end

    -- Convert config to JSON string (with fallback encoding)
    local project_sources = collect_project_sources()
    local config_json = table_to_json(init_config)
    local embedded_sources_script = build_embedded_sources_script(project_sources)

    -- Build title wrapping script if title exists
    local title_id = config.id_prefix .. config.id_separator .. 'document-title'
    local title_script = [[
<script>
  // Wrap the document title with review attributes
  document.addEventListener('DOMContentLoaded', function() {
    const titleEl = document.querySelector('h1.title');
    if (titleEl && !titleEl.hasAttribute('data-review-id')) {
      // Extract the title text content for markdown
      const titleMarkdown = titleEl.textContent;

      titleEl.setAttribute('data-review-id', ']] .. title_id .. [[');
      titleEl.setAttribute('data-review-type', 'Title');
      titleEl.setAttribute('data-review-origin', 'source');
      titleEl.setAttribute('data-review-markdown', titleMarkdown);
      titleEl.classList.add('review-editable');
    }
  });
</script>
]]

    -- Add JS and initialization div to body
    local after_body = title_script .. [[
<script type="module" src="]] .. ext_path .. [[/review.js"></script>
<div data-review data-review-config=']] .. config_json .. [['></div>
]]
    if embedded_sources_script then
      after_body = after_body .. embedded_sources_script .. "\n"
    end
    quarto.doc.include_text("after-body", after_body)
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
