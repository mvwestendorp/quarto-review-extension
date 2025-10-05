/**
 * Integration tests for Web Review modules
 * Tests interactions between multiple modules
 */

describe('Module Integration Tests', function() {
  describe('CriticMarkupManager + MarkdownUtils', function() {
    let manager;

    beforeEach(function() {
      // Clear localStorage before each test
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should convert element state changes to CriticMarkup with markdown formatting', function() {
      // Simulate adding an element state with markdown
      const originalMarkdown = '**Bold text** with *italic*';
      const reviewedMarkdown = '**Bold text** with *italic* and more';

      manager.updateElementState('test-element', originalMarkdown, reviewedMarkdown, 'TestUser');

      // Verify state was recorded
      expect(manager.elementStates['test-element']).to.exist;
      expect(manager.elementStates['test-element'].commits).to.have.lengthOf(1);
      expect(manager.elementStates['test-element'].commits[0].reviewedMarkdown).to.equal('**Bold text** with *italic* and more');
    });

    it('should preserve markdown when cleaning text content', function() {
      const markdownText = '# Heading\n**bold** and *italic* and `code`';
      const cleaned = manager.cleanTextContent(markdownText);

      // Should preserve markdown syntax
      expect(cleaned).to.include('**bold**');
      expect(cleaned).to.include('*italic*');
      expect(cleaned).to.include('`code`');
      expect(cleaned).to.include('# Heading');
    });

    it('should handle multi-line markdown in diff generation', function() {
      const original = '- Item 1\n- Item 2\n- Item 3';
      const modified = '- Item 1\n- Item 2 modified\n- Item 3';

      const diff = manager.findTextDifferences(original, modified);

      expect(diff).to.be.an('array');
      // Should detect the change in Item 2
      expect(diff.some(op => op.type === 'delete' && op.text.includes('Item 2'))).to.be.true;
      expect(diff.some(op => op.type === 'add' && op.text.includes('modified'))).to.be.true;
    });
  });

  describe('CriticMarkupManager + UserManager', function() {
    let criticManager;
    let userManager;

    beforeEach(function() {
      localStorage.clear();
      criticManager = new CriticMarkupManager();
      userManager = new UserManager();
    });

    it('should track comments with user information', function() {
      const username = userManager.getCurrentUser();
      const userColor = userManager.getUserColor(username);

      const comment = criticManager.addComment(
        'test-element',
        'selected text',
        'This is a comment',
        username,
        'section-1',
        0,
        userColor,
        0,
        13
      );

      expect(comment.author).to.equal(username);
      expect(comment.userColor).to.equal(userColor);
      expect(comment.comment).to.equal('This is a comment');
    });

    it('should assign consistent colors to multiple users', function() {
      const user1 = 'Alice';
      const user2 = 'Bob';

      const color1a = userManager.getUserColor(user1);
      const color2 = userManager.getUserColor(user2);
      const color1b = userManager.getUserColor(user1);

      // Same user should get same color
      expect(color1a).to.equal(color1b);
      // Different users should get different colors
      expect(color1a).to.not.equal(color2);
    });

    it('should create element states with author attribution', function() {
      const username = 'TestReviewer';

      criticManager.updateElementState(
        'test-path',
        'original text',
        'reviewed text',
        username
      );

      const state = criticManager.elementStates['test-path'];
      expect(state.commits[0].author).to.equal(username);
    });
  });

  describe('QMD Parsing + Section Mapping', function() {
    let manager;

    beforeEach(function() {
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should parse complex QMD document structure', function() {
      const qmd = `---
title: Test Document
---

# Introduction

This is a paragraph with **bold** text.

## Features

- Feature 1
- Feature 2
- Feature 3

### Code Example

\`\`\`javascript
const x = 42;
\`\`\`

> A blockquote with insight
`;

      const sections = manager.parseQmdIntoSections(qmd);

      // Should parse all sections correctly
      expect(sections.some(s => s.type === 'h1' && s.qmdText.includes('Introduction'))).to.be.true;
      expect(sections.some(s => s.type === 'p' && s.qmdText.includes('paragraph'))).to.be.true;
      expect(sections.some(s => s.type === 'h2' && s.qmdText.includes('Features'))).to.be.true;
      expect(sections.some(s => s.type === 'ul' && s.qmdText.includes('Feature 1'))).to.be.true;
      expect(sections.some(s => s.type === 'h3' && s.qmdText.includes('Code Example'))).to.be.true;
      expect(sections.some(s => s.type === 'pre')).to.be.true;
      expect(sections.some(s => s.type === 'blockquote')).to.be.true;
    });

    it('should track line offsets correctly', function() {
      const qmd = `# Line 0
Paragraph on line 1

## Line 3
- List on line 4
- List on line 5`;

      const sections = manager.parseQmdIntoSections(qmd);

      const heading1 = sections.find(s => s.qmdText.includes('Line 0'));
      const heading2 = sections.find(s => s.qmdText.includes('Line 3'));
      const list = sections.find(s => s.type === 'ul');

      expect(heading1.lineStart).to.equal(0);
      expect(heading2.lineStart).to.equal(3);
      expect(list.lineStart).to.equal(4);
      expect(list.lineEnd).to.equal(5);
    });
  });

  describe('Change History and Line Offset Tracking', function() {
    let manager;

    beforeEach(function() {
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should calculate line offsets after changes', function() {
      // Simulate changes to section 2
      manager.changeHistory = [
        {
          timestamp: '2025-01-01T00:00:00Z',
          sectionIndex: 2,
          lineDelta: 3  // Added 3 lines
        }
      ];

      // Section 5 should be offset by 3 lines
      const newLineNumber = manager.calculateCurrentLineNumber(5, 10);
      expect(newLineNumber).to.equal(13);
    });

    it('should handle multiple changes accumulating offsets', function() {
      manager.changeHistory = [
        { timestamp: '2025-01-01T00:00:00Z', sectionIndex: 1, lineDelta: 2 },
        { timestamp: '2025-01-01T00:01:00Z', sectionIndex: 3, lineDelta: -1 },
        { timestamp: '2025-01-01T00:02:00Z', sectionIndex: 4, lineDelta: 5 }
      ];

      // Section 10 should include all earlier changes: +2 -1 +5 = +6
      const newLineNumber = manager.calculateCurrentLineNumber(10, 100);
      expect(newLineNumber).to.equal(106);
    });

    it('should track changes when updating element states', function() {
      const original = 'Line 1\nLine 2';
      const reviewed = 'Line 1\nLine 2\nLine 3\nLine 4';

      manager.recordChange('section-1', original, reviewed);

      expect(manager.changeHistory).to.have.lengthOf(1);
      expect(manager.changeHistory[0].lineDelta).to.equal(2);
      expect(manager.changeHistory[0].type).to.equal('edit');
    });
  });

  describe('Diff Generation and CriticMarkup Export', function() {
    let manager;

    beforeEach(function() {
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should generate word-level diffs for simple changes', function() {
      const original = 'The quick brown fox';
      const modified = 'The quick red fox';

      const diff = manager.findWordDifferences(original, modified);

      expect(diff.some(op => op.type === 'delete' && op.text.includes('brown'))).to.be.true;
      expect(diff.some(op => op.type === 'add' && op.text.includes('red'))).to.be.true;
      expect(diff.some(op => op.type === 'unchanged' && op.text === 'The')).to.be.true;
    });

    it('should generate line-level diffs for multi-line changes', function() {
      const original = 'Line 1\nLine 2\nLine 3';
      const modified = 'Line 1\nModified Line 2\nLine 3';

      const diff = manager.findLineDifferences(original, modified);

      // Should detect modification on line 2
      expect(diff.some(op => op.type === 'delete' && op.text === 'Line 2')).to.be.true;
      expect(diff.some(op => op.type === 'add' && op.text === 'Modified Line 2')).to.be.true;
    });

    it('should consolidate consecutive operations of same type', function() {
      const original = 'a b c d';
      const modified = 'w x y z';

      const diff = manager.findTextDifferences(original, modified);

      // Should consolidate multiple additions and deletions
      const deleteOps = diff.filter(op => op.type === 'delete');
      const addOps = diff.filter(op => op.type === 'add');

      expect(deleteOps.length).to.be.at.most(1);
      expect(addOps.length).to.be.at.most(1);
    });
  });

  describe('Storage and Persistence', function() {
    let manager;

    beforeEach(function() {
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should persist and restore element states', function() {
      // Add element state
      manager.updateElementState('test-element', 'original', 'reviewed', 'TestUser');
      manager.saveToStorage();

      // Create new manager to simulate page reload
      const newManager = new CriticMarkupManager();

      expect(newManager.elementStates['test-element']).to.exist;
      expect(newManager.elementStates['test-element'].commits[0].reviewedMarkdown).to.equal('reviewed');
    });

    it('should persist and restore comments', function() {
      manager.addComment(
        'test-element',
        'selected text',
        'test comment',
        'TestUser',
        'section-1',
        0,
        '#007acc',
        0,
        13
      );
      manager.saveToStorage();

      const newManager = new CriticMarkupManager();

      expect(newManager.comments).to.have.lengthOf(1);
      expect(newManager.comments[0].comment).to.equal('test comment');
      expect(newManager.comments[0].author).to.equal('TestUser');
    });

    it('should persist QMD section map', function() {
      manager.originalQMD = '# Heading\nParagraph';
      manager.createQmdSectionMap();
      manager.saveToStorage();

      const newManager = new CriticMarkupManager();

      expect(Object.keys(newManager.qmdSectionMap).length).to.be.greaterThan(0);
    });

    it('should migrate old format to new git-like commits', function() {
      // Simulate old format in localStorage
      localStorage.setItem('webReviewCriticMarkup', JSON.stringify({
        changes: [
          {
            elementPath: 'old-element',
            originalText: 'old original',
            newText: 'old reviewed',
            author: 'OldUser',
            timestamp: '2025-01-01T00:00:00Z'
          }
        ],
        elementStates: {},
        comments: []
      }));

      const newManager = new CriticMarkupManager();

      // Should migrate to new format
      expect(newManager.elementStates['old-element']).to.exist;
      expect(newManager.elementStates['old-element'].commits).to.have.lengthOf(1);
      expect(newManager.elementStates['old-element'].commits[0].reviewedMarkdown).to.equal('old reviewed');
      expect(newManager.changes).to.be.empty;
    });
  });

  describe('Edge Cases and Error Handling', function() {
    let manager;

    beforeEach(function() {
      localStorage.clear();
      manager = new CriticMarkupManager();
    });

    it('should handle empty diff gracefully', function() {
      const diff = manager.findTextDifferences('same', 'same');
      expect(diff).to.be.an('array');
      expect(diff.every(op => op.type === 'unchanged')).to.be.true;
    });

    it('should handle empty QMD input', function() {
      const sections = manager.parseQmdIntoSections('');
      expect(sections).to.be.an('array').that.is.empty;
    });

    it('should handle malformed markdown gracefully', function() {
      const text = '**unclosed bold';
      const cleaned = manager.cleanTextContent(text);
      expect(cleaned).to.be.a('string');
    });

    it('should generate unique comment IDs', function() {
      const comment1 = manager.addComment('el1', 'text1', 'comment1', 'User1', 'sec1', 0, '#000', 0, 5);
      const comment2 = manager.addComment('el2', 'text2', 'comment2', 'User2', 'sec2', 0, '#000', 0, 5);

      expect(comment1.id).to.not.equal(comment2.id);
    });

    it('should handle calculateCurrentLineNumber with no change history', function() {
      const lineNumber = manager.calculateCurrentLineNumber(5, 10);
      expect(lineNumber).to.equal(10);
    });
  });
});
