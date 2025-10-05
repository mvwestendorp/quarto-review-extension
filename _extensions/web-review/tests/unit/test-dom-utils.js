/**
 * Unit Tests for DOM Utilities Module
 */

describe('Unit: DOM Utilities', function() {

  describe('getOffsetForNode', function() {
    it('should return 0 for start of element', function() {
      const div = document.createElement('div');
      div.textContent = 'Hello World';
      const textNode = div.firstChild;

      const offset = getOffsetForNode(div, textNode, 0);
      expect(offset).to.equal(0);
    });

    it('should calculate offset for position in text', function() {
      const div = document.createElement('div');
      div.textContent = 'Hello World';
      const textNode = div.firstChild;

      const offset = getOffsetForNode(div, textNode, 5); // After "Hello"
      expect(offset).to.equal(5);
    });

    it('should handle nested elements', function() {
      const div = document.createElement('div');
      div.innerHTML = 'Hello <strong>World</strong>!';

      const strongNode = div.querySelector('strong');
      const textNode = strongNode.firstChild;

      const offset = getOffsetForNode(div, textNode, 2); // "Wo" in "World"
      expect(offset).to.equal(8); // "Hello " + "Wo"
    });
  });

  describe('createRangeFromOffsets', function() {
    it('should create range for simple text', function() {
      const div = document.createElement('div');
      div.textContent = 'Hello World';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 0, 5);

      expect(range).to.not.be.null;
      expect(range.toString()).to.equal('Hello');

      document.body.removeChild(div);
    });

    it('should create range across text nodes', function() {
      const div = document.createElement('div');
      div.innerHTML = 'Hello <em>Beautiful</em> World';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 6, 15); // "Beautiful"

      expect(range).to.not.be.null;
      expect(range.toString()).to.equal('Beautiful');

      document.body.removeChild(div);
    });

    it('should return null for invalid offsets', function() {
      const div = document.createElement('div');
      div.textContent = 'Hello';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 10, 20); // Beyond text length

      expect(range).to.be.null;

      document.body.removeChild(div);
    });

    it('should handle zero-length range', function() {
      const div = document.createElement('div');
      div.textContent = 'Hello World';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 5, 5);

      expect(range).to.not.be.null;
      expect(range.toString()).to.equal('');
      expect(range.collapsed).to.be.true;

      document.body.removeChild(div);
    });

    it('should handle range spanning multiple elements', function() {
      const div = document.createElement('div');
      div.innerHTML = 'One <strong>Two</strong> Three';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 4, 11); // "Two Th"

      expect(range).to.not.be.null;
      expect(range.toString()).to.equal('Two Thr');

      document.body.removeChild(div);
    });

    it('should handle empty element', function() {
      const div = document.createElement('div');
      div.textContent = '';
      document.body.appendChild(div);

      const range = createRangeFromOffsets(div, 0, 0);

      expect(range).to.be.null;

      document.body.removeChild(div);
    });
  });
});
