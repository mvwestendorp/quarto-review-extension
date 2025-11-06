--[[
Element Wrapping Module
Handles wrapping of elements for review functionality
]]--

local string_utils = require('_extensions.review.lib.string-utils')
local markdown_conversion = require('_extensions.review.lib.markdown-conversion')

local M = {}

-- Wrap element in div with review attributes
function M.make_editable(elem, elem_type, level, config, context)
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

  -- Recursively strip review-editable divs from the markdown clone
  local function strip_review_divs(el)
    local found_nested = false
    local result = el:walk {
      Div = function(div)
        if div.classes:includes("review-editable") then
          found_nested = true
          if config.debug then
            print(string.format("DEBUG: Found nested review-editable div in %s, stripping it", elem_type))
          end
          -- Recursively strip review divs inside this div's content
          local inner = pandoc.Div(div.content)
          local cleaned = strip_review_divs(inner)
          -- Return the cleaned content blocks without wrapping div
          return pandoc.Blocks(cleaned.content)
        end
      end
    }
    if not found_nested and config.debug then
      print(string.format("DEBUG: No nested review-editable divs found in %s", elem_type))
    end
    return result
  end

  local clean_elem = strip_review_divs(markdown_elem)

  -- Convert clean element to markdown
  local markdown = markdown_conversion.element_to_markdown(clean_elem)

  local attrs = {
    ['data-review-id'] = id,
    ['data-review-type'] = elem_type,
    ['data-review-origin'] = 'source',
    ['data-review-markdown'] = string_utils.escape_html(markdown),
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

-- Create filter functions for each element type
function M.create_filter_functions(config, context)
  local filters = {}

  filters.Para = function(elem)
    if not config.enabled or not config.editable_elements.Para then
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
    return M.make_editable(elem, 'CodeBlock', nil, config, context)
  end

  filters.BulletList = function(elem)
    if not config.enabled or not config.editable_elements.BulletList then
      return elem
    end

    -- Check if we're already processing a list (this would be nested)
    if context.processing_list then
      if config.debug then
        print("DEBUG: Skipping nested BulletList")
      end
      return elem
    end

    -- Mark that we're processing a list
    context.processing_list = true
    if config.debug then
      print("DEBUG: Wrapping BulletList")
    end

    local result = M.make_editable(elem, 'BulletList', nil, config, context)

    -- Reset flag after wrapping
    context.processing_list = false

    return result
  end

  filters.OrderedList = function(elem)
    if not config.enabled or not config.editable_elements.OrderedList then
      return elem
    end

    -- Check if we're already processing a list (this would be nested)
    if context.processing_list then
      if config.debug then
        print("DEBUG: Skipping nested OrderedList")
      end
      return elem
    end

    -- Mark that we're processing a list
    context.processing_list = true
    if config.debug then
      print("DEBUG: Wrapping OrderedList")
    end

    local result = M.make_editable(elem, 'OrderedList', nil, config, context)

    -- Reset flag after wrapping
    context.processing_list = false

    return result
  end

  filters.BlockQuote = function(elem)
    if not config.enabled or not config.editable_elements.BlockQuote then
      return elem
    end
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
