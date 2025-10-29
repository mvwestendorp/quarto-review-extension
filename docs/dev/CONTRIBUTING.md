# Contributing Guide

Thank you for contributing to the Quarto Review Extension! This guide will help you get started.

## Code Standards

### TypeScript

- Use strict TypeScript mode (no implicit `any`)
- Add type annotations to function parameters
- Use interfaces for object structures
- Prefer immutable data structures

```typescript
// Good
interface UserConfig {
  name: string;
  timeout?: number;
}

function processUser(config: UserConfig): void {
  const { name, timeout = 5000 } = config;
}

// Avoid
function processUser(config: any): void {
  // ...
}
```

### JSDoc Comments

All public APIs must have JSDoc documentation. This is extracted during build to generate API documentation.

```typescript
/**
 * Brief description of the function
 *
 * Longer description explaining the function's purpose,
 * behavior, and any important notes.
 *
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value
 * @throws ErrorType - When this error occurs
 *
 * @example
 * ```typescript
 * const result = myFunction(value1, value2);
 * console.log(result);
 * ```
 *
 * @see Related functions or documentation
 */
export function myFunction(param1: string, param2: number): string {
  // ...
}
```

### Code Style

```bash
# Format code
npm run lint --fix

# Check formatting
npm run lint
```

## Testing Requirements

All code changes must include tests with comprehensive edge case coverage.

### Writing Tests

```typescript
/**
 * Test file structure
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from '@/path/to/module';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass(config);
  });

  describe('Basic Functionality', () => {
    it('should do something', () => {
      const result = instance.method();
      expect(result).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      // Test edge case
    });

    it('should handle large datasets', () => {
      // Test performance
    });

    it('should handle null/undefined', () => {
      // Test error cases
    });
  });
});
```

### Test Coverage

- Minimum 80% coverage for new code
- All public methods must have tests
- Include at least 3 edge case tests per feature
- Security tests (XSS, HTML escaping) for UI components

```bash
# Check coverage
npm run test:coverage

# Generate HTML coverage report
npm run test:coverage -- --reporter=html
```

## Pull Request Process

### Before Submitting

1. **Setup:** Follow [Setup Guide](./SETUP.md)
2. **Create Branch:** `git checkout -b feature/your-feature`
3. **Make Changes:** Implement your feature
4. **Add Tests:** Write comprehensive tests
5. **Format Code:** `npm run lint --fix`
6. **Type Check:** `npm run type-check`
7. **Run Tests:** `npm run test`

### Commit Messages

Use conventional commit format:

```
type(scope): description

Optional body explaining the change

Optional footer with issue references
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code formatting (no logic change)
- `refactor` - Code restructuring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `chore` - Build, dependencies, etc.

**Examples:**
```
feat(search): add regex support
fix(ui): correct highlight positioning
docs(readme): update installation steps
test(change-summary): add edge case tests
```

### PR Description

```markdown
## Description
Brief explanation of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Breaking change

## Testing
- [ ] Unit tests added
- [ ] Edge cases covered
- [ ] Manual testing done

## Checklist
- [ ] Code follows style guide
- [ ] TypeScript types are correct
- [ ] JSDoc comments added
- [ ] Tests pass (`npm run test`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Documentation updated
```

## Code Review Guidelines

When reviewing code:

1. **Correctness** - Does it work as intended?
2. **Testing** - Are edge cases covered?
3. **Performance** - Are there any bottlenecks?
4. **Security** - Are there any vulnerabilities?
5. **Documentation** - Are public APIs documented?
6. **Style** - Does it follow project conventions?

## Adding New Features

### 1. Create Module Structure

```
src/modules/my-feature/
├── index.ts           # Main exports
├── module.ts          # Implementation
└── types.ts           # Type definitions
```

### 2. Write TypeScript with JSDoc

```typescript
/**
 * MyFeature - Brief description
 *
 * Longer description explaining the feature
 * and its usage patterns.
 */
export class MyFeature {
  /**
   * Do something
   *
   * @param input - Input value
   * @returns Result
   */
  public doSomething(input: string): string {
    return input.toUpperCase();
  }
}
```

### 3. Write Tests

```typescript
describe('MyFeature', () => {
  describe('Basic Functionality', () => {
    it('should convert to uppercase', () => {
      const feature = new MyFeature();
      expect(feature.doSomething('hello')).toBe('HELLO');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const feature = new MyFeature();
      expect(feature.doSomething('')).toBe('');
    });

    it('should handle special characters', () => {
      const feature = new MyFeature();
      expect(feature.doSomething('hello-world')).toBe('HELLO-WORLD');
    });
  });
});
```

### 4. Update Documentation

- Add to [MODULES.md](./MODULES.md)
- Update relevant README files
- Add JSDoc examples

### 5. Run Full Check

```bash
npm run lint --fix    # Format code
npm run type-check    # Check types
npm run test          # Run tests
npm run build         # Build project
npm run docs          # Generate API docs
```

## Debugging Tips

### Console Logging

```typescript
// Use meaningful log messages
console.log('Processing item:', item.id, 'with config:', config);

// For complex objects
console.table(arrayOfObjects);
```

### VS Code Debugger

Add breakpoints by clicking on line numbers, then run tests with debugger:

```bash
npm run test:debug
```

### Using Vitest UI

```bash
npm run test:ui
```

Then open the UI in browser to see test results visually.

## Documentation Standards

### Inline Comments

Use comments to explain *why*, not *what*:

```typescript
// Good - explains why
// Debounce search to avoid excessive API calls
const debounceTimer = setTimeout(() => {
  performSearch();
}, 150);

// Bad - states what the code does
// Set debounce timer
const debounceTimer = setTimeout(() => {
  performSearch();
}, 150);
```

### Module Documentation

Every module must have JSDoc comments on public APIs:

```typescript
/**
 * @module changes
 * Manages document changes as immutable operations
 *
 * @example
 * ```typescript
 * const changes = new ChangesModule();
 * changes.edit('elem-1', 'new content');
 * const state = changes.getCurrentState();
 * ```
 */
```

## Performance Considerations

- Avoid large DOM manipulations
- Use debouncing for frequent events
- Cache expensive computations
- Profile performance: `npm run test:performance`

## Security Considerations

- Always escape user input in HTML
- Use `textContent` instead of `innerHTML` when possible
- Validate all inputs
- Test XSS prevention

## Accessibility

- Use semantic HTML (`<button>`, `<label>`, etc.)
- Add ARIA attributes where needed
- Test keyboard navigation
- Ensure sufficient color contrast

## Questions?

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for design questions
- Read [MODULES.md](./MODULES.md) for API questions
- Look at existing code for style examples
- Check test files for usage patterns

Thank you for contributing! 🎉
