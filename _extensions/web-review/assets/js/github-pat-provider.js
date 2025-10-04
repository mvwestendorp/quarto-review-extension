/**
 * GitHub Provider with Personal Access Token (PAT) Authentication
 * Simple, no OAuth, no proxy needed
 */

class GitHubPATProvider {
  constructor() {
    this.tokenKey = 'github_pat';
    this.userKey = 'github_user';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = sessionStorage.getItem(this.tokenKey);
    return token !== null && token !== '';
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Set access token
   */
  setAccessToken(token) {
    sessionStorage.setItem(this.tokenKey, token);
  }

  /**
   * Get user info from GitHub API
   */
  async getUserInfo() {
    const cached = sessionStorage.getItem(this.userKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Invalid or expired token');
      }
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const user = await response.json();
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
    return user;
  }

  /**
   * Logout and clear stored tokens
   */
  logout() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  /**
   * Create a new branch
   */
  async createBranch(owner, repo, branchName, fromBranch = 'main') {
    const token = this.getAccessToken();

    // Get the SHA of the source branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${fromBranch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!refResponse.ok) {
      throw new Error(`Failed to get ref for ${fromBranch}: ${refResponse.status}`);
    }

    const refData = await refResponse.json();
    const sha = refData.object.sha;

    // Create new branch
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: sha
        })
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Failed to create branch: ${error.message || createResponse.status}`);
    }

    return await createResponse.json();
  }

  /**
   * Get file contents
   */
  async getFileContent(owner, repo, path, branch) {
    const token = this.getAccessToken();

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.status === 404) {
        return null; // File doesn't exist
      }

      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.status}`);
      }

      const data = await response.json();
      if (window.debugGit) {
        console.log(`[Git Integration] Fetched file ${path} from branch ${branch}, SHA: ${data.sha}`);
      }
      return data;
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(owner, repo, path, content, message, branch, sha = null) {
    const token = this.getAccessToken();

    const body = {
      message: message,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
      branch: branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create/update file: ${error.message || response.status}`);
    }

    return await response.json();
  }

  /**
   * Create a pull request
   */
  async createPullRequest(owner, repo, title, body, head, base) {
    const token = this.getAccessToken();

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          body: body,
          head: head,
          base: base
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create PR: ${error.message || response.status}`);
    }

    return await response.json();
  }

  /**
   * List open pull requests for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} head - Optional branch name to filter by (format: "user:branch")
   * @returns {Promise<Array>} List of pull requests
   */
  async listPullRequests(owner, repo, head = null) {
    const token = this.getAccessToken();

    let url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`;
    if (head) {
      url += `&head=${encodeURIComponent(head)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list PRs: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @param {Object} updates - {title, body}
   * @returns {Promise<Object>} Updated PR
   */
  async updatePullRequest(owner, repo, prNumber, updates) {
    const token = this.getAccessToken();

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update PR: ${error.message || response.status}`);
    }

    return await response.json();
  }

  /**
   * Create review comments on a pull request
   * Only adds comments to the Files changed view (not to conversation)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @param {Array} comments - Array of {body, path, line, selectedText} objects
   * @param {string} commitSha - The commit SHA to attach comments to (for Files changed view)
   * @returns {Promise<Object>} Created review
   */
  async createPullRequestReviewComments(owner, repo, prNumber, comments, commitSha = null) {
    const token = this.getAccessToken();

    const results = {
      reviewComments: []
    };

    // Add to Files changed view (review comments) if we have commit SHA and line numbers
    // No need for conversation comments since review comments already show up in the PR
    if (commitSha && comments.length > 0) {
      const reviewComments = comments
        .filter(c => c.path && c.line) // Only comments with valid line numbers
        .map(c => ({
          path: c.path,
          body: c.body,
          side: 'RIGHT',
          line: c.line
        }));

      if (window.debugGit) {
        debugGit(`Preparing ${reviewComments.length} review comments for Files changed view`);
        reviewComments.forEach((rc, i) => {
          debugGit(`  Comment ${i + 1}: line ${rc.line}, body: "${rc.body.substring(0, 50)}..."`);
        });
      }

      if (reviewComments.length > 0) {
        try {
          const reviewResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                commit_id: commitSha,
                event: 'COMMENT',
                comments: reviewComments
              })
            }
          );

          if (reviewResponse.ok) {
            results.reviewComments = await reviewResponse.json();
            if (window.debugGit) debugGit(`Successfully added ${reviewComments.length} review comments to Files changed view`);
          } else {
            const errorText = await reviewResponse.text();
            console.warn('Failed to create review comments in Files changed view:', errorText);
          }
        } catch (error) {
          console.warn('Error creating review comments:', error);
        }
      }
    }

    return results;
  }

  /**
   * Create an issue in the repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} title - Issue title
   * @param {string} body - Issue body
   * @param {Array} labels - Optional labels
   * @returns {Promise<Object>} Created issue
   */
  async createIssue(owner, repo, title, body, labels = []) {
    const token = this.getAccessToken();

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          body: body,
          labels: labels
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create issue: ${error.message || response.status}`);
    }

    return await response.json();
  }

  /**
   * Get repository information
   */
  async getRepository(owner, repo) {
    const token = this.getAccessToken();

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get repository: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Check if user has write access to repository
   */
  async hasWriteAccess(owner, repo) {
    try {
      const repoData = await this.getRepository(owner, repo);
      return repoData.permissions && repoData.permissions.push === true;
    } catch (error) {
      return false;
    }
  }
}
