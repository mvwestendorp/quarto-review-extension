/**
 * Unit tests for CriticMarkupManager
 */

describe('CriticMarkupManager', function() {
  describe('constructor', function() {
    it('should initialize with empty state', function() {
      const manager = new CriticMarkupManager();
      expect(manager.comments).to.be.an('array').that.is.empty;
      expect(manager.elementStates).to.be.an('object').that.is.empty;
      expect(manager.qmdSectionMap).to.be.an('object');
      expect(manager.nextNewSectionId).to.equal(1);
      expect(manager.changeHistory).to.be.an('array').that.is.empty;
    });
  });

  describe('cleanTextContent', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should remove unnecessary escape sequences', function() {
      const input = 'Test\\: with\\- escaped\\. chars';
      const result = manager.cleanTextContent(input);
      expect(result).to.equal('Test: with- escaped. chars');
    });

    it('should fix broken bold formatting from Wysimark', function() {
      const input = '**word**** ****more**';
      const result = manager.cleanTextContent(input);
      expect(result).to.equal('**word more**');
    });

    it('should remove Quarto anchor links', function() {
      const input = '## Heading [](#anchor-id)';
      const result = manager.cleanTextContent(input);
      expect(result).to.equal('## Heading');
    });

    it('should normalize list formatting', function() {
      const input = '- Item 1\\n\\n- Item 2';
      const result = manager.cleanTextContent(input);
      expect(result).to.not.include('\\n\\n-');
    });

    it('should handle empty input', function() {
      expect(manager.cleanTextContent('')).to.equal('');
      expect(manager.cleanTextContent(null)).to.equal('');
    });
  });

  describe('computeLCS', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should compute LCS for identical arrays', function() {
      const arr1 = ['a', 'b', 'c'];
      const arr2 = ['a', 'b', 'c'];
      const lcs = manager.computeLCS(arr1, arr2);
      expect(lcs).to.deep.equal(['a', 'b', 'c']);
    });

    it('should compute LCS for different arrays', function() {
      const arr1 = ['a', 'b', 'c', 'd'];
      const arr2 = ['a', 'c', 'e', 'd'];
      const lcs = manager.computeLCS(arr1, arr2);
      expect(lcs).to.deep.equal(['a', 'c', 'd']);
    });

    it('should handle empty arrays', function() {
      const arr1 = [];
      const arr2 = ['a', 'b'];
      const lcs = manager.computeLCS(arr1, arr2);
      expect(lcs).to.deep.equal([]);
    });

    it('should handle no common elements', function() {
      const arr1 = ['a', 'b', 'c'];
      const arr2 = ['x', 'y', 'z'];
      const lcs = manager.computeLCS(arr1, arr2);
      expect(lcs).to.deep.equal([]);
    });
  });

  describe('findWordDifferences', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should detect word additions', function() {
      const original = 'The cat';
      const modified = 'The black cat';
      const diff = manager.findWordDifferences(original, modified);

      expect(diff).to.be.an('array');
      expect(diff.some(op => op.type === 'add' && op.text.includes('black'))).to.be.true;
    });

    it('should detect word deletions', function() {
      const original = 'The black cat';
      const modified = 'The cat';
      const diff = manager.findWordDifferences(original, modified);

      expect(diff).to.be.an('array');
      expect(diff.some(op => op.type === 'delete' && op.text.includes('black'))).to.be.true;
    });

    it('should handle unchanged text', function() {
      const original = 'The cat';
      const modified = 'The cat';
      const diff = manager.findWordDifferences(original, modified);

      expect(diff).to.be.an('array');
      expect(diff.every(op => op.type === 'unchanged')).to.be.true;
    });

    it('should handle word replacements', function() {
      const original = 'The cat runs';
      const modified = 'The dog runs';
      const diff = manager.findWordDifferences(original, modified);

      expect(diff.some(op => op.type === 'delete' && op.text.includes('cat'))).to.be.true;
      expect(diff.some(op => op.type === 'add' && op.text.includes('dog'))).to.be.true;
    });
  });

  describe('findTextDifferences', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should use word-level diff for single-line text', function() {
      const original = 'Hello world';
      const modified = 'Hello there world';
      const diff = manager.findTextDifferences(original, modified);

      expect(diff).to.be.an('array');
      expect(diff.some(op => op.type === 'add')).to.be.true;
    });

    it('should use line-level diff for multi-line text', function() {
      const original = 'Line 1\\nLine 2\\nLine 3';
      const modified = 'Line 1\\nLine 2 modified\\nLine 3';
      const diff = manager.findTextDifferences(original, modified);

      expect(diff).to.be.an('array');
    });

    it('should consolidate consecutive operations', function() {
      const original = 'a b c';
      const modified = 'x y z';
      const diff = manager.findTextDifferences(original, modified);

      // Should consolidate multiple deletions into one, and additions into one
      const deleteOps = diff.filter(op => op.type === 'delete');
      const addOps = diff.filter(op => op.type === 'add');

      expect(deleteOps.length).to.be.at.most(1);
      expect(addOps.length).to.be.at.most(1);
    });
  });

  describe('parseQmdIntoSections', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should parse headings', function() {
      const qmd = '# Heading 1\\n## Heading 2';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(2);
      expect(sections[0].type).to.equal('h1');
      expect(sections[0].qmdText).to.equal('# Heading 1');
      expect(sections[1].type).to.equal('h2');
    });

    it('should parse paragraphs', function() {
      const qmd = 'This is a paragraph.\\nIt has two lines.';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('p');
      expect(sections[0].qmdText).to.include('paragraph');
    });

    it('should parse unordered lists', function() {
      const qmd = '- Item 1\\n- Item 2\\n- Item 3';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('ul');
      expect(sections[0].qmdText).to.include('Item 1');
      expect(sections[0].qmdText).to.include('Item 3');
    });

    it('should parse ordered lists', function() {
      const qmd = '1. First\\n2. Second\\n3. Third';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('ol');
      expect(sections[0].qmdText).to.include('First');
    });

    it('should skip YAML frontmatter', function() {
      const qmd = '---\\ntitle: Test\\n---\\n# Heading';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('h1');
      expect(sections[0].qmdText).to.equal('# Heading');
    });

    it('should parse code blocks', function() {
      const qmd = '```javascript\\ncode here\\n```';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('pre');
    });

    it('should parse blockquotes', function() {
      const qmd = '> This is a quote\\n> Second line';
      const sections = manager.parseQmdIntoSections(qmd);

      expect(sections).to.have.lengthOf(1);
      expect(sections[0].type).to.equal('blockquote');
    });
  });

  describe('recordChange', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should record line count delta', function() {
      const originalMarkdown = 'Line 1\\nLine 2';
      const reviewedMarkdown = 'Line 1\\nLine 2\\nLine 3';

      manager.recordChange('test-path', originalMarkdown, reviewedMarkdown);

      expect(manager.changeHistory).to.have.lengthOf(1);
      expect(manager.changeHistory[0].lineDelta).to.equal(1);
      expect(manager.changeHistory[0].type).to.equal('edit');
    });

    it('should record negative delta for deletions', function() {
      const originalMarkdown = 'Line 1\\nLine 2\\nLine 3';
      const reviewedMarkdown = 'Line 1';

      manager.recordChange('test-path', originalMarkdown, reviewedMarkdown);

      expect(manager.changeHistory[0].lineDelta).to.equal(-2);
    });
  });

  describe('calculateCurrentLineNumber', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should return original line number with no changes', function() {
      const lineNumber = manager.calculateCurrentLineNumber(5, 10);
      expect(lineNumber).to.equal(10);
    });

    it('should apply line delta from earlier sections', function() {
      // Simulate a change to section 2 that added 3 lines
      manager.changeHistory.push({
        timestamp: new Date().toISOString(),
        sectionIndex: 2,
        lineDelta: 3,
        type: 'edit'
      });

      // Section 5 should be offset by 3 lines
      const lineNumber = manager.calculateCurrentLineNumber(5, 10);
      expect(lineNumber).to.equal(13);
    });

    it('should not apply delta from later sections', function() {
      manager.changeHistory.push({
        timestamp: new Date().toISOString(),
        sectionIndex: 8,
        lineDelta: 3,
        type: 'edit'
      });

      // Section 5 should not be affected
      const lineNumber = manager.calculateCurrentLineNumber(5, 10);
      expect(lineNumber).to.equal(10);
    });
  });

  describe('generateElementPath', function() {
    let manager;

    beforeEach(function() {
      manager = new CriticMarkupManager();
    });

    it('should generate path with ID', function() {
      const element = document.createElement('div');
      element.id = 'test-id';
      const path = manager.generateElementPath(element);

      expect(path).to.include('#test-id');
    });

    it('should generate path with classes', function() {
      const element = document.createElement('div');
      element.className = 'test-class another-class';
      const path = manager.generateElementPath(element);

      expect(path).to.include('.test-class.another-class');
    });

    it('should exclude web-review classes', function() {
      const element = document.createElement('div');
      element.className = 'test-class web-review-modified web-review-highlight';
      const path = manager.generateElementPath(element);

      expect(path).to.include('.test-class');
      expect(path).to.not.include('web-review-');
    });
  });
});
