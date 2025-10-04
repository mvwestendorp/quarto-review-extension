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

      return await response.json();
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
