# GitHub Backend Implementation Plan

## Current State Analysis

### ✅ What's Already Implemented

The GitHub provider (`src/modules/git/providers/github.ts`) has a **complete implementation** of all Git operations:

1. **Authentication** ✅
   - Bearer token (PAT)
   - Cookie-based auth
   - Custom header auth

2. **User Operations** ✅
   - `getCurrentUser()` - Get authenticated user info

3. **Branch Operations** ✅
   - `createBranch()` - Create new branch from base

4. **File Operations** ✅
   - `getFileContent()` - Read file from repository
   - `createOrUpdateFile()` - Write/update files with commits

5. **Pull Request Operations** ✅
   - `createPullRequest()` - Create new PR
   - `updatePullRequest()` - Update PR title/body
   - `getPullRequest()` - Get PR by number
   - `listPullRequests()` - List PRs by state
   - `mergePullRequest()` - Merge PR (merge/squash/rebase)
   - `addPullRequestComment()` - Add comment to PR
   - `createReviewComments()` - Add line-level review comments

6. **Issue Operations** ✅
   - `createIssue()` - Create new issue
   - `getIssue()` - Get issue by number
   - `listIssues()` - List issues by state
   - `addIssueComment()` - Add comment to issue

7. **Repository Operations** ✅
   - `getRepository()` - Get repo metadata
   - `hasWriteAccess()` - Check user permissions

### ❌ What's Missing

The **only missing piece** is the high-level orchestration logic in `GitIntegrationService.submitReview()`:

**File**: `src/modules/git/integration.ts:28-31`
```typescript
public async submitReview(_payload: ReviewSubmissionPayload): Promise<void> {
  logger.warn('Git integration submitReview is not implemented yet');
  throw new Error('Git integration workflow is not implemented yet');
}
```

This method needs to orchestrate the following workflow:
1. Create a review branch
2. Update the document file with changes
3. Create a pull request
4. Optionally add review comments

---

## Implementation Plan

### Phase 1: Core Submit Review Workflow

**Goal**: Implement the basic review submission flow that creates a branch, commits changes, and opens a PR.

#### Step 1.1: Define Review Payload Structure

**Location**: `src/modules/git/integration.ts`

Currently, `ReviewSubmissionPayload` is too generic:
```typescript
export interface ReviewSubmissionPayload {
  reviewer: string;
  changes: unknown;  // ❌ Too vague
  comments?: unknown;  // ❌ Too vague
  metadata?: Record<string, unknown>;
}
```

**Proposed Structure**:
```typescript
export interface ReviewSubmissionPayload {
  reviewer: string;
  documentContent: string;  // The full updated document
  sourcePath?: string;  // Path to the file in the repo (default from config)
  branchName?: string;  // Custom branch name (optional)
  pullRequest: {
    title: string;
    body: string;
  };
  comments?: ReviewCommentInput[];  // Line-level comments (optional)
  commitMessage?: string;  // Custom commit message (optional)
}
```

**Rationale**:
- `documentContent`: The full reviewed document text
- `sourcePath`: Defaults to `config.repository.sourceFile` or allows override
- `branchName`: Auto-generated if not provided (e.g., `review-${reviewer}-${timestamp}`)
- `pullRequest`: Required PR details
- `comments`: Optional line-level review comments
- `commitMessage`: Defaults to "Review by ${reviewer}"

---

#### Step 1.2: Implement `submitReview()` Core Logic

**Location**: `src/modules/git/integration.ts`

```typescript
public async submitReview(payload: ReviewSubmissionPayload): Promise<SubmitReviewResult> {
  logger.info(`Starting review submission from ${payload.reviewer}`);

  // Step 1: Validate payload
  this.validatePayload(payload);

  // Step 2: Determine source file path
  const sourcePath = payload.sourcePath ?? this.config.repository.sourceFile;
  if (!sourcePath) {
    throw new Error('No source file specified in payload or configuration');
  }

  // Step 3: Generate branch name
  const branchName = payload.branchName ?? this.generateBranchName(payload.reviewer);
  logger.debug(`Creating review branch: ${branchName}`);

  // Step 4: Create branch from base
  const branch = await this.provider.createBranch(
    branchName,
    this.config.repository.baseBranch
  );

  // Step 5: Get current file SHA (for update operation)
  const currentFile = await this.provider.getFileContent(
    sourcePath,
    this.config.repository.baseBranch
  );

  if (!currentFile) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  // Step 6: Commit changes to new branch
  const commitMessage = payload.commitMessage ??
    `Review by ${payload.reviewer}\n\nSubmitted via Quarto Review Extension`;

  const fileResult = await this.provider.createOrUpdateFile(
    sourcePath,
    payload.documentContent,
    commitMessage,
    branchName,
    currentFile.sha
  );

  logger.debug(`File committed: ${fileResult.commitSha}`);

  // Step 7: Create pull request
  const pullRequest = await this.provider.createPullRequest(
    payload.pullRequest.title,
    payload.pullRequest.body,
    branchName,
    this.config.repository.baseBranch
  );

  logger.info(`Pull request created: ${pullRequest.url}`);

  // Step 8: Add review comments (optional)
  let reviewComments: ReviewCommentResult[] = [];
  if (payload.comments && payload.comments.length > 0) {
    try {
      reviewComments = await this.provider.createReviewComments(
        pullRequest.number,
        payload.comments,
        fileResult.commitSha
      );
      logger.debug(`Added ${reviewComments.length} review comments`);
    } catch (error) {
      logger.warn('Failed to add review comments:', error);
      // Don't fail the entire submission if comments fail
    }
  }

  // Step 9: Return result
  return {
    pullRequest: {
      number: pullRequest.number,
      url: pullRequest.url,
      branch: branchName,
    },
    commit: {
      sha: fileResult.commitSha,
      url: fileResult.url,
    },
    comments: reviewComments,
  };
}
```

**Result Type**:
```typescript
export interface SubmitReviewResult {
  pullRequest: {
    number: number;
    url: string;
    branch: string;
  };
  commit: {
    sha: string;
    url?: string;
  };
  comments: ReviewCommentResult[];
}
```

---

#### Step 1.3: Helper Methods

```typescript
private validatePayload(payload: ReviewSubmissionPayload): void {
  if (!payload.reviewer) {
    throw new Error('Reviewer name is required');
  }

  if (!payload.documentContent) {
    throw new Error('Document content is required');
  }

  if (!payload.pullRequest?.title || !payload.pullRequest?.body) {
    throw new Error('Pull request title and body are required');
  }

  // Validate comments structure if provided
  if (payload.comments) {
    for (const comment of payload.comments) {
      if (!comment.path || !comment.body || typeof comment.line !== 'number') {
        throw new Error('Invalid comment structure: path, body, and line are required');
      }
    }
  }
}

private generateBranchName(reviewer: string): string {
  const sanitizedReviewer = reviewer
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const randomSuffix = Math.random().toString(36).substring(2, 6);

  return `review/${sanitizedReviewer}/${timestamp}-${randomSuffix}`;
}
```

**Generated branch examples**:
- `review/john-doe/2025-10-31-a7c4`
- `review/jane-smith/2025-10-31-x9b2`

---

### Phase 2: Error Handling & Recovery

**Goal**: Handle common error scenarios gracefully.

#### Error Scenarios to Handle:

1. **Branch Already Exists**
   ```typescript
   try {
     await this.provider.createBranch(branchName, baseBranch);
   } catch (error) {
     if (error.status === 422 || error.message.includes('already exists')) {
       // Generate new branch name with different suffix
       branchName = this.generateBranchName(payload.reviewer);
       await this.provider.createBranch(branchName, baseBranch);
     } else {
       throw error;
     }
   }
   ```

2. **File Not Found**
   - Return clear error message indicating the source file doesn't exist
   - Suggest checking `sourceFile` configuration

3. **No Write Access**
   ```typescript
   const hasAccess = await this.provider.hasWriteAccess();
   if (!hasAccess) {
     throw new Error('Current user does not have write access to this repository');
   }
   ```

4. **Network Errors**
   - Implement retry logic with exponential backoff
   - Log errors with debug information
   - Return user-friendly error messages

5. **Authentication Errors**
   - Detect 401/403 responses
   - Return clear message about token/auth issues

---

### Phase 3: Advanced Features (Optional)

#### Feature 3.1: Draft Pull Requests

Add support for draft PRs:

```typescript
export interface ReviewSubmissionPayload {
  // ... existing fields
  pullRequest: {
    title: string;
    body: string;
    draft?: boolean;  // NEW
  };
}
```

Implementation:
```typescript
// In submitReview()
const pullRequest = await this.provider.createPullRequest(
  payload.pullRequest.title,
  payload.pullRequest.body,
  branchName,
  this.config.repository.baseBranch,
  payload.pullRequest.draft  // Pass draft flag
);
```

Requires updating `createPullRequest()` signature in `BaseProvider`.

---

#### Feature 3.2: Multi-File Reviews

Support reviewing multiple files in a single submission:

```typescript
export interface ReviewSubmissionPayload {
  // ... existing fields
  files?: Array<{
    path: string;
    content: string;
  }>;  // NEW
}
```

Implementation:
```typescript
// In submitReview(), replace single file commit with:
for (const file of payload.files ?? [{ path: sourcePath, content: payload.documentContent }]) {
  const currentFile = await this.provider.getFileContent(file.path, baseBranch);
  await this.provider.createOrUpdateFile(
    file.path,
    file.content,
    commitMessage,
    branchName,
    currentFile?.sha
  );
}
```

---

#### Feature 3.3: Conflict Detection

Check if the base branch has changed since the document was rendered:

```typescript
private async checkForConflicts(
  sourcePath: string,
  expectedSha: string
): Promise<boolean> {
  const currentFile = await this.provider.getFileContent(
    sourcePath,
    this.config.repository.baseBranch
  );

  return currentFile?.sha !== expectedSha;
}
```

Usage:
```typescript
// Before creating branch
const hasConflicts = await this.checkForConflicts(sourcePath, documentSha);
if (hasConflicts) {
  logger.warn('Base branch has changed since document was rendered');
  // Option A: Throw error and require user to refresh
  // Option B: Proceed and let Git handle merge conflicts
}
```

---

#### Feature 3.4: Auto-merge for Trusted Users

For users with write access who don't need review:

```typescript
export interface ReviewSubmissionPayload {
  // ... existing fields
  autoMerge?: boolean;  // NEW
  mergeMethod?: 'merge' | 'squash' | 'rebase';  // NEW
}
```

Implementation:
```typescript
// After creating PR
if (payload.autoMerge && await this.provider.hasWriteAccess()) {
  logger.info('Auto-merging pull request');
  await this.provider.mergePullRequest(
    pullRequest.number,
    payload.mergeMethod ?? 'squash'
  );
}
```

---

### Phase 4: Testing

#### Unit Tests

**File**: `tests/unit/git-integration-submit-review.test.ts` (NEW)

```typescript
describe('GitIntegrationService.submitReview', () => {
  describe('successful submission', () => {
    it('creates branch, commits file, and creates PR', async () => {
      // Mock provider methods
      mockProvider.createBranch.mockResolvedValue({ name: 'review/test', sha: 'abc123' });
      mockProvider.getFileContent.mockResolvedValue({ path: 'doc.qmd', sha: 'def456', content: 'old' });
      mockProvider.createOrUpdateFile.mockResolvedValue({
        path: 'doc.qmd',
        sha: 'ghi789',
        commitSha: 'jkl012',
        url: 'https://github.com/.../doc.qmd'
      });
      mockProvider.createPullRequest.mockResolvedValue({
        number: 42,
        title: 'Review',
        body: 'Description',
        state: 'open',
        author: 'reviewer',
        createdAt: '2025-10-31T00:00:00Z',
        updatedAt: '2025-10-31T00:00:00Z',
        url: 'https://github.com/.../pull/42'
      });

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test-reviewer',
        documentContent: 'new content',
        pullRequest: {
          title: 'Test Review',
          body: 'This is a test'
        }
      };

      const result = await service.submitReview(payload);

      expect(result.pullRequest.number).toBe(42);
      expect(result.pullRequest.url).toContain('/pull/42');
      expect(mockProvider.createBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^review\/test-reviewer\//),
        'main'
      );
      expect(mockProvider.createOrUpdateFile).toHaveBeenCalledWith(
        'document.qmd',
        'new content',
        expect.stringContaining('Review by test-reviewer'),
        expect.any(String),
        'def456'
      );
    });

    it('generates unique branch names', async () => {
      mockProvider.createBranch.mockResolvedValue({ name: 'review/test', sha: 'abc' });
      mockProvider.getFileContent.mockResolvedValue({ path: 'doc.qmd', sha: 'def', content: 'old' });
      mockProvider.createOrUpdateFile.mockResolvedValue({
        path: 'doc.qmd', sha: 'ghi', commitSha: 'jkl', url: 'https://...'
      });
      mockProvider.createPullRequest.mockResolvedValue({
        number: 1, title: 'Test', body: 'Test', state: 'open',
        author: 'test', createdAt: '2025-10-31', updatedAt: '2025-10-31', url: 'https://...'
      });

      const payload: ReviewSubmissionPayload = {
        reviewer: 'John Doe',
        documentContent: 'content',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await service.submitReview(payload);

      const branchName = (mockProvider.createBranch as any).mock.calls[0][0];
      expect(branchName).toMatch(/^review\/john-doe\/\d{4}-\d{2}-\d{2}-[a-z0-9]{4}$/);
    });

    it('adds review comments when provided', async () => {
      // ... mock setup
      mockProvider.createReviewComments.mockResolvedValue([
        { id: 1, url: 'https://...', path: 'doc.qmd', line: 10 }
      ]);

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        pullRequest: { title: 'Test', body: 'Body' },
        comments: [
          { path: 'doc.qmd', body: 'Fix typo', line: 10 }
        ]
      };

      const result = await service.submitReview(payload);

      expect(result.comments.length).toBe(1);
      expect(mockProvider.createReviewComments).toHaveBeenCalledWith(
        42,
        [{ path: 'doc.qmd', body: 'Fix typo', line: 10 }],
        'jkl012'
      );
    });
  });

  describe('error handling', () => {
    it('throws when reviewer is missing', async () => {
      const payload: ReviewSubmissionPayload = {
        reviewer: '',
        documentContent: 'content',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await expect(service.submitReview(payload)).rejects.toThrow('Reviewer name is required');
    });

    it('throws when document content is missing', async () => {
      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: '',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await expect(service.submitReview(payload)).rejects.toThrow('Document content is required');
    });

    it('throws when source file not found', async () => {
      mockProvider.createBranch.mockResolvedValue({ name: 'review/test', sha: 'abc' });
      mockProvider.getFileContent.mockResolvedValue(null);  // File not found

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await expect(service.submitReview(payload)).rejects.toThrow('Source file not found');
    });

    it('retries branch creation on conflict', async () => {
      // First call: branch exists
      mockProvider.createBranch
        .mockRejectedValueOnce(Object.assign(new Error('Reference already exists'), { status: 422 }))
        .mockResolvedValueOnce({ name: 'review/test', sha: 'abc' });

      mockProvider.getFileContent.mockResolvedValue({ path: 'doc.qmd', sha: 'def', content: 'old' });
      // ... rest of mocks

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await service.submitReview(payload);

      expect(mockProvider.createBranch).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom configurations', () => {
    it('uses custom source path when provided', async () => {
      // ... mocks

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        sourcePath: 'custom/path.qmd',  // Override config
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await service.submitReview(payload);

      expect(mockProvider.getFileContent).toHaveBeenCalledWith('custom/path.qmd', 'main');
      expect(mockProvider.createOrUpdateFile).toHaveBeenCalledWith(
        'custom/path.qmd',
        'content',
        expect.any(String),
        expect.any(String),
        'def456'
      );
    });

    it('uses custom branch name when provided', async () => {
      // ... mocks

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        branchName: 'custom-review-branch',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await service.submitReview(payload);

      expect(mockProvider.createBranch).toHaveBeenCalledWith('custom-review-branch', 'main');
    });

    it('uses custom commit message when provided', async () => {
      // ... mocks

      const payload: ReviewSubmissionPayload = {
        reviewer: 'test',
        documentContent: 'content',
        commitMessage: 'Custom commit message',
        pullRequest: { title: 'Test', body: 'Body' }
      };

      await service.submitReview(payload);

      expect(mockProvider.createOrUpdateFile).toHaveBeenCalledWith(
        'document.qmd',
        'content',
        'Custom commit message',
        expect.any(String),
        'def456'
      );
    });
  });
});
```

---

#### Integration Tests

**File**: `tests/integration/github-submit-review.test.ts` (NEW)

These tests would require a test repository or GitHub mock server:

```typescript
describe('GitHub Integration - Submit Review (E2E)', () => {
  // Requires GITHUB_TOKEN environment variable
  // Requires test repository access

  it.skip('submits a real review to GitHub', async () => {
    // This test is skipped by default
    // Run with: GITHUB_TOKEN=xxx npm run test:integration
  });
});
```

---

### Phase 5: UI Integration

**Goal**: Connect the `submitReview()` method to the UI.

#### Step 5.1: Review Submission Button/Dialog

**Location**: `src/modules/ui/` (new component or extend existing)

```typescript
// Pseudo-code for UI integration
class ReviewSubmitDialog {
  async onSubmit() {
    const gitModule = this.app.getGitModule();

    if (!gitModule.isEnabled()) {
      this.showError('Git integration is not configured');
      return;
    }

    const payload: ReviewSubmissionPayload = {
      reviewer: this.getCurrentUser(),
      documentContent: this.getDocumentContent(),
      pullRequest: {
        title: this.titleInput.value,
        body: this.bodyInput.value,
      },
      comments: this.getReviewComments(),  // Optional
    };

    try {
      const result = await gitModule.submitReview(payload);

      this.showSuccess(`Review submitted! PR #${result.pullRequest.number}`);
      this.openPullRequestInBrowser(result.pullRequest.url);
    } catch (error) {
      this.showError(`Failed to submit review: ${error.message}`);
    }
  }
}
```

---

### Phase 6: Documentation

**Files to Create/Update**:

1. **docs/dev/GIT_INTEGRATION.md** (NEW)
   - Architecture overview
   - Provider abstraction
   - Submit review workflow
   - Error handling
   - Testing guide

2. **docs/user/SUBMITTING_REVIEWS.md** (NEW)
   - How to configure GitHub integration
   - How to submit a review
   - What happens behind the scenes
   - Troubleshooting

3. **README.md** (UPDATE)
   - Add "Submit Reviews via GitHub" to features list

---

## Summary

### Implementation Checklist

#### Phase 1: Core Workflow (Essential)
- [ ] Update `ReviewSubmissionPayload` interface with proper structure
- [ ] Implement `submitReview()` core logic (9 steps)
- [ ] Implement `validatePayload()` helper
- [ ] Implement `generateBranchName()` helper
- [ ] Add `SubmitReviewResult` return type
- [ ] Update existing tests to match new interface

#### Phase 2: Error Handling (Essential)
- [ ] Add branch name conflict retry logic
- [ ] Add file not found error handling
- [ ] Add write access check
- [ ] Add authentication error detection
- [ ] Add network retry logic with backoff

#### Phase 3: Advanced Features (Optional)
- [ ] Draft PR support
- [ ] Multi-file review support
- [ ] Conflict detection
- [ ] Auto-merge for trusted users

#### Phase 4: Testing (Essential)
- [ ] Create `git-integration-submit-review.test.ts`
- [ ] Test successful submission flow
- [ ] Test branch name generation
- [ ] Test review comment addition
- [ ] Test error scenarios
- [ ] Test custom configurations
- [ ] Create integration test skeleton

#### Phase 5: UI Integration (Required for End-to-End)
- [ ] Create or extend UI component for review submission
- [ ] Add form for PR title/body
- [ ] Add review submission button
- [ ] Add error/success notifications
- [ ] Add link to created PR

#### Phase 6: Documentation (Essential)
- [ ] Create GIT_INTEGRATION.md developer guide
- [ ] Create SUBMITTING_REVIEWS.md user guide
- [ ] Update README with new features
- [ ] Add inline code documentation

---

## Estimated Effort

- **Phase 1 (Core)**: 4-6 hours
- **Phase 2 (Errors)**: 2-3 hours
- **Phase 3 (Advanced)**: 3-4 hours per feature
- **Phase 4 (Testing)**: 3-4 hours
- **Phase 5 (UI)**: 4-6 hours
- **Phase 6 (Docs)**: 2-3 hours

**Total (Essential Only)**: 15-22 hours
**Total (With Advanced Features)**: 25-35 hours

---

## Dependencies

**No external dependencies required** - all GitHub API functionality is already implemented in the provider.

---

## Next Steps

1. Start with Phase 1: Implement core `submitReview()` workflow
2. Write unit tests as you implement (TDD approach)
3. Test against a real GitHub repository
4. Add error handling (Phase 2)
5. Document as you go

**Recommended first PR**: Phases 1 + 2 + 4 (core workflow with tests)
**Second PR**: Phase 5 (UI integration)
**Third PR**: Phase 3 (advanced features) - optional
