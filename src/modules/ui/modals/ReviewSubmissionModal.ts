import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('ReviewSubmissionModal');

export interface ReviewSubmissionInitialValues {
  reviewer: string;
  branchName: string;
  baseBranch: string;
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  draft: boolean;
}

export interface ReviewSubmissionFormValues
  extends ReviewSubmissionInitialValues {}

export class ReviewSubmissionModal {
  private activeResolve: ((
    value: ReviewSubmissionFormValues | null
  ) => void) | null = null;
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
    const overlay = document.createElement('div');
    overlay.className = 'review-editor-modal review-review-modal';

    const container = document.createElement('div');
    container.className = 'review-editor-container';

    const form = document.createElement('form');
    form.className = 'review-review-form';
    form.innerHTML = `
      <div class="review-editor-header">
        <h3>Submit Review</h3>
        <button type="button" class="review-btn review-btn-secondary" data-action="cancel">✕</button>
      </div>
      <div class="review-editor-body">
        <label class="review-form-label">
          <span>Reviewer</span>
          <input name="reviewer" type="text" value="${escapeHtml(initial.reviewer)}" required />
        </label>
        <label class="review-form-label">
          <span>Base branch</span>
          <input name="baseBranch" type="text" value="${escapeHtml(initial.baseBranch)}" required />
        </label>
        <label class="review-form-label">
          <span>Review branch</span>
          <input name="branchName" type="text" value="${escapeHtml(initial.branchName)}" required />
        </label>
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
        <label class="review-form-checkbox">
          <input name="draft" type="checkbox" ${initial.draft ? 'checked' : ''} />
          <span>Create as draft pull request</span>
        </label>
      </div>
      <div class="review-editor-footer">
        <button type="button" class="review-btn review-btn-secondary" data-action="cancel">Cancel</button>
        <button type="submit" class="review-btn review-btn-primary">Submit Review</button>
      </div>
    `;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const result = this.readFormValues(form, initial);
        this.close(result);
      } catch (error) {
        logger.error('Failed to read review submission form values', error);
        this.close(null);
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
  ): ReviewSubmissionFormValues {
    const getValue = (name: string, fallback: string): string => {
      const element = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      const value = element?.value?.trim();
      return value?.length ? value : fallback;
    };

    const draftInput = form.elements.namedItem('draft') as HTMLInputElement | null;

    return {
      reviewer: getValue('reviewer', initial.reviewer),
      baseBranch: getValue('baseBranch', initial.baseBranch),
      branchName: getValue('branchName', initial.branchName),
      commitMessage: getValue('commitMessage', initial.commitMessage),
      pullRequestTitle: getValue('pullRequestTitle', initial.pullRequestTitle),
      pullRequestBody: getValue('pullRequestBody', initial.pullRequestBody),
      draft: Boolean(draftInput?.checked),
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
