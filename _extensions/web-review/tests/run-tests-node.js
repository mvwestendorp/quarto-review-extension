#!/usr/bin/env node
/**
 * Node.js test runner for web review modules
 * Tests the modules in a Node environment without requiring a browser
 */

const fs = require('fs');
const path = require('path');

console.log('Web Review Extension - Module Tests\n');
console.log('====================================\n');

// Load modules
const modulesPath = path.join(__dirname, '..', 'assets', 'js', 'modules');

console.log('Loading modules...');

// Create a minimal window object for testing
global.window = {
  WebReviewDebug: { general: false, git: false, editing: false },
  gitProvider: null,
  localStorage: {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
  }
};
global.localStorage = global.window.localStorage;
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: [],
    parentElement: null
  }),
  body: {}
};

// Read and evaluate module files that need to be in global scope
const debugUtils = fs.readFileSync(path.join(modulesPath, 'debug-utils.js'), 'utf8');
const domUtils = fs.readFileSync(path.join(modulesPath, 'dom-utils.js'), 'utf8');
const markdownUtils = fs.readFileSync(path.join(modulesPath, 'markdown-utils.js'), 'utf8');

// Evaluate debug utils first so debug functions are available globally
eval(debugUtils);
eval(markdownUtils);

// Make debug functions available globally for required modules
global.debug = debug;
global.debugGit = debugGit;
global.debugEditing = debugEditing;

// Now load classes that depend on debug functions
const { UserManager } = require(path.join(modulesPath, 'user-manager.js'));
const { CriticMarkupManager } = require(path.join(modulesPath, 'critic-markup-manager.js'));

console.log('✓ Modules loaded\n');

// Run tests
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${description}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected to include "${needle}"`);
  }
}

// Test markdown-utils
console.log('Testing markdown-utils.js:');

test('convertMarkdownToHtml - headers', () => {
  const result = convertMarkdownToHtml('# Heading 1');
  assertIncludes(result, '<h1>Heading 1</h1>');
});

test('convertMarkdownToHtml - bold text', () => {
  const result = convertMarkdownToHtml('**bold**');
  assertIncludes(result, '<strong>bold</strong>');
});

test('convertMarkdownToHtml - italic text', () => {
  const result = convertMarkdownToHtml('*italic*');
  assertIncludes(result, '<em>italic</em>');
});

test('convertMarkdownToHtml - code text', () => {
  const result = convertMarkdownToHtml('`code`');
  assertIncludes(result, '<code>code</code>');
});

test('convertMarkdownToHtml - strips CriticMarkup comments', () => {
  const result = convertMarkdownToHtml('Text {>>comment<<} more');
  assert(!result.includes('{>>'), 'Should not contain {>>');
  assert(!result.includes('<<}'), 'Should not contain <<}');
});

test('convertMarkdownToText - removes headers', () => {
  const result = convertMarkdownToText('## Heading');
  assertEqual(result, 'Heading');
});

test('convertMarkdownToText - removes bold', () => {
  const result = convertMarkdownToText('**bold**');
  assertEqual(result, 'bold');
});

test('convertToCriticMarkup - additions', () => {
  const diff = [{ added: true, value: 'new' }];
  const result = convertToCriticMarkup(diff);
  assertEqual(result, '{++new++}');
});

test('convertToCriticMarkup - deletions', () => {
  const diff = [{ removed: true, value: 'old' }];
  const result = convertToCriticMarkup(diff);
  assertEqual(result, '{--old--}');
});

test('convertToCriticMarkup - unchanged text', () => {
  const diff = [{ value: 'unchanged' }];
  const result = convertToCriticMarkup(diff);
  assertEqual(result, 'unchanged');
});

console.log('');

// Test user-manager
console.log('Testing user-manager.js:');

test('UserManager - constructor initializes', () => {
  const manager = new UserManager();
  assert(manager.userColors, 'Should have userColors');
  assert(manager.predefinedColors, 'Should have predefinedColors');
  assertEqual(manager.predefinedColors.length, 10);
});

test('UserManager - getCurrentUser returns Anonymous by default', () => {
  const manager = new UserManager();
  assertEqual(manager.getCurrentUser(), 'Anonymous');
});

test('UserManager - getCurrentUser returns git provider user', () => {
  window.gitProvider = { isAuthenticated: () => true, currentUser: 'TestUser' };
  const manager = new UserManager();
  assertEqual(manager.getCurrentUser(), 'TestUser');
  window.gitProvider = null;
});

test('UserManager - getUserColor returns default for null', () => {
  const manager = new UserManager();
  assertEqual(manager.getUserColor(null), '#666');
});

test('UserManager - getUserColor assigns color to new user', () => {
  const manager = new UserManager();
  const color = manager.getUserColor('Alice');
  assertEqual(color, '#007acc'); // First predefined color
});

test('UserManager - getUserColor returns same color for same user', () => {
  const manager = new UserManager();
  const color1 = manager.getUserColor('Alice');
  const color2 = manager.getUserColor('Alice');
  assertEqual(color1, color2);
});

test('UserManager - getUserInitials handles single word', () => {
  const manager = new UserManager();
  assertEqual(manager.getUserInitials('Alice'), 'AL');
});

test('UserManager - getUserInitials handles two words', () => {
  const manager = new UserManager();
  assertEqual(manager.getUserInitials('John Doe'), 'JD');
});

test('UserManager - getUserInitials returns ? for null', () => {
  const manager = new UserManager();
  assertEqual(manager.getUserInitials(null), '?');
});

console.log('');

// Test critic-markup-manager
console.log('Testing critic-markup-manager.js:');

test('CriticMarkupManager - constructor initializes', () => {
  const manager = new CriticMarkupManager();
  assert(Array.isArray(manager.comments), 'Should have comments array');
  assert(typeof manager.elementStates === 'object', 'Should have elementStates object');
  assertEqual(manager.nextNewSectionId, 1);
  assert(Array.isArray(manager.changeHistory), 'Should have changeHistory array');
});

test('CriticMarkupManager - cleanTextContent removes escape sequences', () => {
  const manager = new CriticMarkupManager();
  const result = manager.cleanTextContent('Test\\: with\\- escaped');
  assertEqual(result, 'Test: with- escaped');
});

test('CriticMarkupManager - cleanTextContent fixes bold formatting', () => {
  const manager = new CriticMarkupManager();
  const result = manager.cleanTextContent('**word**** ****more**');
  assertEqual(result, '**word more**');
});

test('CriticMarkupManager - cleanTextContent handles empty input', () => {
  const manager = new CriticMarkupManager();
  assertEqual(manager.cleanTextContent(''), '');
  assertEqual(manager.cleanTextContent(null), '');
});

test('CriticMarkupManager - computeLCS for identical arrays', () => {
  const manager = new CriticMarkupManager();
  const arr1 = ['a', 'b', 'c'];
  const arr2 = ['a', 'b', 'c'];
  const lcs = manager.computeLCS(arr1, arr2);
  assertEqual(JSON.stringify(lcs), JSON.stringify(['a', 'b', 'c']));
});

test('CriticMarkupManager - computeLCS for different arrays', () => {
  const manager = new CriticMarkupManager();
  const arr1 = ['a', 'b', 'c', 'd'];
  const arr2 = ['a', 'c', 'e', 'd'];
  const lcs = manager.computeLCS(arr1, arr2);
  assertEqual(JSON.stringify(lcs), JSON.stringify(['a', 'c', 'd']));
});

test('CriticMarkupManager - findWordDifferences detects additions', () => {
  const manager = new CriticMarkupManager();
  const diff = manager.findWordDifferences('The cat', 'The black cat');
  assert(diff.some(op => op.type === 'add' && op.text.includes('black')), 'Should detect addition');
});

test('CriticMarkupManager - findWordDifferences detects deletions', () => {
  const manager = new CriticMarkupManager();
  const diff = manager.findWordDifferences('The black cat', 'The cat');
  assert(diff.some(op => op.type === 'delete' && op.text.includes('black')), 'Should detect deletion');
});

test('CriticMarkupManager - parseQmdIntoSections parses headings', () => {
  const manager = new CriticMarkupManager();
  const sections = manager.parseQmdIntoSections('# Heading 1\n## Heading 2');
  assertEqual(sections.length, 2);
  assertEqual(sections[0].type, 'h1');
  assertEqual(sections[1].type, 'h2');
});

test('CriticMarkupManager - parseQmdIntoSections parses lists', () => {
  const manager = new CriticMarkupManager();
  const sections = manager.parseQmdIntoSections('- Item 1\n- Item 2\n- Item 3');
  assertEqual(sections.length, 1);
  assertEqual(sections[0].type, 'ul');
  assertIncludes(sections[0].qmdText, 'Item 1');
});

test('CriticMarkupManager - recordChange tracks line delta', () => {
  const manager = new CriticMarkupManager();
  manager.recordChange('test-path', 'Line 1\nLine 2', 'Line 1\nLine 2\nLine 3');
  assertEqual(manager.changeHistory.length, 1);
  assertEqual(manager.changeHistory[0].lineDelta, 1);
});

test('CriticMarkupManager - calculateCurrentLineNumber with no changes', () => {
  const manager = new CriticMarkupManager();
  const lineNumber = manager.calculateCurrentLineNumber(5, 10);
  assertEqual(lineNumber, 10);
});

console.log('');

// Integration Tests
console.log('Integration Tests:');

test('Integration - CriticMarkupManager with markdown formatting', () => {
  const manager = new CriticMarkupManager();
  const originalMarkdown = '**Bold text** with *italic*';
  const reviewedMarkdown = '**Bold text** with *italic* and more';

  manager.updateElementState('test-element', originalMarkdown, reviewedMarkdown, 'TestUser');

  assert(manager.elementStates['test-element'], 'Element state should exist');
  assertEqual(manager.elementStates['test-element'].commits.length, 1);
});

test('Integration - UserManager + CriticMarkupManager comments', () => {
  const userMgr = new UserManager();
  const criticMgr = new CriticMarkupManager();

  const username = userMgr.getCurrentUser();
  const userColor = userMgr.getUserColor(username);

  const comment = criticMgr.addComment(
    'test-element', 'selected text', 'This is a comment',
    username, 'section-1', 0, userColor, 0, 13
  );

  assertEqual(comment.author, username);
  assertEqual(comment.userColor, userColor);
});

test('Integration - QMD parsing with complex structure', () => {
  const manager = new CriticMarkupManager();
  const qmd = '# Heading\n\nParagraph text.\n\n- Item 1\n- Item 2';

  const sections = manager.parseQmdIntoSections(qmd);

  assert(sections.some(s => s.type === 'h1'), 'Should parse heading');
  assert(sections.some(s => s.type === 'p'), 'Should parse paragraph');
  assert(sections.some(s => s.type === 'ul'), 'Should parse list');
});

test('Integration - Change history and line offsets', () => {
  const manager = new CriticMarkupManager();

  manager.changeHistory = [
    { timestamp: '2025-01-01T00:00:00Z', sectionIndex: 2, lineDelta: 3 }
  ];

  const newLineNumber = manager.calculateCurrentLineNumber(5, 10);
  assertEqual(newLineNumber, 13);
});

test('Integration - Storage persistence', () => {
  const manager1 = new CriticMarkupManager();
  manager1.updateElementState('test-el', 'orig', 'rev', 'User');
  manager1.saveToStorage();

  const manager2 = new CriticMarkupManager();
  assert(manager2.elementStates['test-el'], 'Should persist element state');
  assertEqual(manager2.elementStates['test-el'].commits[0].reviewedMarkdown, 'rev');
});

test('Integration - Multi-line diff generation', () => {
  const manager = new CriticMarkupManager();
  const original = 'Line 1\nLine 2\nLine 3';
  const modified = 'Line 1\nModified Line 2\nLine 3';

  const diff = manager.findLineDifferences(original, modified);

  // Should detect changes - could be word-level diff or line-level
  const hasChanges = diff.some(op => op.type === 'delete' || op.type === 'add');
  assert(hasChanges, 'Should detect changes');
  const hasUnchanged = diff.some(op => op.type === 'unchanged');
  assert(hasUnchanged, 'Should preserve unchanged parts');
});

console.log('');

// Summary
console.log('====================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('====================================\n');

process.exit(failed > 0 ? 1 : 0);
