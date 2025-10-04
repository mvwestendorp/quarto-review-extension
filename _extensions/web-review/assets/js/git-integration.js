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

    // Generate PR title and body
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
    body += `Reviewer: **${reviewData.reviewer}**\n`;
    body += `Date: ${new Date().toLocaleDateString()}\n\n`;

    // Add changes summary
    if (reviewData.changes && reviewData.changes.length > 0) {
      body += `### Changes (${reviewData.changes.length})\n\n`;
      reviewData.changes.forEach((change, index) => {
        body += `${index + 1}. \`${change.filePath}\` - ${change.message || 'Updated'}\n`;
      });
      body += `\n`;
    }

    // Add comments
    if (reviewData.comments && reviewData.comments.length > 0) {
      body += `### Comments (${reviewData.comments.length})\n\n`;
      reviewData.comments.forEach((comment, index) => {
        body += `${index + 1}. **${comment.type || 'General'}**: ${comment.text}\n`;
        if (comment.elementId) {
          body += `   - Element: \`${comment.elementId}\`\n`;
        }
      });
      body += `\n`;
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
      // Step 1: Create review branch
      const { branchName } = await this.createReviewBranch(reviewData.reviewer);

      // Step 2: Convert review changes to git format
      const gitChanges = this.convertReviewChangesToGitFormat(
        reviewData.changes,
        reviewData.sources
      );

      // Step 3: Apply all changes as commits
      const commits = await this.applyChanges(branchName, gitChanges);

      // Step 4: Create pull request
      const pullRequest = await this.createReviewPullRequest(branchName, {
        title: reviewData.title,
        reviewer: reviewData.reviewer,
        changes: gitChanges,
        comments: reviewData.comments
      });

      return {
        branch: branchName,
        commits: commits,
        pullRequest: pullRequest
      };
    } catch (error) {
      console.error('Failed to submit review:', error);
      throw error;
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
}

// Export for use in other modules
window.GitIntegration = GitIntegration;
