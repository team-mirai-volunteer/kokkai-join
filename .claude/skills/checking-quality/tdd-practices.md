# TDD Practices Guide

Detailed guidelines for Test-Driven Development implementation.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Red-Green-Refactor Cycle](#red-green-refactor-cycle)
3. [Test-First Modification](#test-first-modification)
4. [Common Violations](#common-violations)
5. [Practical Examples](#practical-examples)

## Core Principles

### Always Test-First

Never write production code without a failing test. This ensures:
- Test validity (proves test can fail)
- Clear requirements definition
- Complete test coverage
- Immediate feedback on implementation

### Minimal Implementation

Write only enough code to make the current test pass. Benefits:
- Prevents over-engineering
- Maintains focus on requirements
- Encourages iterative development
- Reduces unnecessary complexity

### Refactor Fearlessly

Improve code structure only when tests are green. This enables:
- Safe restructuring
- Continuous improvement
- Confidence in changes
- Maintained functionality

## Red-Green-Refactor Cycle

### Phase 1: RED

Write a failing test that defines desired behavior.

```typescript
// Example: Testing a new validation function
describe('validateEmail', () => {
  it('should reject invalid email format', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

**Requirements:**
- Test must fail initially
- Test must be specific and focused
- Test must clearly define expected behavior

### Phase 2: GREEN

Write minimal code to pass the test.

```typescript
// Minimal implementation
function validateEmail(email: string): boolean {
  return email.includes('@');
}
```

**Requirements:**
- Implement only what's needed for current test
- No additional features or "future-proofing"
- Focus on making test pass quickly

### Phase 3: REFACTOR

Improve code while keeping tests green.

```typescript
// Improved implementation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Requirements:**
- Tests must stay green throughout
- Improve structure, not behavior
- Commit after successful refactoring

## Test-First Modification

### Critical Rule

When modifying existing code: **Update tests before implementation.**

### Modification Workflow

1. **Identify affected tests**
   ```bash
   # Find test file
   ls src/components/__tests__/SearchResult.test.tsx
   ```

2. **Update test expectations**
   ```typescript
   // Before: Component accepts query prop
   render(<SearchResult result={result} query={query} loading={false} />);

   // After: Component no longer needs query prop
   render(<SearchResult result={result} loading={false} />);
   ```

3. **Verify test fails**
   ```bash
   npm test SearchResult.test.tsx
   # Should fail with type error or runtime error
   ```

4. **Update implementation**
   ```typescript
   // Remove query prop from component
   interface SearchResultProps {
     result: string;
     loading: boolean;
     // query: string; // Removed
   }
   ```

5. **Verify tests pass**
   ```bash
   npm test SearchResult.test.tsx
   # Should pass with updated implementation
   ```

## Common Violations

### Writing Code Without Tests

**Wrong:**
```typescript
// Just write the function
function processData(data: string): string {
  return data.toUpperCase();
}
```

**Correct:**
```typescript
// First: Write test
test('processData converts to uppercase', () => {
  expect(processData('hello')).toBe('HELLO');
});

// Then: Implement
function processData(data: string): string {
  return data.toUpperCase();
}
```

### Implementing Before Test

**Wrong:**
```typescript
// Implement feature
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Then write test
test('fetchUser retrieves user', async () => {
  // ...
});
```

**Correct:**
```typescript
// First: Write test
test('fetchUser retrieves user', async () => {
  const user = await fetchUser('123');
  expect(user.id).toBe('123');
});

// Then: Implement
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### Modifying Implementation Before Tests

**Wrong:**
```typescript
// Change implementation
interface Props {
  data: string;
  // Removed: onComplete?: () => void;
}

// Forget to update tests
test('calls onComplete', () => {
  // This will fail but for wrong reasons
});
```

**Correct:**
```typescript
// First: Update test
test('processes data without callback', () => {
  render(<Component data="test" />);
  // Updated expectation
});

// Then: Change implementation
interface Props {
  data: string;
  // Removed: onComplete?: () => void;
}
```

## Practical Examples

### Example 1: Adding New Feature

**Scenario:** Add email validation to user form.

```typescript
// Step 1: RED - Write failing test
describe('UserForm', () => {
  it('shows error for invalid email', () => {
    render(<UserForm />);
    const emailInput = screen.getByLabelText('Email');

    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });
});

// Step 2: GREEN - Minimal implementation
function UserForm() {
  const [error, setError] = useState('');

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value.includes('@')) {
      setError('Invalid email format');
    }
  };

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input id="email" onBlur={handleBlur} />
      {error && <span>{error}</span>}
    </div>
  );
}

// Step 3: REFACTOR - Improve validation
const validateEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

function UserForm() {
  const [error, setError] = useState('');

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!validateEmail(e.target.value)) {
      setError('Invalid email format');
    } else {
      setError('');
    }
  };

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input id="email" onBlur={handleBlur} />
      {error && <span>{error}</span>}
    </div>
  );
}
```

### Example 2: Bug Fix

**Scenario:** Function fails with null input.

```typescript
// Step 1: Write test reproducing bug
describe('formatName', () => {
  it('handles null input gracefully', () => {
    expect(formatName(null)).toBe('');
  });
});

// Step 2: Verify test fails
// npm test -- should show failure

// Step 3: Fix implementation
function formatName(name: string | null): string {
  if (!name) return '';
  return name.trim().toUpperCase();
}

// Step 4: Verify test passes
// npm test -- should show success
```

### Example 3: Refactoring

**Scenario:** Extract duplicate logic into utility.

```typescript
// Step 1: Ensure tests are green
npm test

// Step 2: Extract function
// Before:
function ComponentA() {
  const formatted = data.trim().toUpperCase();
  // ...
}

function ComponentB() {
  const formatted = input.trim().toUpperCase();
  // ...
}

// After:
function formatString(str: string): string {
  return str.trim().toUpperCase();
}

function ComponentA() {
  const formatted = formatString(data);
  // ...
}

function ComponentB() {
  const formatted = formatString(input);
  // ...
}

// Step 3: Verify tests still pass
npm test

// Step 4: Add tests for utility
describe('formatString', () => {
  it('trims and uppercases', () => {
    expect(formatString('  hello  ')).toBe('HELLO');
  });
});
```

## Testing Strategy

### Unit Test Focus

- Test single function/component in isolation
- Mock external dependencies
- Fast execution (milliseconds)
- High coverage of edge cases

### Integration Test Focus

- Test component interactions
- Use real implementations where practical
- Moderate execution time (seconds)
- Cover critical user flows

### Test Organization

```
src/
  components/
    Button.tsx
    __tests__/
      Button.test.tsx
  utils/
    validation.ts
    __tests__/
      validation.test.ts
```

Co-locate tests with implementation for easy maintenance.

## Summary

TDD success requires discipline:

1. **Never skip tests** - Every change needs tests
2. **Test first always** - Tests define requirements
3. **Stay in the cycle** - RED → GREEN → REFACTOR
4. **Refactor fearlessly** - Tests provide safety net

Follow these practices to maintain high code quality while developing efficiently.
