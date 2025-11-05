import { describe, it, expect, beforeEach } from 'vitest';
import ReviewSubmissionModal, {
  type ReviewSubmissionInitialValues,
} from '@/modules/ui/modals/ReviewSubmissionModal';

describe('ReviewSubmissionModal', () => {
  let modal: ReviewSubmissionModal;
  let initial: ReviewSubmissionInitialValues;

  beforeEach(() => {
    document.body.innerHTML = '';
    modal = new ReviewSubmissionModal();
    initial = {
      reviewer: 'Alice',
      branchName: 'review/alice-123',
      baseBranch: 'main',
      commitMessage: 'Update document',
      pullRequestTitle: 'Review updates',
      pullRequestBody: 'Automated submission',
      draft: false,
    };
  });

  it('resolves with submitted form values', async () => {
    const promise = modal.open(initial);
    const form = document.querySelector('.review-review-form') as HTMLFormElement;
    expect(form).toBeTruthy();

    (form.elements.namedItem('reviewer') as HTMLInputElement).value = 'Bob';
    (form.elements.namedItem('branchName') as HTMLInputElement).value = 'feature/bob';
    (form.elements.namedItem('baseBranch') as HTMLInputElement).value = 'develop';
    (form.elements.namedItem('commitMessage') as HTMLInputElement).value = 'My commit message';
    (form.elements.namedItem('pullRequestTitle') as HTMLInputElement).value = 'My title';
    (form.elements.namedItem('pullRequestBody') as HTMLTextAreaElement).value = 'Details';
    (form.elements.namedItem('draft') as HTMLInputElement).checked = true;

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const result = await promise;
    expect(result).toEqual({
      reviewer: 'Bob',
      branchName: 'feature/bob',
      baseBranch: 'develop',
      commitMessage: 'My commit message',
      pullRequestTitle: 'My title',
      pullRequestBody: 'Details',
      draft: true,
    });
    expect(document.querySelector('.review-review-form')).toBeNull();
  });

  it('resolves with null when cancelled', async () => {
    const promise = modal.open(initial);
    const cancelButton = document.querySelector(
      '.review-review-form [data-action="cancel"]'
    ) as HTMLButtonElement;
    cancelButton.click();

    const result = await promise;
    expect(result).toBeNull();
  });
});
