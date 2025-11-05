--[[
Project Detection Module
Handles project root detection and source file collection
]]--

local path_utils = require('_extensions.review.lib.path-utils')

local M = {}

-- Directories to ignore when scanning project
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

-- Get the primary input file being processed
function M.get_primary_input_file()
  if PANDOC_STATE and PANDOC_STATE.input_files and #PANDOC_STATE.input_files > 0 then
    return PANDOC_STATE.input_files[1]
  end
  if quarto and quarto.doc and quarto.doc.input_file then
    return quarto.doc.input_file
  end
  return nil
end

-- Detect project root from extension path
function M.detect_project_root_from_extension()
  local info = debug.getinfo(1, 'S')
  if not info or not info.source then
    return nil
  end
  local source_path = info.source
  if source_path:sub(1, 1) == '@' then
    source_path = source_path:sub(2)
  end
  source_path = path_utils.normalize_path(source_path)
  local marker = '/_extensions/'
  local idx = source_path:find(marker, 1, true)
  if idx then
    return path_utils.normalize_path(source_path:sub(1, idx - 1))
  end
  return nil
end

-- Detect project root from quarto.project or environment
function M.detect_project_root()
  if quarto and quarto.project and quarto.project.directory and quarto.project.directory ~= '' then
    return path_utils.normalize_path(path_utils.to_forward_slashes(quarto.project.directory))
  end
  local env_dir = os.getenv('QUARTO_PROJECT_DIR') or os.getenv('QUARTO_PROJECT_PATH')
  if env_dir and env_dir ~= '' then
    return path_utils.normalize_path(path_utils.to_forward_slashes(env_dir))
  end
  local from_extension = M.detect_project_root_from_extension()
  if from_extension then
    return from_extension
  end
  return nil
end

-- Find project root by looking for _quarto.yml
function M.find_project_root(start_dir)
  if not start_dir then
    return '.'
  end
  local dir = path_utils.normalize_path(start_dir)
  local last = nil
  while dir and dir ~= last do
    if path_utils.file_exists(path_utils.join_paths(dir, '_quarto.yml')) or
       path_utils.file_exists(path_utils.join_paths(dir, '_quarto.yaml')) then
      return dir
    end
    last = dir
    local next_dir = path_utils.parent_directory(dir)
    if not next_dir or next_dir == dir then
      break
    end
    dir = next_dir
  end
  return start_dir
end

-- Check if directory should be skipped
function M.should_skip_directory(name)
  return name == '.' or name == '..' or IGNORE_DIRECTORIES[name] == true
end

-- Collect all project source files
function M.collect_project_sources()
  local sources = {}
  local input_file = M.get_primary_input_file()
  local abs_input = input_file and path_utils.to_absolute_path(input_file)
  local start_dir = abs_input and path_utils.parent_directory(abs_input) or path_utils.get_working_directory()
  local project_root = M.detect_project_root() or (start_dir and M.find_project_root(start_dir)) or start_dir
  project_root = path_utils.normalize_path(project_root or '.')

  local function add_source(full_path)
    if not full_path then
      return
    end
    local content = path_utils.read_file(full_path)
    if content then
      local relative = path_utils.make_relative(full_path, project_root)
      if project_root ~= '.' and relative == path_utils.normalize_path(full_path) then
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
  local project_yaml = path_utils.join_paths(project_root, '_quarto.yml')
  if path_utils.file_exists(project_yaml) then
    add_source(project_yaml)
  end
  local project_yaml_alt = path_utils.join_paths(project_root, '_quarto.yaml')
  if path_utils.file_exists(project_yaml_alt) then
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
      if not M.should_skip_directory(entry) then
        local full = path_utils.join_paths(dir, entry)
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

return M
