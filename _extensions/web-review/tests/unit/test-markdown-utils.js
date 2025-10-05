/**
 * Unit Tests for Markdown Utilities Module
 */

describe('Unit: Markdown Utilities', function() {

  describe('convertMarkdownToHtml', function() {
    it('should convert headers correctly', function() {
      expect(convertMarkdownToHtml('# Heading 1')).to.include('<h1>Heading 1</h1>');
      expect(convertMarkdownToHtml('## Heading 2')).to.include('<h2>Heading 2</h2>');
      expect(convertMarkdownToHtml('### Heading 3')).to.include('<h3>Heading 3</h3>');
    });

    it('should convert bold text', function() {
      const result = convertMarkdownToHtml('**bold text**');
      expect(result).to.include('<strong>bold text</strong>');
    });

    it('should convert italic text', function() {
      const result = convertMarkdownToHtml('*italic text*');
      expect(result).to.include('<em>italic text</em>');
    });

    it('should convert code text', function() {
      const result = convertMarkdownToHtml('`code text`');
      expect(result).to.include('<code>code text</code>');
    });

    it('should convert unordered lists', function() {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = convertMarkdownToHtml(markdown);
      expect(result).to.include('<ul>');
      expect(result).to.include('<li>Item 1</li>');
      expect(result).to.include('<li>Item 2</li>');
      expect(result).to.include('<li>Item 3</li>');
      expect(result).to.include('</ul>');
    });

    it('should convert ordered lists', function() {
      const markdown = '1. First\n2. Second\n3. Third';
      const result = convertMarkdownToHtml(markdown);
      expect(result).to.include('<ol>');
      expect(result).to.include('<li>First</li>');
      expect(result).to.include('<li>Second</li>');
      expect(result).to.include('<li>Third</li>');
      expect(result).to.include('</ol>');
    });

    it('should strip CriticMarkup comments', function() {
      const markdown = 'Text with {>>comment<<} annotation';
      const result = convertMarkdownToHtml(markdown);
      expect(result).to.not.include('{>>');
      expect(result).to.not.include('<<}');
      expect(result).to.include('Text with  annotation');
    });

    it('should strip CriticMarkup highlight+comment pairs', function() {
      const markdown = '{==highlighted text==}{>>comment<<}';
      const result = convertMarkdownToHtml(markdown);
      expect(result).to.not.include('{==');
      expect(result).to.not.include('==}');
      expect(result).to.not.include('{>>');
      expect(result).to.include('highlighted text');
    });

    it('should handle mixed formatting', function() {
      const markdown = '## Header with **bold** and *italic*';
      const result = convertMarkdownToHtml(markdown);
      expect(result).to.include('<h2>');
      expect(result).to.include('<strong>bold</strong>');
      expect(result).to.include('<em>italic</em>');
    });
  });

  describe('convertMarkdownToText', function() {
    it('should remove headers', function() {
      expect(convertMarkdownToText('# Heading 1')).to.equal('Heading 1');
      expect(convertMarkdownToText('## Heading 2')).to.equal('Heading 2');
    });

    it('should remove bold formatting', function() {
      expect(convertMarkdownToText('**bold text**')).to.equal('bold text');
    });

    it('should remove italic formatting', function() {
      expect(convertMarkdownToText('*italic text*')).to.equal('italic text');
    });

    it('should remove code formatting', function() {
      expect(convertMarkdownToText('`code text`')).to.equal('code text');
    });

    it('should remove list markers', function() {
      const markdown = '- Item 1\n- Item 2';
      const result = convertMarkdownToText(markdown);
      expect(result).to.not.include('-');
      expect(result).to.include('Item 1');
      expect(result).to.include('Item 2');
    });

    it('should strip CriticMarkup annotations', function() {
      const markdown = 'Text {>>comment<<} more text';
      const result = convertMarkdownToText(markdown);
      expect(result).to.not.include('{>>');
      expect(result).to.not.include('<<}');
      expect(result).to.include('Text  more text');
    });
  });

  describe('convertToCriticMarkup', function() {
    it('should mark additions with {++ ++}', function() {
      const diff = [{ added: true, value: 'new text' }];
      const result = convertToCriticMarkup(diff);
      expect(result).to.equal('{++new text++}');
    });

    it('should mark deletions with {-- --}', function() {
      const diff = [{ removed: true, value: 'old text' }];
      const result = convertToCriticMarkup(diff);
      expect(result).to.equal('{--old text--}');
    });

    it('should keep unchanged text as-is', function() {
      const diff = [{ value: 'unchanged' }];
      const result = convertToCriticMarkup(diff);
      expect(result).to.equal('unchanged');
    });

    it('should skip whitespace-only changes', function() {
      const diff = [
        { added: true, value: '   ' },
        { removed: true, value: '\n' }
      ];
      const result = convertToCriticMarkup(diff);
      expect(result).to.equal('   \n');
      expect(result).to.not.include('{++');
      expect(result).to.not.include('{--');
    });

    it('should handle mixed diff operations', function() {
      const diff = [
        { value: 'Keep ' },
        { removed: true, value: 'old' },
        { added: true, value: 'new' },
        { value: ' text' }
      ];
      const result = convertToCriticMarkup(diff);
      expect(result).to.equal('Keep {--old--}{++new++} text');
    });
  });

  describe('splitInlineHeadings', function() {
    it('should return container unchanged (placeholder)', function() {
      const container = document.createElement('div');
      const result = splitInlineHeadings(container);
      expect(result).to.equal(container);
    });
  });
});
