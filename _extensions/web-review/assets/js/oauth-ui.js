/**
 * OAuth UI Components
 * Handles all UI elements related to OAuth authentication
 */

class OAuthUI {
  constructor(container = document.body) {
    this.container = container;
    this.currentModal = null;
  }

  /**
   * Show OAuth provider selection dialog
   * @param {Array} providers - Array of {name, clientId, logo}
   * @param {Function} onSelect - Callback when provider is selected
   */
  showProviderSelection(providers, onSelect) {
    const modal = this.createModal('oauth-provider-selection', 'Connect to Git Provider');

    const content = document.createElement('div');
    content.className = 'oauth-providers-list';

    providers.forEach(provider => {
      const button = document.createElement('button');
      button.className = 'oauth-provider-button';
      button.innerHTML = `
        ${provider.logo ? `<img src="${provider.logo}" alt="${provider.name}" class="oauth-provider-logo">` : ''}
        <span class="oauth-provider-name">${provider.name}</span>
      `;
      button.onclick = () => {
        this.closeModal();
        onSelect(provider);
      };
      content.appendChild(button);
    });

    modal.querySelector('.oauth-modal-body').appendChild(content);
    this.showModal(modal);
  }

  /**
   * Show device code authentication instructions
   * @param {Object} deviceInfo - {userCode, verificationUri, verificationUriComplete}
   * @param {Function} onCancel - Callback when user cancels
   */
  showDeviceCodeInstructions(deviceInfo, onCancel) {
    const modal = this.createModal('oauth-device-code', 'Authenticate with Device Code');

    const content = document.createElement('div');
    content.className = 'oauth-device-code-content';

    // If verification URI complete is available, show QR code option
    if (deviceInfo.verificationUriComplete) {
      content.innerHTML = `
        <div class="oauth-instructions">
          <p class="oauth-instruction-step">
            <strong>Step 1:</strong> Scan this QR code or visit the URL below
          </p>
          <div class="oauth-qr-container">
            <div id="oauth-qr-code"></div>
            <div class="oauth-or-divider">OR</div>
            <a href="${deviceInfo.verificationUriComplete}" target="_blank" class="oauth-verify-link">
              Open verification page
            </a>
          </div>
        </div>
        <div class="oauth-instructions">
          <p class="oauth-instruction-step">
            <strong>Step 2:</strong> Your device code is:
          </p>
          <div class="oauth-user-code">
            <code>${deviceInfo.userCode}</code>
            <button class="oauth-copy-button" onclick="navigator.clipboard.writeText('${deviceInfo.userCode}')">
              Copy
            </button>
          </div>
        </div>
        <div class="oauth-status">
          <div class="oauth-spinner"></div>
          <p>Waiting for authorization...</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="oauth-instructions">
          <p class="oauth-instruction-step">
            <strong>Step 1:</strong> Visit the following URL:
          </p>
          <div class="oauth-verification-url">
            <a href="${deviceInfo.verificationUri}" target="_blank" class="oauth-verify-link">
              ${deviceInfo.verificationUri}
            </a>
          </div>
        </div>
        <div class="oauth-instructions">
          <p class="oauth-instruction-step">
            <strong>Step 2:</strong> Enter this code:
          </p>
          <div class="oauth-user-code">
            <code>${deviceInfo.userCode}</code>
            <button class="oauth-copy-button" onclick="navigator.clipboard.writeText('${deviceInfo.userCode}')">
              Copy
            </button>
          </div>
        </div>
        <div class="oauth-status">
          <div class="oauth-spinner"></div>
          <p>Waiting for authorization...</p>
        </div>
      `;
    }

    const footer = document.createElement('div');
    footer.className = 'oauth-modal-footer';
    footer.innerHTML = `
      <button class="btn-secondary" onclick="this.closest('.oauth-modal').dispatchEvent(new CustomEvent('oauth-cancel'))">
        Cancel
      </button>
    `;

    modal.querySelector('.oauth-modal-body').appendChild(content);
    modal.appendChild(footer);

    // Add cancel handler
    modal.addEventListener('oauth-cancel', () => {
      this.closeModal();
      if (onCancel) onCancel();
    });

    this.showModal(modal);

    // Generate QR code if library is available
    if (typeof QRCode !== 'undefined' && deviceInfo.verificationUriComplete) {
      new QRCode(document.getElementById('oauth-qr-code'), {
        text: deviceInfo.verificationUriComplete,
        width: 200,
        height: 200
      });
    }
  }

  /**
   * Show authentication success message
   * @param {Object} userInfo - {name, login, avatar_url}
   */
  showAuthSuccess(userInfo) {
    const modal = this.createModal('oauth-success', 'Authentication Successful');

    const content = document.createElement('div');
    content.className = 'oauth-success-content';
    content.innerHTML = `
      <div class="oauth-success-icon">✓</div>
      <p class="oauth-success-message">Successfully authenticated as:</p>
      ${userInfo.avatar_url ? `<img src="${userInfo.avatar_url}" alt="${userInfo.name}" class="oauth-user-avatar">` : ''}
      <p class="oauth-user-name"><strong>${userInfo.name || userInfo.login}</strong></p>
      <p class="oauth-user-login">@${userInfo.login}</p>
    `;

    const footer = document.createElement('div');
    footer.className = 'oauth-modal-footer';
    footer.innerHTML = `
      <button class="btn-primary" onclick="this.closest('.oauth-modal').remove()">
        Continue
      </button>
    `;

    modal.querySelector('.oauth-modal-body').appendChild(content);
    modal.appendChild(footer);

    this.showModal(modal);

    // Auto-close after 3 seconds
    setTimeout(() => {
      if (this.currentModal === modal) {
        this.closeModal();
      }
    }, 3000);
  }

  /**
   * Show authentication error
   * @param {string} errorMessage
   * @param {Function} onRetry
   */
  showAuthError(errorMessage, onRetry) {
    const modal = this.createModal('oauth-error', 'Authentication Failed');

    const content = document.createElement('div');
    content.className = 'oauth-error-content';
    content.innerHTML = `
      <div class="oauth-error-icon">✕</div>
      <p class="oauth-error-message">${errorMessage}</p>
    `;

    const footer = document.createElement('div');
    footer.className = 'oauth-modal-footer';
    footer.innerHTML = `
      <button class="btn-primary" onclick="this.closest('.oauth-modal').dispatchEvent(new CustomEvent('oauth-retry'))">
        Try Again
      </button>
      <button class="btn-secondary" onclick="this.closest('.oauth-modal').remove()">
        Cancel
      </button>
    `;

    modal.querySelector('.oauth-modal-body').appendChild(content);
    modal.appendChild(footer);

    modal.addEventListener('oauth-retry', () => {
      this.closeModal();
      if (onRetry) onRetry();
    });

    this.showModal(modal);
  }

  /**
   * Show repository selection dialog
   * @param {Array} repositories - Array of repo objects
   * @param {Function} onSelect - Callback when repo is selected
   */
  showRepositorySelection(repositories, onSelect) {
    const modal = this.createModal('oauth-repo-selection', 'Select Repository');

    const content = document.createElement('div');
    content.className = 'oauth-repo-list';

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'oauth-repo-search';
    searchBox.placeholder = 'Search repositories...';
    content.appendChild(searchBox);

    const repoContainer = document.createElement('div');
    repoContainer.className = 'oauth-repo-container';

    const renderRepos = (filter = '') => {
      repoContainer.innerHTML = '';
      const filtered = repositories.filter(repo =>
        repo.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(filter.toLowerCase()))
      );

      filtered.slice(0, 50).forEach(repo => {
        const repoItem = document.createElement('div');
        repoItem.className = 'oauth-repo-item';
        repoItem.innerHTML = `
          <div class="oauth-repo-info">
            <div class="oauth-repo-name">${repo.full_name}</div>
            ${repo.description ? `<div class="oauth-repo-description">${repo.description}</div>` : ''}
          </div>
          <div class="oauth-repo-meta">
            <span class="oauth-repo-branch">${repo.default_branch || 'main'}</span>
          </div>
        `;
        repoItem.onclick = () => {
          this.closeModal();
          onSelect(repo);
        };
        repoContainer.appendChild(repoItem);
      });

      if (filtered.length === 0) {
        repoContainer.innerHTML = '<p class="oauth-no-results">No repositories found</p>';
      }
    };

    searchBox.addEventListener('input', (e) => renderRepos(e.target.value));
    renderRepos();

    content.appendChild(repoContainer);
    modal.querySelector('.oauth-modal-body').appendChild(content);
    this.showModal(modal);
  }

  /**
   * Show submission progress
   * @param {Object} status - {step, message, progress}
   */
  showSubmissionProgress(status) {
    let modal = document.getElementById('oauth-submission-progress');

    if (!modal) {
      modal = this.createModal('oauth-submission-progress', 'Submitting Review');
      this.showModal(modal);
    }

    const content = modal.querySelector('.oauth-modal-body');
    content.innerHTML = `
      <div class="oauth-progress-steps">
        <div class="oauth-progress-step ${status.step >= 1 ? 'active' : ''} ${status.step > 1 ? 'complete' : ''}">
          <div class="oauth-progress-icon">${status.step > 1 ? '✓' : '1'}</div>
          <div class="oauth-progress-label">Creating branch</div>
        </div>
        <div class="oauth-progress-step ${status.step >= 2 ? 'active' : ''} ${status.step > 2 ? 'complete' : ''}">
          <div class="oauth-progress-icon">${status.step > 2 ? '✓' : '2'}</div>
          <div class="oauth-progress-label">Applying changes</div>
        </div>
        <div class="oauth-progress-step ${status.step >= 3 ? 'active' : ''} ${status.step > 3 ? 'complete' : ''}">
          <div class="oauth-progress-icon">${status.step > 3 ? '✓' : '3'}</div>
          <div class="oauth-progress-label">Creating pull request</div>
        </div>
      </div>
      <div class="oauth-progress-message">${status.message}</div>
      ${status.progress ? `<div class="oauth-progress-bar"><div class="oauth-progress-fill" style="width: ${status.progress}%"></div></div>` : ''}
    `;
  }

  /**
   * Show submission success with PR link
   * @param {Object} result - {pullRequest, branch, isUpdate}
   */
  showSubmissionSuccess(result) {
    const actionText = result.isUpdate ? 'Updated' : 'Submitted';
    const modal = this.createModal('oauth-submission-success', `Review ${actionText} Successfully`);

    const content = document.createElement('div');
    content.className = 'oauth-success-content';
    content.innerHTML = `
      <div class="oauth-success-icon">✓</div>
      <p class="oauth-success-message">
        ${result.isUpdate
          ? 'Your review has been updated with new commits!'
          : 'Your review has been submitted as a pull request!'}
      </p>
      <div class="oauth-pr-info">
        <p><strong>Pull Request:</strong> #${result.pullRequest.number}</p>
        <p><strong>Branch:</strong> ${result.branch}</p>
        ${result.isUpdate
          ? '<p style="color: #0969da; font-size: 13px;">💡 Tip: Subsequent edits will continue updating this PR until you clear your changes.</p>'
          : ''}
        <a href="${result.pullRequest.html_url}" target="_blank" class="oauth-pr-link">
          View Pull Request →
        </a>
      </div>
    `;

    const footer = document.createElement('div');
    footer.className = 'oauth-modal-footer';
    footer.innerHTML = `
      <button class="btn-primary" onclick="window.open('${result.pullRequest.html_url}', '_blank')">
        Open Pull Request
      </button>
      <button class="btn-secondary" onclick="this.closest('.oauth-modal').remove()">
        Close
      </button>
    `;

    modal.querySelector('.oauth-modal-body').appendChild(content);
    modal.appendChild(footer);

    this.showModal(modal);
  }

  /**
   * Create a modal element
   * @param {string} id
   * @param {string} title
   * @returns {HTMLElement}
   */
  createModal(id, title) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'oauth-modal';
    modal.innerHTML = `
      <div class="oauth-modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="oauth-modal-container">
        <div class="oauth-modal-header">
          <h3 class="oauth-modal-title">${title}</h3>
          <button class="oauth-modal-close" onclick="this.closest('.oauth-modal').remove()">×</button>
        </div>
        <div class="oauth-modal-body"></div>
      </div>
    `;
    return modal;
  }

  /**
   * Show modal
   * @param {HTMLElement} modal
   */
  showModal(modal) {
    // Close existing modal
    this.closeModal();

    this.container.appendChild(modal);
    this.currentModal = modal;

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('oauth-modal-visible');
    });
  }

  /**
   * Close current modal
   */
  closeModal() {
    if (this.currentModal) {
      this.currentModal.classList.remove('oauth-modal-visible');
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentNode) {
          this.currentModal.remove();
        }
        this.currentModal = null;
      }, 300);
    }
  }

  /**
   * Show PAT input dialog
   * @param {string} provider - Git provider name (github, gitlab, etc.)
   * @returns {Promise<string|null>} - Returns PAT or null if cancelled
   */
  showPATInput(provider = 'GitHub') {
    return new Promise((resolve) => {
      const modal = this.createModal('oauth-pat-input', `Connect to ${provider}`);

      const tokenUrl = {
        'github': 'https://github.com/settings/tokens/new?scopes=repo&description=Quarto%20Web%20Review',
        'gitlab': 'https://gitlab.com/-/profile/personal_access_tokens?scopes=api',
        'gitea': '#' // Will need instance URL
      }[provider.toLowerCase()] || '#';

      const content = document.createElement('div');
      content.className = 'oauth-pat-content';
      content.innerHTML = `
        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; color: #586069;">
            To submit your review, you'll need a Personal Access Token (PAT) from ${provider}.
          </p>
          <ol style="margin: 0 0 15px 0; padding-left: 20px; color: #586069;">
            <li>Click the button below to create a new token</li>
            <li>Copy the generated token</li>
            <li>Paste it in the field below</li>
          </ol>
          <a href="${tokenUrl}" target="_blank" class="oauth-create-token-btn" style="
            display: inline-block;
            padding: 8px 16px;
            background: #0366d6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin-bottom: 15px;
          ">
            Create Token on ${provider}
          </a>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #24292e;">
            Personal Access Token:
          </label>
          <input
            type="password"
            id="pat-input"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            style="
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5da;
              border-radius: 6px;
              font-family: monospace;
              font-size: 14px;
            "
          />
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="pat-cancel-btn" style="
            padding: 8px 16px;
            background: #fafbfc;
            color: #24292e;
            border: 1px solid #d1d5da;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Cancel</button>
          <button id="pat-submit-btn" style="
            padding: 8px 16px;
            background: #2ea44f;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Connect</button>
        </div>
      `;

      modal.querySelector('.oauth-modal-body').appendChild(content);
      this.showModal(modal);

      const input = document.getElementById('pat-input');
      const submitBtn = document.getElementById('pat-submit-btn');
      const cancelBtn = document.getElementById('pat-cancel-btn');

      // Focus input
      setTimeout(() => input.focus(), 100);

      // Handle submit
      const handleSubmit = () => {
        const token = input.value.trim();
        if (token) {
          this.closeModal();
          resolve(token);
        } else {
          input.style.borderColor = '#d73a49';
          input.focus();
        }
      };

      // Handle cancel
      const handleCancel = () => {
        this.closeModal();
        resolve(null);
      };

      submitBtn.onclick = handleSubmit;
      cancelBtn.onclick = handleCancel;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') handleCancel();
      };
    });
  }
}

// Export for use in other modules
window.OAuthUI = OAuthUI;
