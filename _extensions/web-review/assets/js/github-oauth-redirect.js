/**
 * GitHub OAuth with Redirect Flow
 * Works with static HTML sites (no CORS issues)
 */

class GitHubOAuthRedirect {
  constructor(clientId, redirectUri = null) {
    this.clientId = clientId;
    this.redirectUri = redirectUri || window.location.href.split('?')[0];
    this.tokenKey = 'github_oauth_token';
    this.userKey = 'github_oauth_user';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = sessionStorage.getItem(this.tokenKey);
    return token !== null;
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Get stored user info
   */
  async getUserInfo() {
    const cached = sessionStorage.getItem(this.userKey);
    if (cached) {
      return JSON.parse(cached);
    }

    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = await response.json();
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
    return user;
  }

  /**
   * Start OAuth flow by redirecting to GitHub
   */
  initiateAuth() {
    const state = this.generateState();
    sessionStorage.setItem('oauth_state', state);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', 'repo user');
    authUrl.searchParams.set('state', state);

    // Redirect to GitHub
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback (call this on page load)
   */
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      return false; // No OAuth callback
    }

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('OAuth state mismatch - possible CSRF attack');
    }

    // Exchange code for token using GitHub's web flow
    // Note: This still requires a proxy because token exchange needs client_secret
    // For a fully static solution, we need to use GitHub's OAuth app with no secret

    // IMPORTANT: GitHub OAuth Apps require client_secret for token exchange
    // This cannot be done client-side without a proxy
    // We need a different approach...

    throw new Error('Token exchange requires a server-side proxy');
  }

  /**
   * Generate random state for CSRF protection
   */
  generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Logout
   */
  logout() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    sessionStorage.removeItem('oauth_state');
  }

  // GitHub API methods (same as before)
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
      throw new Error(`Failed to create branch: ${error.message}`);
    }

    return await createResponse.json();
  }

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
      throw new Error(`Failed to create/update file: ${error.message}`);
    }

    return await response.json();
  }

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
      throw new Error(`Failed to create PR: ${error.message}`);
    }

    return await response.json();
  }
}
