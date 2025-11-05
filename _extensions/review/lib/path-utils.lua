--[[
Path Utilities Module
Handles cross-platform path operations for the Quarto Review Extension
]]--

local M = {}

-- Convert backslashes to forward slashes
function M.to_forward_slashes(path_str)
  return (path_str or ''):gsub('\\', '/')
end

-- Normalize a path to remove . and .. segments
function M.normalize_path(path_str)
  if not path_str or path_str == '' then
    return '.'
  end
  path_str = M.to_forward_slashes(path_str)
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

-- Join two paths together
function M.join_paths(base, child)
  if not child or child == '' then
    return M.normalize_path(base or '.')
  end
  if child:sub(1, 1) == '/' or child:match('^[A-Za-z]:') then
    return M.normalize_path(child)
  end
  if not base or base == '' or base == '.' then
    return M.normalize_path(child)
  end
  local prefix = M.normalize_path(base)
  if prefix == '/' then
    return M.normalize_path('/' .. child)
  end
  return M.normalize_path(prefix .. '/' .. child)
end

-- Get parent directory of a path
function M.parent_directory(path_str)
  local normalized = M.normalize_path(path_str)
  if normalized == '/' then
    return '/'
  end
  local parent = normalized:match('^(.*)/[^/]*$')
  if not parent or parent == '' then
    return '.'
  end
  return parent
end

-- Make a path relative to a base path
function M.make_relative(full, base)
  local norm_full = M.normalize_path(full)
  local norm_base = M.normalize_path(base)
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

-- Get the current working directory
function M.get_working_directory()
  if pandoc.system and pandoc.system.get_working_directory then
    return M.normalize_path(pandoc.system.get_working_directory())
  end
  return '.'
end

-- Convert a relative path to absolute
function M.to_absolute_path(path_str)
  if not path_str then
    return nil
  end
  if path_str:sub(1, 1) == '/' or path_str:match('^[A-Za-z]:') then
    return M.normalize_path(path_str)
  end
  local cwd = M.get_working_directory()
  return M.normalize_path(M.join_paths(cwd, path_str))
end

-- Check if a file exists
function M.file_exists(path_str)
  local fh = io.open(path_str, 'rb')
  if fh then
    fh:close()
    return true
  end
  return false
end

-- Read entire file contents
function M.read_file(path_str)
  local fh = io.open(path_str, 'rb')
  if not fh then
    return nil
  end
  local content = fh:read('*a')
  fh:close()
  if not content then
    return nil
  end
  return content
end

return M
