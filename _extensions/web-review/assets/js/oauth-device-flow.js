/**
 * OAuth Device Flow - Base Class
 * Provides a common implementation for OAuth Device Flow across providers
 */

class OAuthDeviceFlow {
  constructor(config) {
    this.config = {
      clientId: config.clientId,
      scopes: config.scopes || [],
      pollInterval: config.pollInterval || 5,
      deviceCodeEndpoint: config.deviceCodeEndpoint,
      tokenEndpoint: config.tokenEndpoint,
      providerName: config.providerName || 'OAuth Provider',
      ...config
    };

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.pollTimer = null;
  }

  /**
   * Start the device flow authentication process
   * @returns {Promise<{userCode, verificationUri, deviceCode, expiresIn, interval}>}
   */
  async initiateAuth() {
    try {
      const response = await fetch(this.config.deviceCodeEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          scope: this.config.scopes.join(' ')
        })
      });

      if (!response.ok) {
        throw new Error(`Device code request failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        verificationUriComplete: data.verification_uri_complete,
        expiresIn: data.expires_in,
        interval: data.interval || this.config.pollInterval
      };
    } catch (error) {
      console.error('Failed to initiate device flow:', error);
      throw error;
    }
  }

  /**
   * Poll for access token after user authorizes
   * @param {string} deviceCode
   * @param {number} interval - Polling interval in seconds
   * @returns {Promise<string>} Access token
   */
  async pollForToken(deviceCode, interval = 5) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5 second interval

      this.pollTimer = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(this.pollTimer);
          reject(new Error('Authentication timeout - please try again'));
          return;
        }

        try {
          const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: this.config.clientId,
              device_code: deviceCode,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          });

          const data = await response.json();

          if (data.access_token) {
            clearInterval(this.pollTimer);
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;

            // Calculate token expiry
            if (data.expires_in) {
              this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            }

            this.saveTokenToStorage();
            resolve(data.access_token);
          } else if (data.error === 'authorization_pending') {
            // Continue polling
            console.log('Waiting for user authorization...');
          } else if (data.error === 'slow_down') {
            // Increase polling interval as requested by provider
            clearInterval(this.pollTimer);
            interval = interval + 5;
            this.pollTimer = setInterval(async () => {
              // Restart with slower interval
            }, interval * 1000);
          } else if (data.error) {
            clearInterval(this.pollTimer);
            reject(new Error(data.error_description || data.error));
          }
        } catch (error) {
          clearInterval(this.pollTimer);
          reject(error);
        }
      }, interval * 1000);
    });
  }

  /**
   * Cancel ongoing authentication
   */
  cancelAuth() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Complete authentication flow
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    try {
      const deviceInfo = await this.initiateAuth();

      // Emit event for UI to show instructions
      this.emitAuthEvent('auth-initiated', deviceInfo);

      const token = await this.pollForToken(deviceInfo.deviceCode, deviceInfo.interval);

      // Emit success event
      this.emitAuthEvent('auth-success', { token });

      return token;
    } catch (error) {
      this.emitAuthEvent('auth-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<string>} New access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (data.access_token) {
        this.accessToken = data.access_token;
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
        }
        if (data.expires_in) {
          this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        }
        this.saveTokenToStorage();
        return data.access_token;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Get current access token, refreshing if needed
   * @returns {Promise<string>} Valid access token
   */
  async getToken() {
    // Check if we have a token
    if (!this.accessToken) {
      this.loadTokenFromStorage();
    }

    // If still no token, need to authenticate
    if (!this.accessToken) {
      throw new Error('Not authenticated - please login first');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    if (this.tokenExpiry && this.tokenExpiry < Date.now() + 300000) {
      if (this.refreshToken) {
        return await this.refreshAccessToken();
      } else {
        throw new Error('Token expired - please login again');
      }
    }

    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    this.loadTokenFromStorage();
    return !!this.accessToken;
  }

  /**
   * Logout - clear tokens
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.clearTokenFromStorage();
    this.emitAuthEvent('auth-logout', {});
  }

  /**
   * Save token to storage
   */
  saveTokenToStorage() {
    const storageKey = `oauth_${this.config.providerName.toLowerCase().replace(/\s+/g, '_')}`;
    const tokenData = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      timestamp: Date.now()
    };
    sessionStorage.setItem(storageKey, JSON.stringify(tokenData));
  }

  /**
   * Load token from storage
   */
  loadTokenFromStorage() {
    const storageKey = `oauth_${this.config.providerName.toLowerCase().replace(/\s+/g, '_')}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      try {
        const tokenData = JSON.parse(stored);
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
        this.tokenExpiry = tokenData.tokenExpiry;
        return true;
      } catch (error) {
        console.error('Failed to load token from storage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Clear token from storage
   */
  clearTokenFromStorage() {
    const storageKey = `oauth_${this.config.providerName.toLowerCase().replace(/\s+/g, '_')}`;
    sessionStorage.removeItem(storageKey);
  }

  /**
   * Emit authentication events
   */
  emitAuthEvent(eventName, detail) {
    const event = new CustomEvent(`oauth:${eventName}`, {
      detail: {
        provider: this.config.providerName,
        ...detail
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Make authenticated API request
   * @param {string} url
   * @param {object} options
   * @returns {Promise<Response>}
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const token = await this.getToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
  }
}

// Export for use in other modules
window.OAuthDeviceFlow = OAuthDeviceFlow;
