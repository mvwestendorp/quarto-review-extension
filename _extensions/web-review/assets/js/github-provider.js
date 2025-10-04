/**
 * GitHub OAuth Device Flow Provider
 * Implements GitHub-specific OAuth Device Flow authentication
 */

class GitHubOAuthProvider extends OAuthDeviceFlow {
  constructor(clientId) {
    super({
      clientId: clientId,
      scopes: ['repo', 'user'],
      deviceCodeEndpoint: 'https://github.com/login/device/code',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      providerName: 'GitHub'
    });

    this.apiBase = 'https://api.github.com';
  }

  /**
   * Get authenticated user information
   * @returns {Promise<{login, name, email, avatar_url}>}
   */
  async getUserInfo() {
    const response = await this.makeAuthenticatedRequest(`${this.apiBase}/user`);

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  /**
   * List repositories accessible to the user
   * @param {string} type - 'all', 'owner', 'member'
   * @returns {Promise<Array>}
   */
  async listRepositories(type = 'all') {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/user/repos?type=${type}&sort=updated&per_page=100`
    );

    if (!response.ok) {
      throw new Error('Failed to list repositories');
    }

    return await response.json();
  }

  /**
   * Get repository information
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Object>}
   */
  async getRepository(owner, repo) {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}`
    );

    if (!response.ok) {
      throw new Error('Failed to get repository info');
    }

    return await response.json();
  }

  /**
   * Get default branch for a repository
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<string>}
   */
  async getDefaultBranch(owner, repo) {
    const repoInfo = await this.getRepository(owner, repo);
    return repoInfo.default_branch;
  }

  /**
   * Create a new branch
   * @param {string} owner
   * @param {string} repo
   * @param {string} branchName
   * @param {string} fromBranch - Base branch to create from
   * @returns {Promise<Object>}
   */
  async createBranch(owner, repo, branchName, fromBranch) {
    // Get SHA of the base branch
    const refResponse = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/git/refs/heads/${fromBranch}`
    );

    if (!refResponse.ok) {
      throw new Error(`Failed to get ref for branch: ${fromBranch}`);
    }

    const refData = await refResponse.json();
    const sha = refData.object.sha;

    // Create new branch
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: sha
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create branch');
    }

    return await response.json();
  }

  /**
   * Get file content from repository
   * @param {string} owner
   * @param {string} repo
   * @param {string} path
   * @param {string} branch
   * @returns {Promise<{content: string, sha: string}>}
   */
  async getFileContent(owner, repo, path, branch = null) {
    let url = `${this.apiBase}/repos/${owner}/${repo}/contents/${path}`;
    if (branch) {
      url += `?ref=${branch}`;
    }

    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File doesn't exist
      }
      throw new Error('Failed to get file content');
    }

    const data = await response.json();

    // Decode base64 content
    const content = atob(data.content.replace(/\n/g, ''));

    return {
      content: content,
      sha: data.sha
    };
  }

  /**
   * Create or update a file
   * @param {string} owner
   * @param {string} repo
   * @param {string} path
   * @param {string} content
   * @param {string} message - Commit message
   * @param {string} branch
   * @param {string} sha - Required for updates, omit for new files
   * @returns {Promise<Object>}
   */
  async createOrUpdateFile(owner, repo, path, content, message, branch, sha = null) {
    const body = {
      message: message,
      content: btoa(unescape(encodeURIComponent(content))), // Properly encode UTF-8 to base64
      branch: branch
    };

    if (sha) {
      body.sha = sha; // Required for updates
    }

    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create/update file');
    }

    return await response.json();
  }

  /**
   * Create a pull request
   * @param {string} owner
   * @param {string} repo
   * @param {string} title
   * @param {string} body
   * @param {string} head - Branch containing changes
   * @param {string} base - Branch to merge into
   * @returns {Promise<Object>}
   */
  async createPullRequest(owner, repo, title, body, head, base) {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
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
      throw new Error(error.message || 'Failed to create pull request');
    }

    return await response.json();
  }

  /**
   * Add a review comment to a pull request
   * @param {string} owner
   * @param {string} repo
   * @param {number} pullNumber
   * @param {string} body
   * @param {string} commitId
   * @param {string} path
   * @param {number} line
   * @returns {Promise<Object>}
   */
  async addPullRequestComment(owner, repo, pullNumber, body, commitId, path, line) {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: body,
          commit_id: commitId,
          path: path,
          line: line
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add PR comment');
    }

    return await response.json();
  }

  /**
   * List commits on a branch
   * @param {string} owner
   * @param {string} repo
   * @param {string} branch
   * @returns {Promise<Array>}
   */
  async listCommits(owner, repo, branch) {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100`
    );

    if (!response.ok) {
      throw new Error('Failed to list commits');
    }

    return await response.json();
  }

  /**
   * Compare two branches/commits
   * @param {string} owner
   * @param {string} repo
   * @param {string} base
   * @param {string} head
   * @returns {Promise<Object>}
   */
  async compareBranches(owner, repo, base, head) {
    const response = await this.makeAuthenticatedRequest(
      `${this.apiBase}/repos/${owner}/${repo}/compare/${base}...${head}`
    );

    if (!response.ok) {
      throw new Error('Failed to compare branches');
    }

    return await response.json();
  }
}

// Export for use in other modules
window.GitHubOAuthProvider = GitHubOAuthProvider;
