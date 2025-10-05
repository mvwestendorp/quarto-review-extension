/**
 * User Manager Module
 * Manages user information from OAuth providers and assigns visual colors
 */

/**
 * UserManager - Manages user information from OAuth providers
 * User authentication is handled by Git providers (GitHub, GitLab, etc.)
 * This class only manages user display information and colors
 */
class UserManager {
  /**
   * Initializes the UserManager with user color palette for visual distinction
   */
  constructor() {
    this.userColors = JSON.parse(localStorage.getItem('webReviewUserColors') || '{}');
    this.predefinedColors = [
      '#007acc', '#28a745', '#dc3545', '#6f42c1', '#fd7e14',
      '#20c997', '#e83e8c', '#6c757d', '#17a2b8', '#ffc107'
    ];
  }

  /**
   * Gets the current username from Git provider
   * @returns {string} The current username from OAuth or 'Anonymous'
   */
  getCurrentUser() {
    // Get user from Git provider if available
    if (window.gitProvider && window.gitProvider.isAuthenticated()) {
      return window.gitProvider.currentUser || 'Anonymous';
    }
    return 'Anonymous';
  }

  /**
   * Gets or assigns a color for a specific user
   * @param {string} username - The username
   * @returns {string} Hex color code for the user
   */
  getUserColor(username) {
    if (!username) return '#666';

    // Return existing color or assign new one
    if (!this.userColors[username]) {
      const usedColors = Object.values(this.userColors);
      const availableColors = this.predefinedColors.filter(color => !usedColors.includes(color));
      const selectedColor = availableColors.length > 0
        ? availableColors[0]
        : this.predefinedColors[Object.keys(this.userColors).length % this.predefinedColors.length];

      this.userColors[username] = selectedColor;
      localStorage.setItem('webReviewUserColors', JSON.stringify(this.userColors));
    }

    return this.userColors[username];
  }

  /**
   * Generates user initials from username for avatar display
   * @param {string} username - The username
   * @returns {string} 1-2 character initials in uppercase
   * @example
   * getUserInitials('John Doe') // Returns: "JD"
   * getUserInitials('Alice') // Returns: "AL"
   */
  getUserInitials(username) {
    if (!username) return '?';
    const parts = username.split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}

// Export for Node.js testing (if typeof module !== 'undefined')
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserManager };
}
