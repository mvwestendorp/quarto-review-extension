/**
 * Git + Changes Integration Tests
 * Tests the interaction between GitReviewService and ChangesModule
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import GitReviewService from '@modules/git/review-service';
import type { Element, ElementMetadata } from '@/types';
import type { GitModule } from '@modules/git';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

function buildChangesWithElements(elements: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    elements.map((element) => ({ ...element }));
  return changes;
}

describe('Git + Changes Integration', () => {
  let changes: ChangesModule;
  let gitService: GitReviewService;
  let mockGitModule: GitModule;

  beforeEach(() => {
    // Create mock GitModule
    mockGitModule = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getCurrentBranch: vi.fn().mockResolvedValue('main'),
      getBranches: vi.fn().mockResolvedValue(['main', 'feature']),
      createBranch: vi.fn().mockResolvedValue(undefined),
      checkoutBranch: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue('abc123'),
      push: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(''),
      getRemoteUrl: vi.fn().mockResolvedValue('https://github.com/test/repo'),
      listFiles: vi.fn().mockResolvedValue([]),
    } as unknown as GitModule;

    // Create changes module with test data
    changes = buildChangesWithElements([
      {
        id: 'p-1',
        content: 'Original paragraph',
        metadata: baseMetadata,
      },
      {
        id: 'p-2',
        content: 'Second paragraph',
        metadata: baseMetadata,
      },
    ]);

    // Create git service
    gitService = new GitReviewService(mockGitModule);
  });

  describe('Clean Export for Git', () => {
    it('should export clean markdown without CriticMarkup for Git commits', () => {
      // Make some edits
      changes.edit('p-1', 'Modified paragraph');
      changes.edit('p-2', 'Updated second paragraph');

      // Get clean markdown (suitable for Git)
      const cleanMarkdown = changes.toCleanMarkdown();

      // Should contain edited content
      expect(cleanMarkdown).toContain('Modified paragraph');
      expect(cleanMarkdown).toContain('Updated second paragraph');

      // Should NOT contain CriticMarkup
      expect(cleanMarkdown).not.toContain('{++');
      expect(cleanMarkdown).not.toContain('++}');
      expect(cleanMarkdown).not.toContain('{--');
      expect(cleanMarkdown).not.toContain('--}');
      expect(cleanMarkdown).not.toContain('{>>');
      expect(cleanMarkdown).not.toContain('<<}');
    });

    it('should export tracked markdown with CriticMarkup for review', () => {
      // Make some edits
      changes.edit('p-1', 'Modified paragraph');

      // Get tracked markdown (with changes)
      const trackedMarkdown = changes.toTrackedMarkdown();

      // Should contain CriticMarkup showing changes
      expect(trackedMarkdown).toContain('{--Original--}');
      expect(trackedMarkdown).toContain('{++Modified++}');
    });

    it('should handle insertions and deletions in Git export', () => {
      // Delete an element
      changes.delete('p-2');

      // Insert a new element
      changes.insert('New inserted paragraph', baseMetadata, { after: 'p-1' });

      // Get clean markdown
      const cleanMarkdown = changes.toCleanMarkdown();

      // Should contain the edit and new insertion
      expect(cleanMarkdown).toContain('Original paragraph');
      expect(cleanMarkdown).toContain('New inserted paragraph');

      // Should not contain deleted paragraph
      expect(cleanMarkdown).not.toContain('Second paragraph');
    });
  });

  describe('Git Review Workflow', () => {
    it('should create a review branch and commit changes', async () => {
      // Make some edits
      changes.edit('p-1', 'Modified for review');

      // Get clean markdown
      const cleanMarkdown = changes.toCleanMarkdown();

      // Simulate creating review branch
      const branchName = 'review/test-branch';
      await gitService.createReviewBranch(branchName);

      // Verify branch was created
      expect(mockGitModule.createBranch).toHaveBeenCalledWith(branchName);
      expect(mockGitModule.checkoutBranch).toHaveBeenCalledWith(branchName);
    });

    it('should write changes to files and commit', async () => {
      // Make edits
      changes.edit('p-1', 'Modified content');

      const markdown = changes.toCleanMarkdown();
      const filename = 'document.qmd';

      // Write file
      await mockGitModule.writeFile(filename, markdown);

      // Commit changes
      await mockGitModule.commit('Review: Updated document');

      // Verify file was written and committed
      expect(mockGitModule.writeFile).toHaveBeenCalledWith(
        filename,
        markdown
      );
      expect(mockGitModule.commit).toHaveBeenCalledWith(
        'Review: Updated document'
      );
    });

    it('should integrate operations history with Git commits', () => {
      // Make multiple edits
      changes.edit('p-1', 'First edit');
      changes.edit('p-1', 'Second edit');
      changes.edit('p-2', 'Edit to second paragraph');

      // Get operations
      const operations = changes.getOperations();

      // Should have 3 operations
      expect(operations).toHaveLength(3);

      // Each operation should have metadata for Git
      operations.forEach((op) => {
        expect(op.id).toBeDefined();
        expect(op.type).toBeDefined();
        expect(op.timestamp).toBeDefined();
        expect(op.elementId).toBeDefined();
      });

      // Can use operations to generate commit message
      const summary = changes.summarizeOperations();
      expect(summary).toContain('Edited 3 element(s)');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect if changes conflict with remote updates', async () => {
      // Simulate local edits
      changes.edit('p-1', 'Local edit');

      // Get current state
      const localMarkdown = changes.toCleanMarkdown();

      // Simulate remote has different content
      const remoteMarkdown = 'Remote edit\n\nSecond paragraph';

      // Check if there's a conflict
      const hasConflict = localMarkdown !== remoteMarkdown;

      expect(hasConflict).toBe(true);
    });

    it('should preserve operations across undo/redo for Git history', () => {
      // Make edit
      changes.edit('p-1', 'First edit');
      const afterEdit = changes.toCleanMarkdown();

      // Undo
      changes.undo();
      const afterUndo = changes.toCleanMarkdown();

      // Redo
      changes.redo();
      const afterRedo = changes.toCleanMarkdown();

      // Should match original edit after redo
      expect(afterRedo).toBe(afterEdit);
      expect(afterUndo).not.toBe(afterEdit);
      expect(afterUndo).toContain('Original paragraph');
    });
  });

  describe('Multi-file Export', () => {
    it('should support exporting changes to multiple Git files', () => {
      // Simulate changes to different files
      const file1Changes = buildChangesWithElements([
        { id: 'f1-p1', content: 'File 1 content', metadata: baseMetadata },
      ]);

      const file2Changes = buildChangesWithElements([
        { id: 'f2-p1', content: 'File 2 content', metadata: baseMetadata },
      ]);

      // Edit both
      file1Changes.edit('f1-p1', 'Modified file 1');
      file2Changes.edit('f2-p1', 'Modified file 2');

      // Export both
      const file1Markdown = file1Changes.toCleanMarkdown();
      const file2Markdown = file2Changes.toCleanMarkdown();

      // Should be independent
      expect(file1Markdown).toContain('Modified file 1');
      expect(file1Markdown).not.toContain('Modified file 2');
      expect(file2Markdown).toContain('Modified file 2');
      expect(file2Markdown).not.toContain('Modified file 1');
    });
  });

  describe('Git Provider Integration', () => {
    it('should format changes for Git provider push', async () => {
      // Make edits
      changes.edit('p-1', 'Modified for GitHub');

      // Get markdown
      const markdown = changes.toCleanMarkdown();

      // Simulate writing and pushing to provider
      await mockGitModule.writeFile('test.qmd', markdown);
      await mockGitModule.commit('Update test.qmd');
      await mockGitModule.push();

      // Verify push was called
      expect(mockGitModule.push).toHaveBeenCalled();
    });

    it('should generate summary for PR description from operations', () => {
      // Make various changes
      changes.edit('p-1', 'Edit 1');
      changes.edit('p-2', 'Edit 2');
      changes.insert('New paragraph', baseMetadata, { after: 'p-2' });

      // Generate summary
      const summary = changes.summarizeOperations();

      // Should describe all changes
      expect(summary).toContain('Added 1 element(s)');
      expect(summary).toContain('Edited 2 element(s)');
    });
  });

  describe('Initialization with Operations', () => {
    it('should restore operations from persistence for Git history', () => {
      // Create some operations
      changes.edit('p-1', 'First edit');
      changes.edit('p-2', 'Second edit');

      // Get operations
      const savedOperations = changes.getOperations();

      // Create new instance and restore
      const newChanges = buildChangesWithElements([
        { id: 'p-1', content: 'Original paragraph', metadata: baseMetadata },
        { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
      ]);

      // Initialize with saved operations
      newChanges.initializeWithOperations(savedOperations);

      // Should have same operations
      const restoredOperations = newChanges.getOperations();
      expect(restoredOperations).toHaveLength(savedOperations.length);

      // Should produce same state
      const restoredMarkdown = newChanges.toCleanMarkdown();
      expect(restoredMarkdown).toContain('First edit');
      expect(restoredMarkdown).toContain('Second edit');
    });
  });
});
