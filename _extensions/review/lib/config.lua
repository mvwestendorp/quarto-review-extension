--[[
Configuration Module
Handles configuration loading and document identification
]]--

local string_utils = require('_extensions.review.lib.string-utils')
local project_detection = require('_extensions.review.lib.project-detection')

local M = {}

-- Detect document identifier from metadata and various sources
function M.detect_document_identifier(meta)
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

-- Debug print function (only prints if debug mode is enabled)
function M.debug_print(message, debug_enabled)
  if debug_enabled then
    print("DEBUG: " .. message)
  end
end

-- Build debug configuration from metadata
function M.build_debug_config(meta)
  local debug_config = {}

  if meta.review and meta.review.debug then
    local debug_meta = meta.review.debug

    -- Handle case where debug is just a boolean true/false
    if type(debug_meta) == 'boolean' or (debug_meta.t == 'MetaBool') then
      debug_config.enabled = string_utils.meta_to_json(debug_meta)
      return debug_config
    end

    -- Handle case where debug is a configuration object
    if type(debug_meta) == 'table' then
      if debug_meta.enabled ~= nil then
        debug_config.enabled = string_utils.meta_to_json(debug_meta.enabled)
      end

      if debug_meta.level then
        debug_config.level = pandoc.utils.stringify(debug_meta.level)
      end

      if debug_meta.modules then
        debug_config.modules = string_utils.meta_to_json(debug_meta.modules)
      end

      if debug_meta['exclude-modules'] then
        debug_config.excludeModules = string_utils.meta_to_json(debug_meta['exclude-modules'])
      end

      if debug_meta['format-timestamp'] ~= nil then
        debug_config.formatTimestamp = string_utils.meta_to_json(debug_meta['format-timestamp'])
      end
    end
  end

  return next(debug_config) ~= nil and debug_config or nil
end

-- Check if translation support is available
-- If enabled explicitly set in config, use that value; otherwise default to true
function M.has_translation_support(enable_translation)
  if enable_translation ~= nil then
    return enable_translation
  end
  return true
end

-- Build embedded sources script tag
function M.build_embedded_sources_script(sources)
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
  local json = string_utils.table_to_json(payload):gsub('</', '<\\/')
  return '<script id="embedded-sources" type="application/json">' .. json .. '</script>'
end

-- Load configuration from document metadata
function M.load_config(meta, config)
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
    if meta.review.enableTranslation ~= nil then
      config.enableTranslation = meta.review.enableTranslation
    end
  end

  if not config.document_prefix_applied then
    -- ALWAYS process filename first, then add custom prefix
    local identifier = M.detect_document_identifier(meta)
    M.debug_print('Detected document identifier: ' .. tostring(identifier), config.debug)
    local filename_prefix = string_utils.sanitize_identifier(identifier)

    -- Build prefix with filename FIRST, then any custom prefix
    if filename_prefix ~= '' then
      -- Start with filename as primary prefix
      config.id_prefix = filename_prefix
      M.debug_print('Applying filename prefix: ' .. filename_prefix, config.debug)

      -- Add custom prefix if provided
      if custom_prefix and #custom_prefix > 0 then
        config.id_prefix = table.concat({config.id_prefix, custom_prefix}, config.id_separator)
        M.debug_print('Added custom prefix: ' .. custom_prefix, config.debug)
      end
    else
      -- Fallback: if filename detection failed, use custom prefix or default
      if custom_prefix and #custom_prefix > 0 then
        config.id_prefix = custom_prefix
        M.debug_print('No valid filename, using custom prefix: ' .. custom_prefix, config.debug)
      else
        config.id_prefix = 'review'
        M.debug_print('No valid filename and no custom prefix, using default: review', config.debug)
      end
    end

    config.document_prefix_applied = true
    M.debug_print('Final id prefix: ' .. config.id_prefix, config.debug)
  end
end

return M
