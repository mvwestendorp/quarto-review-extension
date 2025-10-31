import { describe, it, expect, beforeEach } from 'vitest';
import { CommentsModule } from '@modules/comments';

describe('CommentsModule', () => {
  let comments: CommentsModule;

  beforeEach(() => {
    comments = new CommentsModule();
  });

  describe('CriticMarkup parsing', () => {
    it('should parse additions', () => {
      const markdown = 'This is {++added++} text';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('addition');
      expect(matches[0].content).toBe('added');
    });

    it('should parse deletions', () => {
      const markdown = 'This is {--deleted--} text';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('deletion');
      expect(matches[0].content).toBe('deleted');
    });

    it('should parse substitutions', () => {
      const markdown = 'This is {~~old~>new~~} text';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('substitution');
      expect(matches[0].content).toBe('old');
      expect(matches[0].replacement).toBe('new');
    });

    it('should parse comments', () => {
      const markdown = 'This is text{>>This is a comment<<}';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('comment');
      expect(matches[0].content).toBe('This is a comment');
    });

    it('should parse highlights without comments', () => {
      const markdown = 'This is {==highlighted==} text';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('highlight');
      expect(matches[0].content).toBe('highlighted');
    });

    it('should parse highlights with comments', () => {
      const markdown = 'This is {==highlighted==}{>>with comment<<} text';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('highlight');
      expect(matches[0].content).toBe('highlighted');
      expect(matches[0].comment).toBe('with comment');
    });

    it('should parse multiple markups', () => {
      const markdown =
        '{++added++} and {--deleted--} and {~~old~>new~~}';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(3);
      expect(matches[0].type).toBe('addition');
      expect(matches[1].type).toBe('deletion');
      expect(matches[2].type).toBe('substitution');
    });

    it('should ignore CriticMarkup inside inline code', () => {
      const markdown = 'Use `code {>>ignored<<}` here';
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(0);
    });

    it('should ignore CriticMarkup inside fenced code blocks', () => {
      const markdown = [
        '```js',
        'const value = "{++ignored++}";',
        '```',
        'Outside {++added++}',
      ].join('\n');
      const matches = comments.parse(markdown);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('addition');
      expect(matches[0].content).toBe('added');
    });

    it('should maintain correct order', () => {
      const markdown = '{--first--} {++second++}';
      const matches = comments.parse(markdown);

      expect(matches[0].start).toBeLessThan(matches[1].start);
    });
  });

  describe('HTML rendering', () => {
    it('should render additions as HTML', () => {
      const markdown = 'Text {++added++} more';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('class="critic-addition"');
      expect(html).toContain('added');
    });

    it('should render deletions as HTML', () => {
      const markdown = 'Text {--deleted--} more';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('class="critic-deletion"');
      expect(html).toContain('deleted');
    });

    it('should render substitutions as HTML', () => {
      const markdown = 'Text {~~old~>new~~} more';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('class="critic-substitution"');
      expect(html).toContain('new');
      expect(html).toContain('data-critic-original="old"');
    });

    it('should render comments as HTML', () => {
      const markdown = 'Text{>>comment<<}';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('class="critic-comment"');
      expect(html).toContain('comment');
    });

    it('should render highlights as HTML', () => {
      const markdown = 'Text {==highlight==} more';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('class="critic-highlight"');
      expect(html).toContain('highlight');
    });

    it('should render highlights with comments', () => {
      const markdown = 'Text {==highlight==}{>>note<<} more';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('data-critic-comment="note"');
    });

    it('should escape HTML in comments', () => {
      const markdown = '{==text==}{>><script>alert()</script><<}';
      const html = comments.renderToHTML(markdown);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should not render CriticMarkup inside inline code', () => {
      const markdown = '`code {>>ignored<<}`';
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('`code {>>ignored<<}`');
      expect(html).not.toContain('critic-comment');
    });

    it('should not render CriticMarkup inside fenced code blocks', () => {
      const markdown = ['```', '{++ignored++}', '```'].join('\n');
      const html = comments.renderToHTML(markdown);

      expect(html).toContain('{++ignored++}');
      expect(html).not.toContain('critic-addition');
    });
  });

  describe('Accept changes', () => {
    it('should accept addition', () => {
      const markdown = 'Text {++added++} more';
      const matches = comments.parse(markdown);
      const result = comments.accept(markdown, matches[0]);

      expect(result).toBe('Text added more');
    });

    it('should accept deletion', () => {
      const markdown = 'Text {--deleted--} more';
      const matches = comments.parse(markdown);
      const result = comments.accept(markdown, matches[0]);

      expect(result).toBe('Text  more');
    });

    it('should accept substitution', () => {
      const markdown = 'Text {~~old~>new~~} more';
      const matches = comments.parse(markdown);
      const result = comments.accept(markdown, matches[0]);

      expect(result).toBe('Text new more');
    });

    it('should remove comment when accepted', () => {
      const markdown = 'Text{>>comment<<}';
      const matches = comments.parse(markdown);
      const result = comments.accept(markdown, matches[0]);

      expect(result).toBe('Text');
    });

    it('should accept all changes', () => {
      const markdown = '{++added++} and {--deleted--} and {~~old~>new~~}';
      const result = comments.acceptAll(markdown);

      expect(result).toBe('added and  and new');
    });
  });

  describe('Reject changes', () => {
    it('should reject addition', () => {
      const markdown = 'Text {++added++} more';
      const matches = comments.parse(markdown);
      const result = comments.reject(markdown, matches[0]);

      expect(result).toBe('Text  more');
    });

    it('should reject deletion', () => {
      const markdown = 'Text {--deleted--} more';
      const matches = comments.parse(markdown);
      const result = comments.reject(markdown, matches[0]);

      expect(result).toBe('Text deleted more');
    });

    it('should reject substitution', () => {
      const markdown = 'Text {~~old~>new~~} more';
      const matches = comments.parse(markdown);
      const result = comments.reject(markdown, matches[0]);

      expect(result).toBe('Text old more');
    });

    it('should reject all changes', () => {
      const markdown = '{++added++} and {--deleted--} and {~~old~>new~~}';
      const result = comments.rejectAll(markdown);

      expect(result).toBe(' and deleted and old');
    });
  });

  describe('Comment management', () => {
    it('should add a comment', () => {
      const comment = comments.addComment('elem-1', 'Test comment', 'user-1');

      expect(comment.elementId).toBe('elem-1');
      expect(comment.content).toBe('Test comment');
      expect(comment.userId).toBe('user-1');
      expect(comment.resolved).toBe(false);
    });

    it('should retrieve comment by ID', () => {
      const added = comments.addComment('elem-1', 'Test', 'user-1');
      const retrieved = comments.getComment(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test');
    });

    it('should get comments for element', () => {
      comments.addComment('elem-1', 'Comment 1', 'user-1');
      comments.addComment('elem-1', 'Comment 2', 'user-2');
      comments.addComment('elem-2', 'Comment 3', 'user-1');

      const elementComments = comments.getCommentsForElement('elem-1');

      expect(elementComments).toHaveLength(2);
      expect(elementComments[0].content).toBe('Comment 1');
      expect(elementComments[1].content).toBe('Comment 2');
    });

    it('should get all comments', () => {
      comments.addComment('elem-1', 'Comment 1', 'user-1');
      comments.addComment('elem-2', 'Comment 2', 'user-2');

      const allComments = comments.getAllComments();

      expect(allComments).toHaveLength(2);
    });

    it('should resolve comment', () => {
      const comment = comments.addComment('elem-1', 'Test', 'user-1');

      const success = comments.resolveComment(comment.id);

      expect(success).toBe(true);
      expect(comments.getComment(comment.id)?.resolved).toBe(true);
    });

    it('should unresolve comment', () => {
      const comment = comments.addComment('elem-1', 'Test', 'user-1');
      comments.resolveComment(comment.id);

      const success = comments.unresolveComment(comment.id);

      expect(success).toBe(true);
      expect(comments.getComment(comment.id)?.resolved).toBe(false);
    });

    it('should delete comment', () => {
      const comment = comments.addComment('elem-1', 'Test', 'user-1');

      const success = comments.deleteComment(comment.id);

      expect(success).toBe(true);
      expect(comments.getComment(comment.id)).toBeUndefined();
    });
  });

  describe('CriticMarkup creation', () => {
    it('should create addition markup', () => {
      const markup = comments.createAddition('new text');
      expect(markup).toBe('{++new text++}');
    });

    it('should create deletion markup', () => {
      const markup = comments.createDeletion('old text');
      expect(markup).toBe('{--old text--}');
    });

    it('should create substitution markup', () => {
      const markup = comments.createSubstitution('old', 'new');
      expect(markup).toBe('{~~old~>new~~}');
    });

    it('should create comment markup', () => {
      const markup = comments.createComment('note');
      expect(markup).toBe('{>>note<<}');
    });

    it('should create highlight markup', () => {
      const markup = comments.createHighlight('text');
      expect(markup).toBe('{==text==}');
    });

    it('should create highlight with comment', () => {
      const markup = comments.createHighlight('text', 'note');
      expect(markup).toBe('{==text==}{>>note<<}');
    });
  });

  describe('Utility methods', () => {
    it('should detect CriticMarkup presence', () => {
      expect(comments.hasCriticMarkup('plain text')).toBe(false);
      expect(comments.hasCriticMarkup('{++added++}')).toBe(true);
      expect(comments.hasCriticMarkup('{--deleted--}')).toBe(true);
      expect(comments.hasCriticMarkup('{~~old~>new~~}')).toBe(true);
    });

    it('should strip all CriticMarkup', () => {
      const markdown =
        'Text {++added++} and {--deleted--} and {~~old~>new~~}';
      const stripped = comments.stripCriticMarkup(markdown);

      expect(stripped).not.toContain('{++');
      expect(stripped).not.toContain('{--');
      expect(stripped).not.toContain('{~~');
    });

    it('should clear all comments', () => {
      comments.addComment('elem-1', 'Comment 1', 'user-1');
      comments.addComment('elem-2', 'Comment 2', 'user-2');

      comments.clear();

      expect(comments.getAllComments()).toHaveLength(0);
    });
  });

  describe('Security - ID Collision Detection', () => {
    it('should generate unique IDs for rapid successive comments', () => {
      const ids = new Set<string>();

      // Add 100 comments in rapid succession
      for (let i = 0; i < 100; i++) {
        const comment = comments.addComment(
          'elem-1',
          `Comment ${i}`,
          'user-1'
        );
        ids.add(comment.id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should detect duplicate IDs if they somehow occur', () => {
      const comment1 = comments.addComment('elem-1', 'Comment 1', 'user-1');
      const comment2 = comments.addComment('elem-2', 'Comment 2', 'user-2');

      expect(comment1.id).not.toBe(comment2.id);
    });

    it('should handle retrieval of comment by ID without collision', () => {
      const comments1 = comments.addComment('elem-1', 'First', 'user-1');
      const comments2 = comments.addComment('elem-1', 'Second', 'user-1');

      expect(comments.getComment(comments1.id)?.content).toBe('First');
      expect(comments.getComment(comments2.id)?.content).toBe('Second');
      expect(comments.getComment('nonexistent')).toBeUndefined();
    });

    it('should maintain comment integrity with many comments', () => {
      const addedComments = [];

      // Add 50 comments
      for (let i = 0; i < 50; i++) {
        const comment = comments.addComment(
          `elem-${i % 5}`,
          `Comment ${i}`,
          `user-${i % 3}`
        );
        addedComments.push(comment);
      }

      // Verify all comments are retrievable
      addedComments.forEach((original) => {
        const retrieved = comments.getComment(original.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(original.id);
        expect(retrieved?.content).toBe(original.content);
      });

      // Verify total count
      expect(comments.getAllComments()).toHaveLength(50);
    });

    it('should prevent duplicate comment with same ID', () => {
      const comment1 = comments.addComment('elem-1', 'First', 'user-1');

      // Try to add another comment - should get a different ID
      const comment2 = comments.addComment('elem-1', 'Second', 'user-1');

      expect(comment1.id).not.toBe(comment2.id);

      // Both should be retrievable
      expect(comments.getComment(comment1.id)).toBeDefined();
      expect(comments.getComment(comment2.id)).toBeDefined();
    });

    it('should handle deletion and re-addition with unique IDs', () => {
      const comment1 = comments.addComment('elem-1', 'Comment 1', 'user-1');
      const id1 = comment1.id;

      // Delete the comment
      const deleted = comments.deleteComment(id1);
      expect(deleted).toBe(true);
      expect(comments.getComment(id1)).toBeUndefined();

      // Add a new comment with similar content
      const comment2 = comments.addComment('elem-1', 'Comment 1', 'user-1');

      // Should have a different ID (due to timestamp/random)
      expect(comment2.id).not.toBe(id1);
      expect(comments.getComment(comment2.id)).toBeDefined();
    });

    it('should maintain comment map consistency after operations', () => {
      const comment1 = comments.addComment('elem-1', 'First', 'user-1');
      const comment2 = comments.addComment('elem-1', 'Second', 'user-1');
      const comment3 = comments.addComment('elem-2', 'Third', 'user-2');

      let allComments = comments.getAllComments();
      expect(allComments).toHaveLength(3);

      // Delete one comment
      comments.deleteComment(comment2.id);
      allComments = comments.getAllComments();
      expect(allComments).toHaveLength(2);

      // Verify the remaining comments
      expect(comments.getComment(comment1.id)).toBeDefined();
      expect(comments.getComment(comment3.id)).toBeDefined();
      expect(comments.getComment(comment2.id)).toBeUndefined();
    });

    it('should handle concurrent-like comment additions with unique tracking', () => {
      const firstBatch = [];
      const secondBatch = [];

      // First batch
      for (let i = 0; i < 10; i++) {
        firstBatch.push(comments.addComment('elem-1', `Batch1-${i}`, 'user-1'));
      }

      // Second batch
      for (let i = 0; i < 10; i++) {
        secondBatch.push(comments.addComment('elem-2', `Batch2-${i}`, 'user-2'));
      }

      // All IDs should be unique
      const allIds = [...firstBatch, ...secondBatch].map((c) => c.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(20);

      // Element retrieval should work correctly
      expect(comments.getCommentsForElement('elem-1')).toHaveLength(10);
      expect(comments.getCommentsForElement('elem-2')).toHaveLength(10);
    });

    it('should generate IDs with sufficient entropy', () => {
      const ids: string[] = [];

      // Generate 1000 IDs and check distribution
      for (let i = 0; i < 1000; i++) {
        const comment = comments.addComment(
          'elem-1',
          `Comment ${i}`,
          'user-1'
        );
        ids.push(comment.id);
      }

      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1000);

      // IDs should have variation (not just incrementing numbers)
      const idParts = ids.map((id) => id.split('-')[2]); // Get random part
      const uniqueParts = new Set(idParts);
      expect(uniqueParts.size).toBeGreaterThan(900); // Most should be different
    });
  });
});
