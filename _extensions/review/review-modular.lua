--[[
Quarto Review Extension - Main Filter (Modularized)
Adds deterministic IDs to elements for review functionality
]]--

-- Set up the module path to find our library files
local function setup_module_path()
  -- Get the directory where this script is located
  local script_path = PANDOC_SCRIPT_FILE or ''
  local script_dir = script_path:match("^(.*[/\\])[^/\\]*$") or ''

  -- Add the lib directory to the package path
  local lib_path = script_dir .. 'lib/?.lua'
  package.path = lib_path .. ';' .. package.path
end

setup_module_path()

-- Require all modules using simple names now that package.path is set
local path_utils = require('path-utils')
local project_detection = require('project-detection')
local string_utils = require('string-utils')
local markdown_conversion = require('markdown-conversion')
local config_module = require('config')
local element_wrapping = require('element-wrapping')

-- Global configuration
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
    Table = true,
    Div = true
  }
}

-- Context to track position in document tree
local context = {
  section_stack = {},
  section_counters = {},
  element_counters = {},
  list_depth = 0
}

-- Calculate the correct relative path to the extension assets from the output file
local function get_extension_path()
  local ext_path = "_extensions/review/assets"

  -- Try to get the output file path to calculate relative depth
  local output_file = nil
  if quarto and quarto.doc and quarto.doc.output_file then
    output_file = quarto.doc.output_file
  end

  if not output_file then
    config_module.debug_print("get_extension_path: No output_file available, using default: " .. ext_path, config.debug)
    return ext_path
  end

  config_module.debug_print("get_extension_path: output_file = " .. tostring(output_file), config.debug)

  -- Normalize the output file path
  local normalized_output = path_utils.normalize_path(output_file)
  config_module.debug_print("get_extension_path: normalized_output = " .. tostring(normalized_output), config.debug)

  -- Detect the project root
  local input_file = project_detection.get_primary_input_file()
  local abs_input = input_file and path_utils.to_absolute_path(input_file)
  local start_dir = abs_input and path_utils.parent_directory(abs_input) or path_utils.get_working_directory()
  local project_root = project_detection.detect_project_root() or (start_dir and project_detection.find_project_root(start_dir)) or start_dir
  project_root = path_utils.normalize_path(project_root or '.')
  config_module.debug_print("get_extension_path: project_root = " .. tostring(project_root), config.debug)

  -- Strip the project root and any output directory from the path
  local relative_output = normalized_output

  -- If output_file is absolute, make it relative to project root
  if normalized_output:match('^[A-Za-z]:') or normalized_output:sub(1, 1) == '/' then
    relative_output = path_utils.make_relative(normalized_output, project_root)
    config_module.debug_print("get_extension_path: made relative to project root = " .. tostring(relative_output), config.debug)
  end

  -- Remove leading ./ or .\
  relative_output = relative_output:gsub('^%./', ''):gsub('^%.\\', '')

  -- Strip output directory prefixes
  relative_output = relative_output:gsub('^_site/', ''):gsub('^_output/', '')
                                   :gsub('^output/', ''):gsub('^site/', '')
                                   :gsub('^website/', ''):gsub('^docs/', '')
  config_module.debug_print("get_extension_path: after stripping output dir = " .. tostring(relative_output), config.debug)

  -- Count directory separators to determine depth
  local depth = 0
  for _ in relative_output:gmatch('/') do
    depth = depth + 1
  end
  config_module.debug_print("get_extension_path: depth = " .. tostring(depth), config.debug)

  -- If file is at root level, use direct path
  if depth == 0 then
    config_module.debug_print("get_extension_path: root level, returning: " .. ext_path, config.debug)
    return ext_path
  end

  -- Build relative path with appropriate number of ../
  local prefix = string.rep('../', depth)
  local result = prefix .. ext_path
  config_module.debug_print("get_extension_path: returning: " .. result, config.debug)

  return result
end

-- Meta filter to load config and inject resources
function Meta(meta)
  config.document_prefix_applied = false
  config.id_prefix = ""
  context.section_stack = {}
  context.section_counters = {}
  context.element_counters = {}
  context.list_depth = 0

  config_module.load_config(meta, config)

  -- Only inject resources for HTML format
  if quarto.doc.is_format("html") and config.enabled then
    local ext_path = get_extension_path()

    -- Add CSS to header
    quarto.doc.include_text("in-header", '<link rel="stylesheet" href="' .. ext_path .. '/review.css" />')

    -- Build initialization config
    local init_config = {
      autoSave = false,
      enableTranslation = config_module.has_translation_support(config.enableTranslation)
    }

    -- Add debug config if present
    local debug_config = config_module.build_debug_config(meta)
    if debug_config then
      init_config.debug = debug_config
    end

    -- Add git configuration if present
    if meta.review and meta.review.git then
      local git_config = string_utils.meta_to_json(meta.review.git)
      if git_config then
        local function flatten(value)
          if type(value) == 'table' then
            if #value == 1 then
              return value[1]
            end
          end
          return value
        end
        git_config.provider = flatten(git_config.provider)
        git_config.owner = flatten(git_config.owner)
        git_config.repo = flatten(git_config.repo)
        git_config['base-branch'] = flatten(git_config['base-branch'])
        git_config.baseBranch = flatten(git_config.baseBranch)
        if git_config.auth then
          git_config.auth.mode = flatten(git_config.auth.mode)
        end
        init_config.git = git_config
      end
    end

    -- Add user authentication configuration if present
    if meta.review and meta.review.user then
      local user_config = string_utils.meta_to_json(meta.review.user)
      if user_config then
        local function flatten(value)
          if type(value) == 'table' then
            if #value == 1 then
              return value[1]
            end
          end
          return value
        end
        -- Flatten nested auth configuration
        if user_config.auth then
          user_config.auth.mode = flatten(user_config.auth.mode)
          user_config.auth.userHeader = flatten(user_config.auth.userHeader)
          user_config.auth.emailHeader = flatten(user_config.auth.emailHeader)
          user_config.auth.usernameHeader = flatten(user_config.auth.usernameHeader)
          user_config.auth.defaultRole = flatten(user_config.auth.defaultRole)
          user_config.auth.debug = flatten(user_config.auth.debug)
        end
        init_config.user = user_config
      end
    end

    -- Collect project sources and build embedded script
    local project_sources = project_detection.collect_project_sources()
    local config_json = string_utils.table_to_json(init_config)
    local embedded_sources_script = config_module.build_embedded_sources_script(project_sources)

    -- Build title wrapping script
    local title_id = config.id_prefix .. config.id_separator .. 'document-title'
    local title_script = [[
<script>
  // Wrap the document title with review attributes
  document.addEventListener('DOMContentLoaded', function() {
    const titleEl = document.querySelector('h1.title');
    if (titleEl && !titleEl.hasAttribute('data-review-id')) {
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

    -- Add JS and initialization to body
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

-- Create filter functions using the element-wrapping module
local filters = element_wrapping.create_filter_functions(config, context)

-- Note: The cleanup_note_filter has been removed as of this commit.
-- Para elements inside Notes (footnotes) are now skipped during Pass 2 (wrapping phase)
-- instead of being wrapped and then cleaned up. This prevents the div syntax from
-- appearing in the data-review-markdown attributes of paragraphs containing footnote references.

-- Return filters in order
-- Note: Filters run in the order they appear in this array
-- 1. Meta filter runs first
-- 2. Pass 1: Identify nested lists and elements inside Notes (whole document pass)
-- 3. Pass 2: Main wrapping filters (Para, Header, BlockQuote, lists, etc.)
--    - Skips marked nested lists
--    - Skips Para elements inside Notes (footnotes)
return {
  {Meta = Meta},
  element_wrapping.create_identify_filter(config),  -- Pass 1: Mark nested lists and Note contents
  filters  -- Pass 2: Main wrapping filters
}
