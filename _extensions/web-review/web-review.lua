-- Web Review Extension for Quarto
-- Enables collaborative commenting and editing in rendered HTML documents

-- Debug logging function (only logs when debug mode is enabled)
local function debug_log(...)
  if DEBUG_MODE then
    print("[Web Review Debug]", ...)
  end
end

-- Meta function: Processes document metadata and checks for debug mode
function Meta(meta)
  -- Enable debug mode if specified in metadata
  if meta["web-review"] and meta["web-review"]["debug"] then
    DEBUG_MODE = pandoc.utils.stringify(meta["web-review"]["debug"]) == "true"
  else
    DEBUG_MODE = false
  end

  debug_log("Meta() called")
  return meta
end

-- Main Pandoc function: Injects web review UI and assets into the document
function Pandoc(doc)
  debug_log("Pandoc() called")

  -- Check if web-review is enabled in document metadata
  local enabled = false
  if doc.meta and doc.meta["web-review"] and doc.meta["web-review"]["enabled"] then
    enabled = pandoc.utils.stringify(doc.meta["web-review"]["enabled"]) == "true"
  end

  debug_log("Extension enabled:", enabled)

  if enabled then
    debug_log("Adding web review assets to document")
    
    -- Embed original QMD content for export functionality
    local qmd_content = ""
    if PANDOC_STATE and PANDOC_STATE.input_files and #PANDOC_STATE.input_files > 0 then
      local qmd_file = PANDOC_STATE.input_files[1]
      debug_log("Reading QMD file:", qmd_file)

      local file = io.open(qmd_file, "r")
      if file then
        qmd_content = file:read("*all")
        file:close()
        debug_log("Successfully read QMD content (" .. string.len(qmd_content) .. " characters)")
      else
        debug_log("Could not read QMD file")
      end
    else
      debug_log("No input files available")
    end

    -- Add debug attribute to body if debug mode is enabled
    local debug_script = ""
    if DEBUG_MODE then
      debug_script = [[
<script>
  document.addEventListener('DOMContentLoaded', function() {
    document.body.setAttribute('data-web-review-debug', 'true');
    console.log('[Web Review] Debug mode enabled');
  });
</script>
]]
    end

    -- Create web review HTML block with UI, styles, and embedded content
    local web_review_html = pandoc.RawBlock("html", debug_script .. [[
<!-- WEB REVIEW EXTENSION -->
<style>
@keyframes web-review-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); background-color: #e3f2fd; }
  100% { transform: scale(1); }
}

.web-review-editable-hover {
  outline: 1px dashed #007acc !important;
  cursor: text !important;
}

.web-review-comment-highlight {
  background: #fff3cd !important;
  border-bottom: 2px solid #007acc !important;
  cursor: pointer !important;
}

.web-review-has-comments {
  position: relative !important;
  cursor: pointer !important;
}

.web-review-visual-editor {
  outline: none !important;
}

.web-review-visual-editor h1,
.web-review-visual-editor h2,
.web-review-visual-editor h3 {
  margin: 10px 0 !important;
  font-weight: bold !important;
}

.web-review-visual-editor h1 { font-size: 1.8em !important; }
.web-review-visual-editor h2 { font-size: 1.5em !important; }
.web-review-visual-editor h3 { font-size: 1.3em !important; }

.web-review-visual-editor p {
  margin: 8px 0 !important;
}

.web-review-visual-editor strong {
  font-weight: bold !important;
}

.web-review-visual-editor em {
  font-style: italic !important;
}

.web-review-visual-editor code {
  background: #f5f5f5 !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-family: 'Courier New', monospace !important;
  font-size: 0.9em !important;
}

.web-review-visual-editor a {
  color: #007acc !important;
  text-decoration: underline !important;
}

.web-review-visual-editor ul,
.web-review-visual-editor ol {
  margin: 8px 0 !important;
  padding-left: 20px !important;
}

.web-review-visual-editor li {
  margin: 2px 0 !important;
}

.web-review-mode-toggle {
  display: flex !important;
  background: #f1f3f4 !important;
  border-radius: 6px !important;
  padding: 2px !important;
  gap: 0 !important;
}

.web-review-mode-btn {
  flex: 1 !important;
  padding: 6px 12px !important;
  border: none !important;
  background: transparent !important;
  color: #5f6368 !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
}

.web-review-mode-btn.active {
  background: white !important;
  color: #1a73e8 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
}

.web-review-mode-btn:hover:not(.active) {
  background: rgba(0,0,0,0.05) !important;
}

.web-review-toolbar-btn {
  padding: 4px 8px !important;
  border: 1px solid #ddd !important;
  background: white !important;
  border-radius: 3px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  transition: all 0.2s ease !important;
}

.web-review-toolbar-btn:hover {
  background: #f5f5f5 !important;
  border-color: #007acc !important;
}

.web-review-toolbar-btn.active {
  background: #007acc !important;
  color: white !important;
  border-color: #007acc !important;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1) !important;
}

.web-review-comment-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  padding: 12px 16px !important;
  border-radius: 6px !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
  max-width: 400px !important;
  z-index: 10002 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  pointer-events: none !important;
  word-wrap: break-word !important;
  white-space: pre-wrap !important;
}

.web-review-comment-tooltip::before {
  content: '' !important;
  position: absolute !important;
  top: -6px !important;
  left: 20px !important;
  width: 0 !important;
  height: 0 !important;
  border-left: 6px solid transparent !important;
  border-right: 6px solid transparent !important;
  border-bottom: 6px solid rgba(0, 0, 0, 0.9) !important;
}
</style>
<div id="web-review-container">
  <!-- Toggle Button -->
  <div id="web-review-toggle" style="
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #007acc;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10000;
    font-size: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  " title="Web Review">
    💬
  </div>

  <!-- Sidebar (initially hidden) -->
  <div id="web-review-sidebar" style="
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: white;
    border-left: 1px solid #ddd;
    z-index: 9999;
    transition: right 0.3s ease;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    overflow-y: auto;
  ">
    <!-- User Section -->
    <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div id="user-avatar" style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #007acc;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
          ">?</div>
          <div>
            <input id="username-input" type="text" placeholder="Enter your name..." style="
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 4px 8px;
              font-size: 12px;
              width: 120px;
            ">
            <div id="user-status" style="font-size: 10px; color: #666; margin-top: 2px;">Guest User</div>
          </div>
        </div>
        <button id="web-review-close" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        ">×</button>
      </div>
    </div>
    
    <!-- Header Section -->
    <div style="padding: 15px; border-bottom: 1px solid #eee;">
      <h3 style="margin: 0; color: #333; font-size: 16px;">Web Review</h3>
    </div>
    <div id="web-review-filters" style="padding: 15px; border-bottom: 1px solid #eee;">
      <div style="margin-bottom: 10px; font-size: 14px; font-weight: bold; color: #333;">Filter by type:</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="filter-btn active" data-filter="all" title="Show all comments and changes" style="
          padding: 4px 8px;
          border: 1px solid #007acc;
          background: #007acc;
          color: white;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">All</button>
        <button class="filter-btn" data-filter="comments" title="Show only comments" style="
          padding: 4px 8px;
          border: 1px solid #007acc;
          background: white;
          color: #007acc;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Comments</button>
        <button class="filter-btn" data-filter="changes" title="Show only text changes" style="
          padding: 4px 8px;
          border: 1px solid #007acc;
          background: white;
          color: #007acc;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Text Changes</button>
        <button class="filter-btn" data-filter="pending" title="Show pending items" style="
          padding: 4px 8px;
          border: 1px solid #007acc;
          background: white;
          color: #007acc;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Pending</button>
        <button class="filter-btn" data-filter="accepted" title="Show accepted changes" style="
          padding: 4px 8px;
          border: 1px solid #007acc;
          background: white;
          color: #007acc;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Accepted</button>
      </div>
    </div>

    <!-- Display Options -->
    <div id="web-review-display-options" style="padding: 15px; border-bottom: 1px solid #eee; background: #f9fafb;">
      <div style="margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #333;">Display Options:</div>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
        <input type="checkbox" id="toggle-inline-diff" checked style="cursor: pointer;">
        <span>Show inline diff visualization</span>
      </label>
    </div>

    <div id="web-review-content" style="padding: 20px;">
      <p id="empty-state" style="color: #666; margin: 0;">Select text to add comments or suggestions.</p>
    </div>

    <!-- Export Section -->
    <div style="padding: 15px; border-top: 1px solid #eee; background: #f8f9fa;">
      <div style="margin-bottom: 10px; font-size: 14px; font-weight: bold; color: #333;">Export Options:</div>
      <button id="export-criticmarkup-btn" style="
        width: 100%;
        padding: 8px 12px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 8px;
      " title="Download QMD file with CriticMarkup annotations">📥 Download QMD with Annotations</button>
      <button id="clear-storage-btn" style="
        width: 100%;
        padding: 8px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
      " title="Clear all stored changes and comments">🗑️ Clear All Changes</button>
    </div>
  </div>

  <!-- Selection Popup (hidden by default) -->
  <div id="web-review-popup" style="
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 10001;
    display: none;
  ">
    <button id="add-comment-btn" title="Add a comment to this selected text" style="
      background: #007acc;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      cursor: pointer;
      margin-right: 5px;
    ">💬 Add Comment</button>
    <button id="suggest-edit-btn" title="Edit this paragraph or section" style="
      background: #28a745;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      cursor: pointer;
    ">✏️ Edit Text</button>
  </div>
</div>

<!-- jsdiff library for text differencing -->
<script src="https://cdn.jsdelivr.net/npm/diff@5.1.0/dist/diff.min.js"></script>

<script src="_extensions/web-review/web-review.js"></script>

<!-- Embedded Original QMD Content for Export -->
<script type="text/plain" id="original-qmd-content">]] .. qmd_content .. [[</script>

<!-- END WEB REVIEW EXTENSION -->
]])

    -- Insert the HTML block into the document
    doc.blocks:insert(web_review_html)
    debug_log("Web Review UI inserted into document")
  else
    debug_log("Extension not enabled")
  end

  return doc
end

debug_log("Web Review filter loaded")