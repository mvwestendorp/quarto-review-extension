import { createDiv } from '@utils/dom-helpers';

export interface ReviewSubmissionInitialValues {
  reviewer: string;
  branchName: string;
  baseBranch: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  draft: boolean;
  requirePat: boolean;
  patToken?: string;
  repositorySummary?: string;
  repositoryUrl?: string;
  repositoryDescription?: string;
  defaultBranch?: string;
}

export type ReviewSubmissionFormValues = ReviewSubmissionInitialValues;

export class ReviewSubmissionModal {
  private activeResolve:
    | ((value: ReviewSubmissionFormValues | null) => void)
    | null = null;
  private container: HTMLElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  public async open(
    initial: ReviewSubmissionInitialValues
  ): Promise<ReviewSubmissionFormValues | null> {
    // Close any existing modal before opening a new one.
    this.close(null);

    return new Promise<ReviewSubmissionFormValues | null>((resolve) => {
      this.activeResolve = resolve;
      this.container = this.render(initial);
      document.body.appendChild(this.container);
      this.keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.close(null);
        }
      };
      document.addEventListener('keydown', this.keydownHandler);
    });
  }

  private render(initial: ReviewSubmissionInitialValues): HTMLElement {
    const overlay = createDiv('review-editor-modal review-review-modal');

    const container = createDiv('review-editor-container');

    const form = document.createElement('form');
    form.className = 'review-review-form';
    const patSection = initial.requirePat
      ? `
        <label class="review-form-label">
          <span>Personal access token</span>
          <input name="patToken" type="password" value="${
            initial.patToken ? escapeHtml(initial.patToken) : ''
          }" autocomplete="new-password" placeholder="Enter token for this session" />
          <small class="review-form-help">The token is used only for this submission and is not stored in the document.</small>
        </label>`
      : '';

    form.innerHTML = `
      <div class="review-editor-header">
        <h3>Submit Review</h3>
        <button type="button" class="review-btn review-btn-secondary" data-action="cancel">✕</button>
      </div>
      <div class="review-editor-body">
        <div class="review-form-summary">
          ${
            initial.repositorySummary
              ? `<div><span>Repository</span><strong>${
                  initial.repositoryUrl
                    ? `<a href="${escapeHtml(initial.repositoryUrl)}" target="_blank" rel="noopener">${escapeHtml(
                        initial.repositorySummary
                      )}</a>`
                    : escapeHtml(initial.repositorySummary)
                }</strong></div>`
              : ''
          }
          ${
            initial.repositoryDescription
              ? `<div><span>Description</span><em>${escapeHtml(initial.repositoryDescription)}</em></div>`
              : ''
          }
          ${
            initial.defaultBranch
              ? `<div><span>Default branch</span><strong>${escapeHtml(initial.defaultBranch)}</strong></div>`
              : ''
          }
          <div><span>Reviewer</span><strong>${escapeHtml(initial.reviewer)}</strong></div>
          <div><span>Base branch</span><strong>${escapeHtml(initial.baseBranch)}</strong></div>
          <div><span>Review branch</span><strong>${escapeHtml(initial.branchName)}</strong></div>
        </div>
        <input name="reviewer" type="hidden" value="${escapeHtml(initial.reviewer)}" />
        <input name="baseBranch" type="hidden" value="${escapeHtml(initial.baseBranch)}" />
        <input name="branchName" type="hidden" value="${escapeHtml(initial.branchName)}" />
        <label class="review-form-label">
          <span>Commit message</span>
          <input name="commitMessage" type="text" value="${escapeHtml(initial.commitMessage)}" required />
        </label>
        <label class="review-form-label">
          <span>Pull request title</span>
          <input name="pullRequestTitle" type="text" value="${escapeHtml(initial.pullRequestTitle)}" required />
        </label>
        <label class="review-form-label">
          <span>Pull request description</span>
          <textarea name="pullRequestBody" rows="4">${escapeHtml(initial.pullRequestBody)}</textarea>
        </label>
        ${patSection}
        <label class="review-form-checkbox">
          <input name="draft" type="checkbox" ${initial.draft ? 'checked' : ''} />
          <span>Create as draft pull request</span>
        </label>
        <div class="review-form-error" data-error style="display:none;"></div>
      </div>
      <div class="review-editor-footer">
        <button type="button" class="review-btn review-btn-secondary" data-action="cancel">Cancel</button>
        <button type="submit" class="review-btn review-btn-primary">Submit Review</button>
      </div>
    `;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = this.readFormValues(form, initial);
      if (result) {
        this.close(result);
      }
    });

    form.querySelectorAll('[data-action="cancel"]').forEach((button) => {
      button.addEventListener('click', () => this.close(null));
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.close(null);
      }
    });

    container.appendChild(form);
    overlay.appendChild(container);
    return overlay;
  }

  private readFormValues(
    form: HTMLFormElement,
    initial: ReviewSubmissionInitialValues
  ): ReviewSubmissionFormValues | null {
    const errorElement = form.querySelector(
      '[data-error]'
    ) as HTMLElement | null;
    if (errorElement) {
      errorElement.style.display = 'none';
      errorElement.textContent = '';
    }

    const getValue = (name: string, fallback: string): string => {
      const element = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      const value = element?.value?.trim();
      return value?.length ? value : fallback;
    };

    const draftInput = form.elements.namedItem(
      'draft'
    ) as HTMLInputElement | null;

    let patToken: string | undefined = initial.patToken;
    if (initial.requirePat) {
      const patInput = form.elements.namedItem(
        'patToken'
      ) as HTMLInputElement | null;
      const value = patInput?.value?.trim();
      if (!value) {
        if (errorElement) {
          errorElement.textContent =
            'A personal access token is required to submit this review.';
          errorElement.style.display = 'block';
        }
        patInput?.focus();
        return null;
      }
      patToken = value;
    }

    return {
      reviewer: getValue('reviewer', initial.reviewer),
      baseBranch: getValue('baseBranch', initial.baseBranch),
      branchName: getValue('branchName', initial.branchName),
      commitMessage: getValue('commitMessage', initial.commitMessage),
      pullRequestTitle: getValue('pullRequestTitle', initial.pullRequestTitle),
      pullRequestBody: getValue('pullRequestBody', initial.pullRequestBody),
      draft: Boolean(draftInput?.checked),
      requirePat: initial.requirePat,
      patToken,
    };
  }

  private close(result: ReviewSubmissionFormValues | null): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;

    if (this.activeResolve) {
      const resolve = this.activeResolve;
      this.activeResolve = null;
      resolve(result);
    }
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default ReviewSubmissionModal;
