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
    local debug_value = meta["web-review"]["debug"]
    if type(debug_value) == "table" then
      -- Support object format: { general: true, git: true, editing: false }
      DEBUG_MODE = debug_value["general"] and pandoc.utils.stringify(debug_value["general"]) == "true" or false
      DEBUG_GIT = debug_value["git"] and pandoc.utils.stringify(debug_value["git"]) == "true" or false
      DEBUG_EDITING = debug_value["editing"] and pandoc.utils.stringify(debug_value["editing"]) == "true" or false
    else
      -- Support simple boolean: debug: true (enables all)
      DEBUG_MODE = pandoc.utils.stringify(debug_value) == "true"
      DEBUG_GIT = DEBUG_MODE
      DEBUG_EDITING = DEBUG_MODE
    end
  else
    DEBUG_MODE = false
    DEBUG_GIT = false
    DEBUG_EDITING = false
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

    -- Extract Git repository metadata from document config
    local git_repo_metadata = ""
    local git_enabled = "false"
    local git_provider = "github"
    local source_file_path = ""

    -- Get the source file path from quarto metadata or git config
    if doc.meta["web-review"] and doc.meta["web-review"]["git"] and doc.meta["web-review"]["git"]["source-file"] then
      source_file_path = pandoc.utils.stringify(doc.meta["web-review"]["git"]["source-file"])
    elseif quarto and quarto.doc and quarto.doc.input_file then
      -- Try to get from Quarto's document metadata
      source_file_path = quarto.doc.input_file:match("([^/]+)$") or quarto.doc.input_file
    elseif PANDOC_STATE and PANDOC_STATE.input_files and #PANDOC_STATE.input_files > 0 then
      -- Fallback to input file (but this might be a temp file)
      local full_path = PANDOC_STATE.input_files[1]
      source_file_path = full_path:match("([^/]+)$") or full_path
      -- Filter out temporary file patterns
      if source_file_path:match("^quarto%-input") then
        source_file_path = "" -- Will use default below
      end
    end

    if doc.meta["web-review"] and doc.meta["web-review"]["git"] then
      local git_config = doc.meta["web-review"]["git"]

      -- Check if Git integration is enabled
      if git_config["enabled"] then
        git_enabled = pandoc.utils.stringify(git_config["enabled"])
      end

      -- Get provider
      if git_config["provider"] then
        git_provider = pandoc.utils.stringify(git_config["provider"])
      end

      -- Get repository metadata
      if git_config["repository"] then
        local repo = git_config["repository"]
        local owner = repo["owner"] and pandoc.utils.stringify(repo["owner"]) or ""
        local repo_name = repo["repo"] and pandoc.utils.stringify(repo["repo"]) or ""
        local branch = repo["branch"] and pandoc.utils.stringify(repo["branch"]) or "main"

        if owner ~= "" and repo_name ~= "" then
          git_repo_metadata = string.format([[
{
  "owner": "%s",
  "repo": "%s",
  "branch": "%s",
  "sourceFile": "%s"
}]], owner, repo_name, branch, source_file_path)
          debug_log("Embedded git repository metadata: " .. git_repo_metadata)
        end
      end
    end

    -- Add debug configuration script
    local debug_script = ""
    if DEBUG_MODE or DEBUG_GIT or DEBUG_EDITING then
      local debug_flags = string.format([[{
    general: %s,
    git: %s,
    editing: %s
  }]], DEBUG_MODE and "true" or "false", DEBUG_GIT and "true" or "false", DEBUG_EDITING and "true" or "false")

      debug_script = [[
<script>
  window.WebReviewDebug = ]] .. debug_flags .. [[;
  document.addEventListener('DOMContentLoaded', function() {
    if (window.WebReviewDebug.general || window.WebReviewDebug.git || window.WebReviewDebug.editing) {
      document.body.setAttribute('data-web-review-debug', 'true');
      console.log('[Web Review] Debug mode enabled:', window.WebReviewDebug);
    }
  });
</script>
]]
    end

    -- Create web review HTML block (review-ui.js will create the UI dynamically)
    local web_review_html = pandoc.RawBlock("html", debug_script .. [[
<!-- WEB REVIEW EXTENSION -->
<style>
/* Legacy styles for compatibility */
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
      <div style="margin-bottom: 10px; font-size: 14px; font-weight: bold; color: #333;">Review Summary:</div>
      <textarea id="review-summary-input" placeholder="Add overall review comments (optional)..." style="
        width: 100%;
        min-height: 80px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        margin-bottom: 15px;
        box-sizing: border-box;
      "></textarea>

      <div style="margin-bottom: 10px; font-size: 14px; font-weight: bold; color: #333;">Export Options:</div>
      <button id="submit-to-git-btn" style="
        width: 100%;
        padding: 8px 12px;
        background: #24292e;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 8px;
        display: none;
      " title="Submit review as Pull Request to GitHub">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="white" style="vertical-align: middle; margin-right: 4px;">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
        </svg>
        Submit to Git
      </button>
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
  </div> <!-- Close legacy toggle wrapper -->
</div>

<!-- jsdiff library for text differencing -->
<script src="https://cdn.jsdelivr.net/npm/diff@5.1.0/dist/diff.min.js"></script>

<!-- Main review UI script -->
<script src="_extensions/web-review/web-review.js"></script>

<!-- Git integration scripts (loaded conditionally) -->
<script src="_extensions/web-review/assets/js/github-pat-provider.js"></script>
<script src="_extensions/web-review/assets/js/git-integration.js"></script>
<script src="_extensions/web-review/assets/js/oauth-ui.js"></script>

<!-- Embedded Original QMD Content for Export -->
<script type="text/plain" id="original-qmd-content">]] .. qmd_content .. [[</script>

<!-- Embedded Git Repository Metadata -->
<script type="application/json" id="embedded-sources">
{
  "timestamp": "]] .. os.date("%Y-%m-%dT%H:%M:%SZ") .. [[",
  "repository": ]] .. (git_repo_metadata ~= "" and git_repo_metadata or "null") .. [[,
  "sources": {},
  "mappings": {}
}
</script>

<!-- Web Review Configuration -->
<script>
window.WebReviewConfig = {
  git: {
    enabled: ]] .. git_enabled .. [[,
    provider: "]] .. git_provider .. [["
  }
};

// Initialize Git Integration when document is ready
document.addEventListener('DOMContentLoaded', function() {
  const gitConfig = window.WebReviewConfig?.git;

  if (!gitConfig?.enabled) return;

  const gitButton = document.getElementById('submit-to-git-btn');
  if (!gitButton) return;

  // Show button if git is enabled
  gitButton.style.display = 'block';

  const provider = new GitHubPATProvider();
  const gitIntegration = new GitIntegration(provider);
  const oauthUI = new OAuthUI();

  gitButton.addEventListener('click', async function() {
    try {
      // Check if we have a stored PAT
      if (!provider.isAuthenticated()) {
        // Prompt user for PAT
        const token = await oauthUI.showPATInput(gitConfig.provider);
        if (!token) return; // User cancelled

        // Store PAT
        provider.setAccessToken(token);
      }

      // Configure repository
      const repoData = document.getElementById('embedded-sources');
      let data = null;
      if (repoData) {
        data = JSON.parse(repoData.textContent);
        if (data.repository) {
          gitIntegration.configure(data.repository);
        }
      }

      // Get review data from criticMarkupManager
      const comments = window.criticMarkupManager?.comments || [];
      const elementStates = window.criticMarkupManager?.elementStates || {};

      // Debug logging
      if (window.debugGit) {
        debugGit('CriticMarkup Manager:', window.criticMarkupManager);
        debugGit('Comments:', comments);
        debugGit('Element States:', elementStates);
        debugGit('Comments length:', comments.length);
        debugGit('Element States keys:', Object.keys(elementStates));
      }

      // Check if there are any changes or comments
      if (comments.length === 0 && Object.keys(elementStates).length === 0) {
        alert('No changes to submit. Make some edits or add comments first!');
        return;
      }

      const userInfo = await provider.getUserInfo();

      // Get the source file path from repository metadata
      const sourceFile = data?.repository?.sourceFile || 'document.qmd';

      // Helper function to convert HTML tags to human-readable names
      function humanReadableElementType(tag) {
        const typeMap = {
          'p': 'paragraph',
          'h1': 'heading',
          'h2': 'section heading',
          'h3': 'subsection heading',
          'h4': 'subheading',
          'h5': 'subheading',
          'h6': 'subheading',
          'ul': 'list',
          'ol': 'numbered list',
          'li': 'list item',
          'blockquote': 'quote',
          'pre': 'code block',
          'code': 'code',
          'table': 'table',
          'tr': 'table row',
          'td': 'table cell',
          'th': 'table header',
          'a': 'link',
          'img': 'image',
          'div': 'section',
          'span': 'text',
          'strong': 'bold text',
          'em': 'italic text'
        };
        return typeMap[tag.toLowerCase()] || tag;
      }

      // Helper function to generate smart commit messages
      function generateCommitMessage(original, modified, elementPath) {
        // Extract element type from path (e.g., "ol", "p", "h2")
        const elementTag = elementPath.split(' > ').pop().split(/[.#\[]/)[0];
        const elementType = humanReadableElementType(elementTag);

        // Analyze the type of change
        const origWords = original.trim().split(/\s+/).length;
        const modWords = modified.trim().split(/\s+/).length;
        const wordDiff = Math.abs(modWords - origWords);

        // Check for formatting-only changes (e.g., backslash escapes)
        const origClean = original.replace(/\\/g, '');
        const modClean = modified.replace(/\\/g, '');
        const isFormattingOnly = origClean === modClean;

        if (isFormattingOnly) {
          return `Fix formatting in ${elementType}`;
        }

        // Significant content change
        if (wordDiff > 10 || (wordDiff / origWords) > 0.3) {
          return `Rewrite ${elementType}`;
        }

        // Minor edit
        if (wordDiff > 0) {
          return modWords > origWords
            ? `Add content to ${elementType}`
            : `Shorten ${elementType}`;
        }

        // Words count same, but content changed
        const origFirst50 = original.substring(0, 50).trim();
        const modFirst50 = modified.substring(0, 50).trim();

        if (origFirst50 !== modFirst50) {
          return `Edit ${elementType}: "${modFirst50}${modified.length > 50 ? '...' : ''}"`;
        }

        return `Update ${elementType}`;
      }

      // Get already submitted commits from localStorage to avoid duplicates
      const submittedCommits = JSON.parse(localStorage.getItem('web-review-submitted-commits') || '{}');
      const currentReviewKey = data?.repository?.owner + '/' + data?.repository?.repo + '/' + sourceFile;

      // Convert elementStates to changes array for git-integration
      const changes = [];
      const alreadySubmittedCommits = submittedCommits[currentReviewKey] || [];
      const commitIdsToSubmit = []; // Track commit IDs being submitted in this batch

      for (const [path, state] of Object.entries(elementStates)) {
        // Process all commits for this element, not just the latest
        for (let commitIdx = 0; commitIdx < state.commits.length; commitIdx++) {
          const commit = state.commits[commitIdx];
          const commitId = path + ':' + commit.timestamp;

          // Skip if this commit was already successfully submitted in a previous session
          if (alreadySubmittedCommits.includes(commitId)) {
            if (window.debugGit) debugGit('Skipping already-submitted commit:', commitId);
            continue;
          }

          const message = generateCommitMessage(
            commitIdx === 0 ? state.originalMarkdown : state.commits[commitIdx - 1].reviewedMarkdown,
            commit.reviewedMarkdown,
            path
          );

          changes.push({
            filePath: sourceFile,
            elementPath: path,
            original: commitIdx === 0 ? state.originalMarkdown : state.commits[commitIdx - 1].reviewedMarkdown,
            modified: commit.reviewedMarkdown,
            author: commit.author,
            message: message,
            status: 'accepted',
            commitId: commitId  // Add ID for tracking
          });

          // Track this commit ID for marking as submitted AFTER success
          commitIdsToSubmit.push(commitId);
        }
      }

      // Get review summary from textarea
      const reviewSummaryInput = document.getElementById('review-summary-input');
      const reviewSummary = reviewSummaryInput ? reviewSummaryInput.value.trim() : '';

      // Submit review
      oauthUI.showSubmissionProgress({ step: 1, message: 'Creating review branch...', progress: 10 });

      const result = await gitIntegration.submitReview({
        reviewer: userInfo.login,
        title: 'Review from ' + (userInfo.name || userInfo.login),
        summary: reviewSummary,
        changes: new Map(changes.map((c, i) => [i, c])),
        comments: comments,
        sources: {}
      });

      // Only mark commits as submitted AFTER successful submission
      const newSubmittedCommits = [...alreadySubmittedCommits, ...commitIdsToSubmit];
      submittedCommits[currentReviewKey] = newSubmittedCommits;
      localStorage.setItem('web-review-submitted-commits', JSON.stringify(submittedCommits));
      if (window.debugGit) debugGit(`Marked ${commitIdsToSubmit.length} commits as successfully submitted`);

      oauthUI.showSubmissionSuccess({
        pullRequest: result.pullRequest,
        branch: result.branch,
        isUpdate: result.isUpdate
      });

    } catch (error) {
      console.error('Git submission error:', error);
      oauthUI.showAuthError('Failed to submit review: ' + error.message);
    }
  });
});
</script>

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