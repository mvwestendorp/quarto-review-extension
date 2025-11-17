# Test Fixtures Documentation

This directory contains test fixtures for the Quarto Review extension test suite. Fixtures allow you to easily add new test cases to verify behavior and prevent regressions.

## Directory Structure

```
fixtures/
├── README.md                      # This file
├── transformation/                # Text transformation test cases
│   ├── inputs/                   # Original markdown content
│   ├── edits/                    # Modified markdown content
│   └── expected/                 # Expected outputs for each transformation step
│       ├── changes/              # Expected TextChange[] objects (JSON)
│       ├── critic-markup/        # Expected CriticMarkup output
│       ├── accepted/             # Expected output after accepting changes
│       └── rejected/             # Expected output after rejecting changes
├── rendering/                     # Markdown rendering test cases
│   ├── inputs/                   # Markdown to render
│   └── expected/                 # Expected HTML output
├── documents/                     # Complete document fixtures
│   ├── simple/                   # Simple single-file documents
│   ├── multi-page/               # Multi-page projects
│   └── edge-cases/               # Edge case documents
└── operations/                    # Operation sequence fixtures
    ├── scenarios/                # JSON files defining operation sequences
    └── expected/                 # Expected state after operations
```

## How to Add New Test Cases

### 1. Text Transformation Tests

To add a new test case for the transformation pipeline (diff generation → CriticMarkup conversion):

#### Step 1: Create input files

Create a file in `transformation/inputs/` with the original content:

```bash
# File: transformation/inputs/my-test-case.md
```

Create a file in `transformation/edits/` with the edited content:

```bash
# File: transformation/edits/my-test-case.md
```

**Naming convention**: Use the same base name for both files.

#### Step 2: Create expected output files

Create expected outputs for each transformation step:

1. **Expected changes** (optional, for detailed verification):
   ```bash
   # File: transformation/expected/changes/my-test-case.json
   ```
   Contains the expected `TextChange[]` array from `generateChanges()`.

2. **Expected CriticMarkup**:
   ```bash
   # File: transformation/expected/critic-markup/my-test-case.md
   ```
   Contains the expected output from `changesToCriticMarkup()`.

3. **Expected accepted result**:
   ```bash
   # File: transformation/expected/accepted/my-test-case.md
   ```
   Contains the expected output after accepting all changes.

4. **Expected rejected result**:
   ```bash
   # File: transformation/expected/rejected/my-test-case.md
   ```
   Contains the expected output after rejecting all changes.

#### Example: Adding a list item test

```bash
# 1. Create input
echo "- First item
- Second item
- Third item" > transformation/inputs/list-delete-item.md

# 2. Create edit (delete second item)
echo "- First item
- Third item" > transformation/edits/list-delete-item.md

# 3. Create expected CriticMarkup
echo "- First item
{--
- Second item
--}
- Third item" > transformation/expected/critic-markup/list-delete-item.md

# 4. Create expected accepted (same as edit)
cp transformation/edits/list-delete-item.md transformation/expected/accepted/list-delete-item.md

# 5. Create expected rejected (same as input)
cp transformation/inputs/list-delete-item.md transformation/expected/rejected/list-delete-item.md
```

The test suite will automatically discover and test this case!

### 2. Markdown Rendering Tests

To test markdown rendering with CriticMarkup:

#### Step 1: Create input markdown

```bash
# File: rendering/inputs/my-rendering-test.md
```

#### Step 2: Create expected HTML

```bash
# File: rendering/expected/my-rendering-test.html
```

**Note**: Expected HTML should be the sanitized, rendered output from the MarkdownModule.

### 3. Edge Case Documents

To add a complete document that tests specific edge cases:

#### Step 1: Create the document

```bash
# File: documents/edge-cases/my-edge-case.qmd
```

#### Step 2: Document what it tests

Add a comment at the top of the file:

```markdown
---
title: "Edge Case: [Description]"
---

<!--
TEST PURPOSE: This document tests [specific behavior]
EXPECTED: [what should happen]
KNOWN ISSUES: [any known issues]
-->

[document content]
```

### 4. Operation Sequence Tests

To test complex operation sequences (edit, undo, redo, etc.):

#### Step 1: Create scenario file

```json
// File: operations/scenarios/my-scenario.json
{
  "description": "Test undo/redo with multiple edits",
  "initialState": {
    "elements": [
      {
        "id": "test.section.para-1",
        "type": "Para",
        "markdown": "Original content"
      }
    ]
  },
  "operations": [
    {
      "type": "edit",
      "elementId": "test.section.para-1",
      "newContent": "First edit"
    },
    {
      "type": "edit",
      "elementId": "test.section.para-1",
      "newContent": "Second edit"
    },
    {
      "type": "undo"
    }
  ],
  "expectedState": {
    "test.section.para-1": {
      "currentContent": "First edit",
      "trackedChanges": "First edit"
    }
  }
}
```

#### Step 2: Create expected output

```bash
# File: operations/expected/my-scenario.json
```

Contains the expected final state after all operations.

## Test Categories and What They Verify

### Text Transformation Tests

These tests verify the core text transformation pipeline:

1. **diff generation** (`generateChanges`) - Correctly identifies additions/deletions
2. **CriticMarkup conversion** (`changesToCriticMarkup`) - Formats changes correctly
3. **Accept changes** (`stripCriticMarkup` with accept=true) - Correctly applies changes
4. **Reject changes** (`stripCriticMarkup` with accept=false) - Correctly reverts changes

**Common test scenarios**:
- Simple text edits
- List item changes (preserving markers)
- Table cell edits (preserving structure)
- Multi-line changes
- Code block edits
- Mixed changes (additions + deletions)
- Special characters and escape sequences

### Rendering Tests

These tests verify markdown rendering with CriticMarkup:

1. **Basic rendering** - Correct HTML output
2. **CriticMarkup rendering** - Proper styling of tracked changes
3. **Sanitization** - XSS prevention
4. **Heading normalization** - Stripping Pandoc attributes
5. **Element-specific rendering** - Headers, code blocks, blockquotes, etc.

### Operation Sequence Tests

These tests verify state management:

1. **CRUD operations** - Insert, delete, edit, move
2. **Undo/redo** - History management
3. **Tracked changes** - Baseline tracking
4. **Segment management** - Generated segments
5. **Multi-page operations** - Page-filtered operations

## Naming Conventions

Use descriptive, kebab-case names that indicate what the test covers:

**Good names**:
- `list-delete-middle-item.md`
- `table-edit-cell-with-pipes.md`
- `heading-with-critic-markup.md`
- `multi-line-substitution.md`
- `unicode-emoji-edit.md`

**Bad names**:
- `test1.md`
- `temp.md`
- `foo.md`

## Special Characters and Edge Cases

When adding tests for special character sequences, document what they test:

```markdown
<!-- TEST: CJK character editing -->
原始文本

<!-- TEST: Emoji in changes -->
Hello 👋 World

<!-- TEST: Escaped markdown characters -->
Not a \*bold\* statement

<!-- TEST: Mixed RTL/LTR text -->
English text עברית text

<!-- TEST: Zero-width characters -->
Text​with​zero-width​spaces
```

## Running Tests Against Your Fixtures

The test suite automatically discovers and runs all fixture-based tests:

```bash
# Run all transformation tests
npm run test:unit -- transformation

# Run all rendering tests
npm run test:unit -- rendering

# Run all tests
npm test
```

## Debugging Failed Tests

When a test fails:

1. **Check the diff** - The test output will show expected vs. actual
2. **Verify input files** - Ensure input/edit files are correct
3. **Update expected output** - If behavior is correct but expected output is wrong:
   ```bash
   # Regenerate expected output (use with caution!)
   npm run test:update-snapshots
   ```

## Contributing New Test Categories

To add a new test category:

1. Create a new directory under `fixtures/`
2. Add a README section documenting the category
3. Create corresponding test files in `tests/unit/` or `tests/integration/`
4. Update this README with the new category

## Tips for Effective Test Cases

1. **Start simple** - Add basic cases first, then edge cases
2. **One thing per test** - Each fixture should test one specific behavior
3. **Document intent** - Add comments explaining what the test verifies
4. **Use real-world examples** - Base tests on actual bugs or user reports
5. **Test boundaries** - Empty strings, very long content, special characters
6. **Test combinations** - Multiple changes, nested structures, etc.
