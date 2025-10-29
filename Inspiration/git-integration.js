/**
 * Git Integration Manager
 * Handles the workflow of converting review data to Git operations
 */

class GitIntegration {
  constructor(provider) {
    this.provider = provider;
    this.config = null;
  }

  /**
   * Configure the integration with repository details
   * @param {Object} config - {owner, repo, baseBranch}
   */
  configure(config) {
    this.config = {
      owner: config.owner,
      repo: config.repo,
      baseBranch: config.baseBranch || 'main',
      ...config
    };
  }

  /**
   * Generate a unique review branch name
   * @param {string} reviewerName
   * @returns {string}
   */
  generateBranchName(reviewerName) {
    const timestamp = Date.now();
    const cleanName = reviewerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `review/${cleanName}-${timestamp}`;
  }

  /**
   * Create a review branch
   * @param {string} reviewerName
   * @returns {Promise<{branchName: string, ref: Object}>}
   */
  async createReviewBranch(reviewerName) {
    if (!this.config) {
      throw new Error('Git integration not configured');
    }

    const branchName = this.generateBranchName(reviewerName);

    try {
      const ref = await this.provider.createBranch(
        this.config.owner,
        this.config.repo,
        branchName,
        this.config.baseBranch
      );

      return { branchName, ref };
    } catch (error) {
      console.error('Failed to create review branch:', error);
      throw error;
    }
  }

  /**
   * Apply a single change to a file in the repository
   * @param {string} branchName
   * @param {Object} change - {filePath, content, message}
   * @returns {Promise<Object>}
   */
  async applyChange(branchName, change) {
    if (!this.config) {
      throw new Error('Git integration not configured');
    }

    try {
      // Get current file content to get SHA (needed for updates)
      const fileInfo = await this.provider.getFileContent(
        this.config.owner,
        this.config.repo,
        change.filePath,
        branchName
      );

      // Create or update the file
      const result = await this.provider.createOrUpdateFile(
        this.config.owner,
        this.config.repo,
        change.filePath,
        change.content,
        change.message || 'Apply review change',
        branchName,
        fileInfo?.sha // Include SHA for updates
      );

      return result;
    } catch (error) {
      console.error('Failed to apply change:', error);
      throw error;
    }
  }

  /**
   * Apply multiple changes as individual commits
   * @param {string} branchName
   * @param {Array} changes - Array of {filePath, content, message}
   * @returns {Promise<Array>}
   */
  async applyChanges(branchName, changes) {
    const results = [];

    for (const change of changes) {
      try {
        const result = await this.applyChange(branchName, change);
        results.push({ success: true, change, result });
      } catch (error) {
        results.push({ success: false, change, error: error.message });
      }
    }

    return results;
  }

  /**
   * Create a pull request with review changes and comments
   * @param {string} branchName
   * @param {Object} reviewData - {title, changes, comments, reviewer}
   * @returns {Promise<Object>}
   */
  async createReviewPullRequest(branchName, reviewData) {
    if (!this.config) {
      throw new Error('Git integration not configured');
    }

    const metadata = this.getMetadata();
    let finalCommitSha = reviewData.latestCommitSha;
    let finalFileSha = reviewData.latestFileSha;
    let finalFileContent = reviewData.latestFileContent;

    // Step 1: If there are comments, add markers BEFORE creating the PR
    if (reviewData.comments && reviewData.comments.length > 0) {
      if (window.debugGit) debugGit(`Adding markers for ${reviewData.comments.length} comments before creating PR...`);

      const markerResult = await this.addCommentMarkers(
        reviewData.comments,
        metadata.repository.sourceFile,
        branchName,
        finalFileSha,
        finalFileContent
      );

      if (markerResult.commitSha) {
        finalCommitSha = markerResult.commitSha;
        finalFileSha = markerResult.fileSha;
        if (window.debugGit) debugGit(`Markers added, new commit SHA: ${finalCommitSha}`);
      }
    }

    // Step 2: Create the pull request (now points to commits including markers)
    const title = reviewData.title || `Review suggestions from ${reviewData.reviewer}`;
    const body = this.generatePullRequestBody(reviewData);

    try {
      const pr = await this.provider.createPullRequest(
        this.config.owner,
        this.config.repo,
        title,
        body,
        branchName,
        this.config.baseBranch
      );

      if (window.debugGit) debugGit('PR created:', pr.number, pr.html_url);

      // Step 3: Add review comments (they now reference the final commit with markers)
      if (reviewData.comments && reviewData.comments.length > 0) {
        if (window.debugGit) debugGit(`Adding ${reviewData.comments.length} review comments to PR...`);

        const prComments = await this.calculateCommentLineNumbers(
          reviewData.comments,
          metadata.repository.sourceFile,
          finalFileSha,
          finalFileContent || reviewData.latestFileContent
        );

        try {
          await this.provider.createPullRequestReviewComments(
            this.config.owner,
            this.config.repo,
            pr.number,
            prComments,
            finalCommitSha
          );
          if (window.debugGit) debugGit('Review comments added successfully');
        } catch (commentError) {
          console.warn('Failed to add some review comments:', commentError);
          // Don't fail the whole PR if comments fail
        }
      }

      return pr;
    } catch (error) {
      console.error('Failed to create pull request:', error);
      throw error;
    }
  }

  /**
   * Generate pull request body from review data
   * @param {Object} reviewData
   * @returns {string}
   */
  generatePullRequestBody(reviewData) {
    let body = `## Review Summary\n\n`;
    body += `**Reviewer:** ${reviewData.reviewer}\n`;
    body += `**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

    // Add reviewer's overall summary if provided
    if (reviewData.summary && reviewData.summary.length > 0) {
      body += `### Overall Comments\n\n`;
      body += `${reviewData.summary}\n\n`;
    }

    // Use actual commits if provided (from updates), otherwise show changes
    const commits = reviewData.commits || [];
    const changesArray = reviewData.changes instanceof Map
      ? Array.from(reviewData.changes.values())
      : (reviewData.changes || []);

    // Show commits that were actually created
    if (commits.length > 0) {
      body += `### Recent Edits (${commits.length})\n\n`;
      commits.forEach((commit, index) => {
        body += `${index + 1}. ${commit.message}\n`;
      });
      body += `\n`;
      body += `_See commit history for all changes in this review._\n\n`;
    } else if (changesArray.length > 0) {
      // Fallback for initial PR creation
      body += `### Edits Made (${changesArray.length})\n\n`;
      changesArray.forEach((change, index) => {
        body += `${index + 1}. ${change.message || 'Updated content'}\n`;
      });
      body += `\n`;
    }

    // Add comments count
    if (reviewData.comments && reviewData.comments.length > 0) {
      body += `### Inline Comments (${reviewData.comments.length})\n\n`;
      body += `See inline PR comments for detailed feedback on specific sections.\n\n`;
    }

    // Add metadata
    body += `---\n`;
    body += `🤖 Generated with [Quarto Web Review](https://github.com/yourusername/quarto-web-review)\n`;

    return body;
  }

  /**
   * Convert review changes to git-ready format
   * @param {Map} changesMap - Map of changes from review UI
   * @param {Map} sourcesMap - Map of source files
   * @returns {Array} Array of {filePath, content, message}
   */
  convertReviewChangesToGitFormat(changesMap, sourcesMap) {
    const gitChanges = [];

    changesMap.forEach((change, changeId) => {
      if (change.status === 'accepted') {
        // Map element ID to source file
        const sourceFile = this.mapElementToSourceFile(change.elementId, sourcesMap);

        if (sourceFile) {
          // Apply the change to the source content
          const updatedContent = this.applyChangeToSource(
            sourceFile.content,
            change,
            sourceFile.mapping
          );

          gitChanges.push({
            filePath: sourceFile.path,
            content: updatedContent,
            message: `Apply change: ${change.type} in ${change.elementId}`
          });
        }
      }
    });

    return gitChanges;
  }

  /**
   * Map HTML element to source file
   * @param {string} elementId
   * @param {Map} sourcesMap
   * @returns {Object|null} {path, content, mapping}
   */
  mapElementToSourceFile(elementId, sourcesMap) {
    // This is a simplified implementation
    // In production, you'd have a proper mapping from HTML elements to source locations
    const sourcesScript = document.getElementById('embedded-sources');

    if (sourcesScript) {
      try {
        const data = JSON.parse(sourcesScript.textContent);

        if (data.mappings && data.mappings[elementId]) {
          const mapping = data.mappings[elementId];
          const source = data.sources[mapping.file];

          if (source) {
            return {
              path: mapping.file,
              content: source.content || source,
              mapping: mapping
            };
          }
        }
      } catch (error) {
        console.error('Failed to map element to source:', error);
      }
    }

    return null;
  }

  /**
   * Apply a change to source file content
   * @param {string} sourceContent
   * @param {Object} change
   * @param {Object} mapping - {lineStart, lineEnd, columnStart, columnEnd}
   * @returns {string}
   */
  applyChangeToSource(sourceContent, change, mapping) {
    if (!mapping) {
      console.warn('No mapping available, returning original content');
      return sourceContent;
    }

    const lines = sourceContent.split('\n');

    if (change.type === 'text-edit') {
      // Replace lines with modified content
      const newLines = change.modified.split('\n');
      lines.splice(
        mapping.lineStart - 1,
        mapping.lineEnd - mapping.lineStart + 1,
        ...newLines
      );
    }

    return lines.join('\n');
  }

  /**
   * Complete workflow: Create branch, apply changes, create PR
   * @param {Object} reviewData - {reviewer, changes, comments, sources}
   * @returns {Promise<Object>} {branch, commits, pullRequest}
   */
  async submitReview(reviewData) {
    try {
      // Step 0: Ensure original QMD file exists in the target repository (on main branch)
      const fileExisted = await this.ensureOriginalFileExists();

      // Step 1: Check if this review session already has an associated PR
      const metadata = this.getMetadata();
      const reviewKey = `${metadata.repository.owner}/${metadata.repository.repo}/${metadata.repository.sourceFile}`;
      const sessionPRNumber = localStorage.getItem(`web-review-session-pr-${reviewKey}`);

      let existingPR = null;
      if (sessionPRNumber) {
        // Try to get the PR from this session
        try {
          const allPRs = await this.provider.listPullRequests(this.config.owner, this.config.repo);
          existingPR = allPRs.find(pr => pr.number === parseInt(sessionPRNumber) && pr.state === 'open');

          if (!existingPR) {
            // PR was closed/merged, clear the session tracking
            localStorage.removeItem(`web-review-session-pr-${reviewKey}`);
            if (window.debugGit) debugGit('Session PR was closed/merged, will create new PR');
          }
        } catch (error) {
          if (window.debugGit) debugGit('Error fetching session PR:', error);
        }
      }

      let branchName, pullRequest;

      if (existingPR) {
        // Update existing PR from this session
        if (window.debugGit) debugGit('Found existing PR from this session:', existingPR.number, existingPR.html_url);
        branchName = existingPR.head.ref;

        // Step 2: Apply review changes as individual commits to the existing branch
        const result = await this.applyReviewChanges(branchName, reviewData.changes);
        const commits = result.commits;
        const latestFileSha = result.latestFileSha;
        if (window.debugGit) debugGit('Applied changes to existing branch, commits:', commits);

        // If no new commits, don't update PR (but don't error either - might just be adding comments)
        if (commits.length === 0 && (!reviewData.comments || reviewData.comments.length === 0)) {
          throw new Error('No new changes to submit. The edits you made could not be matched to the source file. Try refreshing the page and making your edits again.');
        }

        // Step 3: Update the PR description if there are new commits
        if (commits.length > 0) {
          const newBody = this.generatePullRequestBody({
            ...reviewData,
            commits: commits  // Only the commits that were just created
          });
          pullRequest = await this.provider.updatePullRequest(
            this.config.owner,
            this.config.repo,
            existingPR.number,
            { body: newBody }
          );
        } else {
          // No commits but has comments - just get the existing PR
          pullRequest = existingPR;
        }

        // Step 4: Add new comments if any
        if (reviewData.comments && reviewData.comments.length > 0) {
          // Get the latest commit SHA (either from new commits or from the PR head)
          const latestCommitSha = commits.length > 0 ? commits[commits.length - 1].sha : existingPR.head.sha;
          // Only add to Files changed if there were actual text commits in this submission
          const hasTextChanges = commits.length > 0;
          await this.addCommentsToExistingPR(existingPR.number, reviewData.comments, branchName, latestCommitSha, hasTextChanges, latestFileSha);
        }

        if (window.debugGit) debugGit('Updated existing PR:', pullRequest.html_url);

        return {
          branch: branchName,
          commits: commits,
          pullRequest: pullRequest,
          isUpdate: true
        };
      } else {
        // Create new PR
        if (window.debugGit) debugGit('No existing PR found, creating new one');

        // Step 2: Create review branch (from main, which now has the original file)
        const branchResult = await this.createReviewBranch(reviewData.reviewer);
        branchName = branchResult.branchName;
        if (window.debugGit) debugGit('Created review branch:', branchName);

        // Step 3: Apply review changes as individual commits on the review branch
        const applyResult = await this.applyReviewChanges(branchName, reviewData.changes);
        const commits = applyResult.commits;
        const latestFileSha = applyResult.latestFileSha;
        const latestFileContent = applyResult.latestFileContent;
        if (window.debugGit) debugGit('Applied changes, commits:', commits);

        // Check if any commits were actually created
        if (commits.length === 0) {
          throw new Error('No commits were created. The changes could not be matched to the source file.\n\nThis usually happens because:\n1. You already submitted these changes (check your open PRs)\n2. The changes were made in a previous session\n\nSolution: Click "Clear All Changes" and start fresh, or check if your changes are already in an open PR.');
        }

        // Step 4: Create pull request (comparing review branch to main)
        // Pass the latest commit SHA, file SHA, and file content for attaching review comments
        const latestCommitSha = commits.length > 0 ? commits[commits.length - 1].sha : null;
        pullRequest = await this.createReviewPullRequest(branchName, {...reviewData, latestCommitSha, latestFileSha, latestFileContent});

        // Store this PR number for the current review session
        localStorage.setItem(`web-review-session-pr-${reviewKey}`, pullRequest.number);
        if (window.debugGit) debugGit('Stored session PR number:', pullRequest.number);

        return {
          branch: branchName,
          commits: commits,
          pullRequest: pullRequest,
          isUpdate: false
        };
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Find existing open PR from this reviewer
   * @param {string} reviewer - Reviewer username
   * @returns {Promise<Object|null>} Existing PR or null
   */
  async findExistingReviewPR(reviewer) {
    if (!this.config) {
      throw new Error('Git integration not configured');
    }

    try {
      // List all open PRs
      const allPRs = await this.provider.listPullRequests(this.config.owner, this.config.repo);

      // Find PR from this reviewer with review branch pattern
      const reviewPR = allPRs.find(pr =>
        pr.head.ref.startsWith(`review/${reviewer}-`) &&
        pr.user.login === reviewer
      );

      return reviewPR || null;
    } catch (error) {
      if (window.debugGit) debugGit('Error checking for existing PR:', error);
      return null; // If we can't check, assume no existing PR
    }
  }

  /**
   * Add comments to an existing PR
   * @param {number} prNumber - PR number
   * @param {Array} comments - Comments to add
   * @param {string} branchName - Branch name
   * @param {string} latestCommitSha - Latest commit SHA
   * @param {boolean} hasTextChanges - Whether there are text changes in this submission
   * @param {string} latestFileSha - Latest file SHA (from commits, if available)
   */
  async addCommentsToExistingPR(prNumber, comments, branchName, latestCommitSha, hasTextChanges = false, latestFileSha = null) {
    if (comments.length === 0) return;

    if (window.debugGit) debugGit(`Adding ${comments.length} new review comments to PR #${prNumber}...`);

    const metadata = this.getMetadata();

    // Only try to add HTML markers if there are text changes
    // Otherwise, just add comments to conversation (no Files changed integration)
    if (window.debugGit) {
      if (hasTextChanges) {
        debugGit('Adding comments with HTML markers (will appear in Files changed view)');
      } else {
        debugGit('Adding comments without markers (conversation only, no text changes)');
      }
    }

    const prComments = await this.prepareCommentsWithLineNumbers(
      comments,
      metadata.repository.sourceFile,
      branchName,
      hasTextChanges,
      latestFileSha
    );

    try {
      // Only pass commitSha for Files changed view if there are text changes
      await this.provider.createPullRequestReviewComments(
        this.config.owner,
        this.config.repo,
        prNumber,
        prComments,
        hasTextChanges ? latestCommitSha : null
      );
      if (window.debugGit) debugGit('Review comments added successfully');
    } catch (commentError) {
      console.warn('Failed to add some review comments:', commentError);
    }
  }

  /**
   * Prepare comments with line numbers by finding selected text in file
   * Also adds HTML comments to those lines to make them part of the diff (if addMarkers is true)
   * @param {Array} comments - Review comments
   * @param {string} filePath - Path to file in repo
   * @param {string} branchName - Branch name
   * @param {boolean} addMarkers - Whether to add HTML comment markers (only if there are text changes)
   * @param {string} knownFileSha - Known file SHA (from recent commits, avoids stale SHA issues)
   * @param {string} knownFileContent - Known file content (from recent commits, avoids GitHub API cache)
   */
  async prepareCommentsWithLineNumbers(comments, filePath, branchName, addMarkers = false, knownFileSha = null, knownFileContent = null) {
    if (!comments || comments.length === 0) {
      return [];
    }

    let content;
    let fileSha;

    // Use known file content if provided (avoids stale GitHub API cache)
    if (knownFileContent && knownFileSha) {
      if (window.debugGit) {
        debugGit(`Using provided file content (${knownFileContent.length} chars) and SHA: ${knownFileSha}`);
      }
      content = knownFileContent;
      fileSha = knownFileSha;
    } else {
      // Fallback: fetch from GitHub API
      const fileContent = await this.provider.getFileContent(
        this.config.owner,
        this.config.repo,
        filePath,
        branchName
      );

      if (!fileContent) {
        // Can't access file, return comments without line numbers
        return comments.map(comment => ({
          body: `**Comment by ${comment.author || 'Anonymous'}:**\n\n${comment.comment}\n\n> Selected text: "${comment.selectedText}"`,
          path: filePath,
          line: null
        }));
      }

      if (window.debugGit) {
        debugGit(`Fetched file content from GitHub API, SHA: ${fileContent.sha}`);
        if (knownFileSha) {
          debugGit(`Known SHA: ${knownFileSha}, Match: ${fileContent.sha === knownFileSha}`);
        }
      }

      content = atob(fileContent.content);
      fileSha = fileContent.sha;
    }

    const lines = content.split('\n');

    if (window.debugGit) {
      debugGit(`File has ${lines.length} lines total`);
    }

    // Find line numbers for each comment and collect them
    const commentsWithLines = [];
    const linesToMark = new Set();

    for (const comment of comments) {
      let lineNumber = null;

      // PREFER: Resolve section ID to current line number using change history
      if (comment.sectionId && window.criticMarkupManager) {
        const section = window.criticMarkupManager.qmdSectionMap[comment.sectionId];
        if (section && section.sectionIndex !== undefined) {
          // Calculate current line number by applying ALL changes (pass null for timestamp)
          // This is correct because during Git submission, all text changes are committed
          // BEFORE we add comments, so all offsets should be applied
          const originalLine = section.lineStart;
          const currentLine = window.criticMarkupManager.calculateCurrentLineNumber(
            section.sectionIndex,
            originalLine,
            null  // null = apply all offsets, not just changes after comment timestamp
          );
          lineNumber = currentLine + 1; // Convert to 1-indexed

          if (window.debugGit) {
            debugGit(`Resolved section ${comment.sectionId} (index ${section.sectionIndex})`);
            debugGit(`  Original line: ${originalLine}, Current line: ${currentLine} (after all offsets)`);
          }
        }
      }

      // FALLBACK: Try to find the line containing the selected text
      if (!lineNumber) {
        const selectedText = comment.selectedText || '';
        if (selectedText) {
          const cleanedSelected = selectedText.trim().toLowerCase();
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(cleanedSelected)) {
              lineNumber = i + 1; // Line numbers are 1-indexed
              if (window.debugGit) debugGit(`Found line ${lineNumber} by searching for text: "${selectedText.substring(0, 30)}..."`);
              break;
            }
          }
        }
      }

      if (lineNumber) {
        linesToMark.add(lineNumber - 1); // Track 0-indexed line to mark

        commentsWithLines.push({
          body: `**Comment by ${comment.author || 'Anonymous'}:**\n\n${comment.comment}\n\n> Selected text: "${comment.selectedText}"`,
          path: filePath,
          line: lineNumber,
          selectedText: comment.selectedText,
          commentData: comment
        });
      } else {
        // Can't find line, add as conversation comment only
        commentsWithLines.push({
          body: `**Comment by ${comment.author || 'Anonymous'}:**\n\n${comment.comment}\n\n> Selected text: "${comment.selectedText}"`,
          path: filePath,
          line: null
        });
      }
    }

    // If we have lines to mark, ALWAYS add HTML comment markers to make them part of the diff
    // This is necessary for GitHub to accept review comments in the Files changed view
    if (linesToMark.size > 0) {
      if (window.debugGit) debugGit(`Adding HTML markers to ${linesToMark.size} lines`);
      const modifiedLines = [...lines];

      // Add HTML comments to the marked lines
      // Sort in reverse order to avoid index shifting
      const sortedLines = Array.from(linesToMark).sort((a, b) => b - a);

      for (const lineIdx of sortedLines) {
        // Skip if line already has a marker
        if (modifiedLines[lineIdx].includes('<!-- review-comment -->')) {
          if (window.debugGit) debugGit(`Line ${lineIdx + 1} already has marker, skipping`);
          continue;
        }
        // Add invisible HTML comment marker at end of line
        // This makes the line part of the diff while being invisible in rendered output
        modifiedLines[lineIdx] = modifiedLines[lineIdx] + ' <!-- review-comment -->';
        if (window.debugGit) debugGit(`Added marker to line ${lineIdx + 1}: "${modifiedLines[lineIdx].substring(0, 50)}..."`);
      }

      let modifiedContent = modifiedLines.join('\n');

      // Only commit if we actually modified something
      if (modifiedContent !== content) {
        try {
          if (window.debugGit) {
            const modLines = modifiedContent.split('\n');
            debugGit(`Committing marker content with ${modLines.length} lines (original had ${lines.length} lines)`);
            debugGit(`Using file SHA: ${fileSha}`);
            debugGit(`First 3 lines of marker commit:\n${modLines.slice(0, 3).join('\n')}`);
          }

          // Commit the markers using the file SHA (which matches the content we're modifying)
          await this.provider.createOrUpdateFile(
            this.config.owner,
            this.config.repo,
            filePath,
            modifiedContent,
            'Add review comment markers',
            branchName,
            fileSha
          );

          if (window.debugGit) debugGit(`Added comment markers to ${linesToMark.size} lines`);
        } catch (error) {
          console.warn('Failed to add comment markers:', error);
          // Continue without markers - comments will go to conversation only
        }
      }
    }

    return commentsWithLines;
  }

  /**
   * Add HTML comment markers to lines where comments exist
   * This makes those lines part of the diff so GitHub can attach review comments
   * @param {Array} comments - Review comments
   * @param {string} filePath - Path to file in repo
   * @param {string} branchName - Branch name
   * @param {string} fileSha - Current file SHA
   * @param {string} fileContent - Current file content
   * @returns {Promise<Object>} {commitSha, fileSha} or {} if no markers added
   */
  async addCommentMarkers(comments, filePath, branchName, fileSha, fileContent) {
    if (!comments || comments.length === 0) {
      return {};
    }

    const lines = fileContent.split('\n');
    const linesToMark = new Set();

    // Calculate line numbers for all comments
    for (const comment of comments) {
      let lineNumber = null;

      // Resolve section ID to current line number using change history
      if (comment.sectionId && window.criticMarkupManager) {
        const section = window.criticMarkupManager.qmdSectionMap[comment.sectionId];
        if (section && section.sectionIndex !== undefined) {
          const originalLine = section.lineStart;
          const currentLine = window.criticMarkupManager.calculateCurrentLineNumber(
            section.sectionIndex,
            originalLine,
            null  // Apply all offsets
          );

          // Use stored offset within section if available
          if (comment.offsetWithinSection !== undefined && comment.offsetWithinSection !== null) {
            lineNumber = currentLine + comment.offsetWithinSection + 1; // Add offset and convert to 1-indexed
            if (window.debugGit) {
              debugGit(`Using stored offset ${comment.offsetWithinSection} within section (line ${lineNumber})`);
            }
          } else {
            // Fallback: search within the section for the selected text
            lineNumber = currentLine + 1; // Start with section's first line

            if (comment.selectedText) {
              const cleanedSelected = comment.selectedText.trim().toLowerCase();
              const originalLineEnd = section.lineEnd || section.lineStart;
              const sectionLength = originalLineEnd - section.lineStart;

              for (let offset = 0; offset <= sectionLength; offset++) {
                const lineIdx = currentLine + offset;
                if (lineIdx < lines.length && lines[lineIdx].toLowerCase().includes(cleanedSelected)) {
                  lineNumber = lineIdx + 1;
                  if (window.debugGit) {
                    debugGit(`Found comment text at offset ${offset} within section (line ${lineNumber})`);
                  }
                  break;
                }
              }
            }
          }

          if (window.debugGit) {
            debugGit(`Comment on section ${comment.sectionId} (index ${section.sectionIndex}): line ${lineNumber}`);
          }
        }
      }

      // Fallback: search for selected text in entire file
      if (!lineNumber && comment.selectedText) {
        const cleanedSelected = comment.selectedText.trim().toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(cleanedSelected)) {
            lineNumber = i + 1;
            if (window.debugGit) debugGit(`Found comment text by searching entire file (line ${lineNumber})`);
            break;
          }
        }
      }

      if (lineNumber) {
        linesToMark.add(lineNumber - 1); // Track 0-indexed
      }
    }

    if (linesToMark.size === 0) {
      if (window.debugGit) debugGit('No lines to mark');
      return {};
    }

    // Add markers to lines
    const modifiedLines = [...lines];
    const sortedLines = Array.from(linesToMark).sort((a, b) => b - a);

    for (const lineIdx of sortedLines) {
      if (!modifiedLines[lineIdx].includes('<!-- review-comment -->')) {
        modifiedLines[lineIdx] = modifiedLines[lineIdx] + ' <!-- review-comment -->';
        if (window.debugGit) debugGit(`Marking line ${lineIdx + 1}`);
      }
    }

    const modifiedContent = modifiedLines.join('\n');

    // Only commit if content changed
    if (modifiedContent === fileContent) {
      if (window.debugGit) debugGit('No new markers to add (already present)');
      return {};
    }

    // Commit the markers
    try {
      if (window.debugGit) debugGit(`Committing markers for ${linesToMark.size} lines using SHA: ${fileSha}`);

      const result = await this.provider.createOrUpdateFile(
        this.config.owner,
        this.config.repo,
        filePath,
        modifiedContent,
        'Add review comment markers',
        branchName,
        fileSha
      );

      return {
        commitSha: result.commit.sha,
        fileSha: result.content.sha
      };
    } catch (error) {
      console.warn('Failed to add comment markers:', error);
      return {};
    }
  }

  /**
   * Calculate line numbers for comments (without adding markers or committing)
   * @param {Array} comments - Review comments
   * @param {string} filePath - Path to file in repo
   * @param {string} fileSha - Current file SHA
   * @param {string} fileContent - Current file content
   * @returns {Promise<Array>} Comments with line numbers
   */
  async calculateCommentLineNumbers(comments, filePath, fileSha, fileContent) {
    if (!comments || comments.length === 0) {
      return [];
    }

    const lines = fileContent.split('\n');
    const commentsWithLines = [];

    for (const comment of comments) {
      let lineNumber = null;

      // Resolve section ID to current line number using change history
      if (comment.sectionId && window.criticMarkupManager) {
        const section = window.criticMarkupManager.qmdSectionMap[comment.sectionId];
        if (section && section.sectionIndex !== undefined) {
          const originalLine = section.lineStart;
          const currentLine = window.criticMarkupManager.calculateCurrentLineNumber(
            section.sectionIndex,
            originalLine,
            null  // Apply all offsets
          );

          // Use stored offset within section if available
          if (comment.offsetWithinSection !== undefined && comment.offsetWithinSection !== null) {
            lineNumber = currentLine + comment.offsetWithinSection + 1; // Add offset and convert to 1-indexed
            if (window.debugGit) {
              debugGit(`Using stored offset ${comment.offsetWithinSection} within section (line ${lineNumber})`);
            }
          } else {
            // Fallback: search within the section for the selected text
            lineNumber = currentLine + 1; // Start with section's first line

            if (comment.selectedText) {
              const cleanedSelected = comment.selectedText.trim().toLowerCase();
              const originalLineEnd = section.lineEnd || section.lineStart;
              const sectionLength = originalLineEnd - section.lineStart;

              for (let offset = 0; offset <= sectionLength; offset++) {
                const lineIdx = currentLine + offset;
                if (lineIdx < lines.length && lines[lineIdx].toLowerCase().includes(cleanedSelected)) {
                  lineNumber = lineIdx + 1;
                  if (window.debugGit) {
                    debugGit(`Found comment text at offset ${offset} within section (line ${lineNumber})`);
                  }
                  break;
                }
              }
            }
          }

          if (window.debugGit) {
            debugGit(`Comment line ${lineNumber} for section ${comment.sectionId}`);
          }
        }
      }

      // Fallback: search for selected text in entire file
      if (!lineNumber && comment.selectedText) {
        const cleanedSelected = comment.selectedText.trim().toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(cleanedSelected)) {
            lineNumber = i + 1;
            break;
          }
        }
      }

      commentsWithLines.push({
        body: comment.comment,
        path: filePath,
        line: lineNumber
      });
    }

    return commentsWithLines;
  }

  /**
   * Apply review changes as individual commits
   * Each change becomes a separate commit on the branch
   * @param {string} branchName
   * @param {Map|Array} changes - Map or Array of change objects with {filePath, original, modified, message}
   * @returns {Promise<Array>}
   */
  async applyReviewChanges(branchName, changes) {
    // Convert Map to Array if needed
    const changesArray = changes instanceof Map ? Array.from(changes.values()) : changes;

    if (!changesArray || changesArray.length === 0) {
      if (window.debugGit) debugGit('No new changes to apply (all already submitted)');
      return {
        commits: [],
        latestFileSha: null
      };
    }

    if (window.debugGit) debugGit(`Total changes to apply: ${changesArray.length}`);

    const commits = [];
    const metadata = this.getMetadata();
    const { owner, repo, sourceFile } = metadata.repository;

    // Get current file content from the branch
    let currentContent = await this.provider.getFileContent(owner, repo, sourceFile, branchName);
    let fileSha = currentContent?.sha;
    let fileContent = currentContent ? atob(currentContent.content) : '';

    if (window.debugGit) {
      debugGit(`Starting file content: ${fileContent.length} chars`);
      debugGit(`Initial file SHA: ${fileSha}`);
    }

    // Apply each change as a separate commit
    for (let i = 0; i < changesArray.length; i++) {
      const change = changesArray[i];
      if (window.debugGit) {
        debugGit(`\n=== Change ${i + 1}/${changesArray.length} ===`);
        debugGit('Message:', change.message);
        debugGit('Original text (first 100 chars):', change.original?.substring(0, 100));
        debugGit('Modified text (first 100 chars):', change.modified?.substring(0, 100));
      }

      // Skip suspicious changes: empty original with single character modified
      // This catches phantom edits like empty -> "d"
      if ((!change.original || change.original.trim() === '') &&
          change.modified && change.modified.trim().length === 1) {
        if (window.debugGit) debugGit('⚠️ Skipping suspicious single-character change from empty string');
        continue;
      }

      // Try direct replacement first
      let updatedContent = fileContent.replace(change.original, change.modified);

      if (updatedContent === fileContent) {
        // Exact match failed - try normalized matching (ignore blank lines and whitespace differences)
        if (window.debugGit) debugGit('⚠️ Exact match failed, trying normalized matching...');

        const normalizeForMatching = (text) => {
          return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
        };

        const normalizedOriginal = normalizeForMatching(change.original);
        const normalizedFile = normalizeForMatching(fileContent);

        if (window.debugGit) {
          debugGit('Normalized original (first 200 chars):', normalizedOriginal.substring(0, 200));
          debugGit('Normalized file contains it?', normalizedFile.includes(normalizedOriginal));
        }

        if (normalizedFile.includes(normalizedOriginal)) {
          // Find the actual text in the file by looking for the normalized pattern
          const originalLines = change.original.split('\n').filter(line => line.trim().length > 0);
          const firstLine = originalLines[0].trim();
          const lastLine = originalLines[originalLines.length - 1].trim();

          if (window.debugGit) {
            debugGit('Looking for first line:', firstLine);
            debugGit('Looking for last line:', lastLine);
          }

          // Find the start and end positions in the original file
          const fileLines = fileContent.split('\n');
          let startIdx = -1;
          let endIdx = -1;

          for (let j = 0; j < fileLines.length; j++) {
            if (fileLines[j].trim() === firstLine) {
              // Check if we can find the last line after this
              for (let k = j; k < fileLines.length; k++) {
                if (fileLines[k].trim() === lastLine) {
                  startIdx = j;
                  endIdx = k;
                  break;
                }
              }
              if (startIdx !== -1) break;
            }
          }

          if (window.debugGit) {
            debugGit('Found section at lines:', startIdx, 'to', endIdx);
          }

          if (startIdx !== -1 && endIdx !== -1) {
            // Replace the section with the modified version
            const beforeSection = fileLines.slice(0, startIdx).join('\n');
            const afterSection = fileLines.slice(endIdx + 1).join('\n');
            updatedContent = beforeSection + '\n' + change.modified + '\n' + afterSection;

            if (window.debugGit) debugGit('✓ Normalized matching succeeded');
          } else {
            if (window.debugGit) {
              debugGit('⚠️ Change not found in file (may have been already applied)');
              debugGit('  This can happen if the change was already committed in a previous session');
            }
            continue; // Skip this change
          }
        } else {
          if (window.debugGit) {
            debugGit('⚠️ Normalized text not found in file');
            debugGit('  This can happen if the change was already committed in a previous session');
          }
          continue; // Skip this change
        }
      }

      // Create commit with this change
      const commitMessage = change.message || `Review change ${i + 1}`;
      if (window.debugGit) debugGit(`Creating commit: "${commitMessage}" with SHA: ${fileSha}`);

      const result = await this.provider.createOrUpdateFile(
        owner,
        repo,
        sourceFile,
        updatedContent,
        commitMessage,
        branchName,
        fileSha
      );

      commits.push({
        message: commitMessage,
        sha: result.commit.sha
      });

      // Update for next iteration
      fileContent = updatedContent;
      fileSha = result.content.sha;

      if (window.debugGit) debugGit(`✓ Commit ${i + 1} created: ${result.commit.sha}, new file SHA: ${fileSha}`);
    }

    if (window.debugGit) debugGit(`\nTotal commits created: ${commits.length}`);

    return {
      commits: commits,
      latestFileSha: fileSha,  // Return the latest file SHA after all commits
      latestFileContent: fileContent  // Return the latest file content (avoids stale cache)
    };
  }

  /**
   * Get embedded metadata
   */
  getMetadata() {
    const sourcesScript = document.getElementById('embedded-sources');
    if (!sourcesScript) {
      throw new Error('No embedded source metadata found');
    }
    return JSON.parse(sourcesScript.textContent);
  }

  /**
   * Ensure the original QMD file exists in the target repository on the main branch
   * If not, create it with the embedded original content
   * @returns {Promise<boolean>} true if file already existed, false if it was created
   */
  async ensureOriginalFileExists() {
    if (window.debugGit) debugGit('Checking if original file exists in repository...');

    // Get embedded metadata
    const sourcesScript = document.getElementById('embedded-sources');
    if (!sourcesScript) {
      throw new Error('No embedded source metadata found');
    }

    const metadata = JSON.parse(sourcesScript.textContent);
    if (window.debugGit) debugGit('Metadata:', metadata);

    if (!metadata.repository || !metadata.repository.sourceFile) {
      throw new Error('Repository metadata or source file path not found');
    }

    const { owner, repo, branch, sourceFile } = metadata.repository;
    if (window.debugGit) debugGit(`Checking for file: ${owner}/${repo}/${sourceFile} on branch ${branch}`);

    // Check if file exists in the repository on the main branch
    const existingFile = await this.provider.getFileContent(owner, repo, sourceFile, branch);

    if (!existingFile) {
      if (window.debugGit) debugGit(`File ${sourceFile} not found on ${branch}. Creating it on ${branch}...`);

      // Get the original QMD content
      const originalQmdScript = document.getElementById('original-qmd-content');
      if (!originalQmdScript) {
        throw new Error('Original QMD content not found in document');
      }

      const originalContent = originalQmdScript.textContent;
      if (window.debugGit) debugGit(`Original content length: ${originalContent.length} characters`);

      // Create the file on the main branch
      await this.provider.createOrUpdateFile(
        owner,
        repo,
        sourceFile,
        originalContent,
        `Initialize ${sourceFile} for web review`,
        branch  // Create on main branch
      );

      if (window.debugGit) debugGit(`Successfully created ${sourceFile} on ${branch}`);
      return false; // File was created
    } else {
      if (window.debugGit) debugGit(`File ${sourceFile} already exists on ${branch}`);
      return true; // File already existed
    }
  }

  /**
   * Get repository selection UI data
   * @returns {Promise<Array>} List of repositories
   */
  async getRepositories() {
    try {
      return await this.provider.listRepositories('all');
    } catch (error) {
      console.error('Failed to get repositories:', error);
      throw error;
    }
  }

  /**
   * Auto-detect repository from embedded metadata
   * @returns {Object|null} {owner, repo, baseBranch}
   */
  autoDetectRepository() {
    const sourcesScript = document.getElementById('embedded-sources');

    if (sourcesScript) {
      try {
        const data = JSON.parse(sourcesScript.textContent);

        if (data.repository) {
          return {
            owner: data.repository.owner,
            repo: data.repository.repo,
            baseBranch: data.repository.branch || 'main'
          };
        }
      } catch (error) {
        console.error('Failed to auto-detect repository:', error);
      }
    }

    return null;
  }

  /**
   * Parse QMD content into sections (same logic as in web-review.js)
   * Used to resolve section IDs to current line numbers
   */
  parseQmdSections(qmd) {
    const lines = qmd.split('\n');
    const sections = [];
    let i = 0;

    // Skip YAML frontmatter if present
    if (lines[i] && lines[i].trim() === '---') {
      i++; // Skip opening ---
      while (i < lines.length && lines[i].trim() !== '---') {
        i++;
      }
      if (i < lines.length) {
        i++; // Skip closing ---
      }
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        sections.push({
          type: `h${headingMatch[1].length}`,
          qmdText: line.trim(),
          lineStart: i,
          lineEnd: i
        });
        i++;
        continue;
      }

      // List
      const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+/);
      if (listMatch) {
        const startLine = i;
        const listLines = [line];
        i++;

        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();

          if (!nextTrimmed) {
            if (i + 1 < lines.length && lines[i + 1].trim().match(/^([-*+]|\d+\.)\s+/)) {
              i++;
              continue;
            } else {
              break;
            }
          } else if (nextTrimmed.match(/^([-*+]|\d+\.)\s+/)) {
            listLines.push(nextLine);
            i++;
          } else {
            break;
          }
        }

        sections.push({
          type: trimmed.match(/^\d+\./) ? 'ol' : 'ul',
          qmdText: listLines.join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
        continue;
      }

      // Paragraph (default)
      const startLine = i;
      const paraLines = [line];
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();

        if (!nextTrimmed ||
            nextTrimmed.match(/^#{1,6}\s+/) ||
            nextTrimmed.match(/^([-*+]|\d+\.)\s+/) ||
            nextTrimmed.startsWith('```') ||
            nextTrimmed.startsWith('>')) {
          break;
        }

        paraLines.push(nextLine);
        i++;
      }

      sections.push({
        type: 'p',
        qmdText: paraLines.join('\n'),
        lineStart: startLine,
        lineEnd: i - 1
      });
    }

    return sections;
  }

  /**
   * Normalize text for comparison (remove formatting, normalize quotes)
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[""]/g, '"')  // Normalize curly quotes
      .replace(/['']/g, "'")  // Normalize curly apostrophes
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
      .replace(/`([^`]+)`/g, '$1')        // Remove code
      .trim();
  }
}

// Export for use in other modules
window.GitIntegration = GitIntegration;
