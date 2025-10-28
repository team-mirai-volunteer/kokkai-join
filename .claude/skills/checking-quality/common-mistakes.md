# Common Mistakes Guide

Comprehensive catalog of frequently forgotten tasks and how to prevent them.

## Table of Contents

1. [Related File Updates](#related-file-updates)
2. [Test File Updates](#test-file-updates)
3. [Lint Issues](#lint-issues)
4. [Async Pattern Errors](#async-pattern-errors)
5. [Documentation Updates](#documentation-updates)
6. [Prevention Strategies](#prevention-strategies)

## Related File Updates

### Problem: Forgetting to Update Call Sites

When modifying component interfaces, function signatures, or type definitions, related files often get overlooked.

### Common Scenarios

#### Scenario A: Component Props Change

**What happens:**
```typescript
// Component file: SearchResult.tsx
interface SearchResultProps {
  result: string;
  loading: boolean;
  // Removed: query: string;
}
```

**What gets forgotten:**
```typescript
// Parent file: SearchPage.tsx
// Still passing removed prop
<SearchResult result={result} query={query} loading={loading} />
```

**Prevention:**
1. Search for component usage: `grep -r "SearchResult" src/`
2. Update all call sites before committing
3. Verify with TypeScript compiler: `npm run build`

#### Scenario B: Function Signature Change

**What happens:**
```typescript
// Changed from:
function fetchData(id: string): Promise<Data>

// To:
function fetchData(id: string, options: FetchOptions): Promise<Data>
```

**What gets forgotten:**
- All function call sites still use old signature
- Tests still use old signature
- Mock implementations not updated

**Prevention:**
1. Search for function usage: `grep -r "fetchData" src/`
2. Update implementation files
3. Update test files
4. Update mock definitions

#### Scenario C: Type Definition Change

**What happens:**
```typescript
// types/user.ts
interface User {
  id: string;
  name: string;
  // Removed: email: string;
  // Added: contact: ContactInfo;
}
```

**What gets forgotten:**
- Components accessing `user.email`
- Tests asserting on `user.email`
- API response mappers

**Prevention:**
1. Search for type usage: `grep -r "user.email" src/`
2. Search for interface usage: `grep -r "User" src/`
3. Run TypeScript check: `npm run build`
4. Run tests: `npm test`

### Checklist: Interface Changes

When changing any interface:
- [ ] Identify all files importing the interface
- [ ] Update implementation files
- [ ] Update test files
- [ ] Update documentation
- [ ] Run `npm run build` to catch type errors
- [ ] Run `npm test` to catch runtime issues

## Test File Updates

### Problem: Implementation Changes Without Test Updates

Modifying implementation without updating corresponding tests leads to false positives or test failures.

### Common Scenarios

#### Scenario A: Removed Functionality

**Implementation change:**
```typescript
// Removed loading message display
export function SearchResult({ result, loading }: Props) {
  if (loading) {
    return null; // Changed from: <div>処理中...</div>
  }
  // ...
}
```

**Forgotten test update:**
```typescript
// Test still expects old behavior
it('should display loading message', () => {
  render(<SearchResult result="" loading={true} />);
  expect(screen.getByText('処理中...')).toBeInTheDocument();
  // This will fail!
});
```

**Correct approach:**
```typescript
// Update test first
it('should display nothing when loading', () => {
  const { container } = render(<SearchResult result="" loading={true} />);
  expect(container.firstChild).toBeNull();
});

// Then update implementation
```

#### Scenario B: Changed ARIA Attributes

**Implementation change:**
```typescript
// Removed role attribute
<div className="progress-display">
  {/* Removed: role="status" */}
  {/* Content... */}
</div>
```

**Forgotten test update:**
```typescript
// Test still looks for old role
it('should have proper accessibility', () => {
  render(<ProgressDisplay progress={mockProgress} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  // This will fail!
});
```

**Correct approach:**
```typescript
// Update test first
it('should have progressbar role', () => {
  render(<ProgressDisplay progress={mockProgress} />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// Then update implementation
```

#### Scenario C: Modified Return Values

**Implementation change:**
```typescript
// Changed return type
async function fetchUser(id: string): Promise<User | null> {
  // Now returns null on error instead of throwing
  try {
    return await api.getUser(id);
  } catch (error) {
    return null;
  }
}
```

**Forgotten test update:**
```typescript
// Test still expects exception
it('throws error for invalid id', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow();
  // This will fail - function no longer throws!
});
```

**Correct approach:**
```typescript
// Update test first
it('returns null for invalid id', async () => {
  const result = await fetchUser('invalid');
  expect(result).toBeNull();
});

// Then update implementation
```

### Checklist: Implementation Changes

Before modifying implementation:
- [ ] Locate corresponding test file
- [ ] Identify affected test cases
- [ ] Update test expectations
- [ ] Verify tests fail (prove they detect the change)
- [ ] Update implementation
- [ ] Verify tests pass

## Lint Issues

### Problem: Overlooking Lint Warnings

Lint warnings accumulate and eventually cause build failures.

### Common Scenarios

#### Scenario A: Unused Imports

**What happens:**
```typescript
// Removed usage but forgot to remove import
import type { ProviderRegistry } from './registry.js';
import type { QueryPlanningService } from './query-planning.js';
// These are no longer used in file
```

**Impact:**
- Dead code in codebase
- Confusing for other developers
- Fails lint checks

**Prevention:**
- Run `npm run lint` frequently
- Configure editor to show lint warnings inline
- Remove imports immediately when removing usage

#### Scenario B: Let vs Const

**What happens:**
```typescript
// Variable never reassigned but uses let
let { finalDocs, sectionHitMap } = orchestratorResult;
// Should be: const { finalDocs, sectionHitMap } = ...
```

**Impact:**
- Misleading code (suggests mutation)
- Fails lint checks
- Prevents optimizations

**Prevention:**
- Default to `const` for all declarations
- Change to `let` only when reassignment needed
- Let linter catch violations

#### Scenario C: Unused Variables

**What happens:**
```typescript
// Variable declared but never used
const [lastQuery, setLastQuery] = useState<string>("");
// lastQuery never referenced
```

**Impact:**
- Unnecessary memory usage
- Code clutter
- Fails lint checks

**Prevention:**
- Remove variables immediately when removing usage
- Prefix with underscore if intentionally unused: `_lastQuery`
- Run lint before committing

### Checklist: Before Committing

Run and fix all lint issues:
- [ ] `npm run lint` shows 0 errors
- [ ] `npm run lint` shows 0 warnings
- [ ] No unused imports
- [ ] No unused variables
- [ ] Correct `const` vs `let` usage
- [ ] All ARIA warnings resolved

## Async Pattern Errors

### Problem: Missing Await Keywords

When converting functions to async, callers often miss adding `await`.

### Common Scenarios

#### Scenario A: Function Made Async

**What happens:**
```typescript
// Function changed to async
export type EmitFn = (event: ProgressEvent) => Promise<void>;

export function createHonoEmit(stream: Stream): EmitFn {
  return async (event: ProgressEvent) => {
    await stream.writeSSE({ data: JSON.stringify(event) });
  };
}
```

**What gets forgotten:**
```typescript
// Callers don't add await
emit({ type: 'progress', step: 1 }); // Missing await!
```

**Impact:**
- Promises not awaited
- Race conditions
- Silent failures

**Prevention:**
1. Search for all function calls: `grep -r "emit(" src/`
2. Add `await` to each call
3. Mark calling functions as `async` if needed
4. Run tests to catch timing issues

#### Scenario B: Promise Chain Broken

**What happens:**
```typescript
// Changed from callback to Promise
function processData(data: string): Promise<Result> {
  return api.process(data);
}
```

**What gets forgotten:**
```typescript
// Old callback pattern still used
processData(input).then(result => {
  // Forgotten: error handling
});
```

**Prevention:**
- Use `async/await` instead of `.then()`
- Add try/catch for error handling
- Update all callers consistently

### Checklist: Async Changes

When making functions async:
- [ ] Search for all function calls
- [ ] Add `await` to each call
- [ ] Make callers `async` if needed
- [ ] Add error handling (try/catch)
- [ ] Update tests to handle async
- [ ] Verify no race conditions

## Documentation Updates

### Problem: Outdated Documentation

Code changes without documentation updates lead to confusion.

### What to Update

#### Code Comments

```typescript
/**
 * Emits progress event
 * @param event - Progress event to emit
 * @returns void // Outdated! Now returns Promise<void>
 */
export type EmitFn = (event: ProgressEvent) => Promise<void>;
```

#### README Files

When changing:
- API endpoints
- Configuration options
- Environment variables
- Installation steps
- Usage examples

Update corresponding README sections.

#### Type Documentation

```typescript
/**
 * Props for SearchResult component
 * @property result - Markdown search result
 * @property query - Search query // Outdated! Removed
 * @property loading - Loading state
 */
```

### Checklist: Documentation

After code changes:
- [ ] Update JSDoc comments
- [ ] Update inline comments explaining "why"
- [ ] Update README if API changed
- [ ] Update type documentation
- [ ] Update example code
- [ ] Remove obsolete documentation

## Prevention Strategies

### Strategy 1: Systematic Search

Before committing, search for:
```bash
# Find all usages of changed items
grep -r "functionName" src/
grep -r "ComponentName" src/
grep -r "interfaceName" src/

# Include tests
grep -r "functionName" src/ __tests__/
```

### Strategy 2: Compiler as Safety Net

TypeScript catches many mistakes:
```bash
# Run type checking
npm run build

# Fix all type errors before committing
```

### Strategy 3: Test Everything

Tests catch runtime issues:
```bash
# Run full test suite
npm test

# Fix all test failures before committing
```

### Strategy 4: Checklist Usage

Use physical or digital checklist:
- [ ] Implementation updated
- [ ] Tests updated
- [ ] Related files updated
- [ ] Documentation updated
- [ ] Lint passing
- [ ] Tests passing
- [ ] Build successful

### Strategy 5: Small Changes

Keep changes focused:
- Easier to track related files
- Less chance of forgetting updates
- Simpler to review
- Faster to debug if issues arise

### Strategy 6: Pair Review

Before committing:
1. Review your own changes
2. List all modified files
3. For each file, list dependencies
4. Verify dependencies updated

## Real Examples

### Example 1: Props Removal

**Change:** Remove `query` prop from `SearchResult`

**Checklist execution:**
```bash
# 1. Find usages
grep -r "SearchResult" src/

# 2. Found: src/pages/SearchPage.tsx
# 3. Found: src/components/__tests__/SearchResult.test.tsx

# 4. Update test first
# Edit: SearchResult.test.tsx - remove query from all render calls

# 5. Update implementation
# Edit: SearchResult.tsx - remove query from props

# 6. Update parent
# Edit: SearchPage.tsx - remove query from render call

# 7. Verify
npm run lint
npm test
npm run build

# 8. All pass → commit
```

### Example 2: Async Conversion

**Change:** Make `emit()` function async

**Checklist execution:**
```bash
# 1. Find all emit() calls
grep -r "emit(" services/

# 2. Count calls: 7 locations found

# 3. Update type first
# Edit: EmitFn type to return Promise<void>

# 4. Update implementation
# Edit: createHonoEmit to be async

# 5. Add await to all 7 calls
# Edit: All emit() calls in streaming file

# 6. Verify
npm run lint  # Check for floating promises
npm test      # Check for timing issues
npm run build # Check types

# 7. All pass → commit
```

## Summary

Most mistakes follow patterns:

1. **Changing A, forgetting B** - Use systematic search
2. **Updating code, not tests** - Test-first always
3. **Ignoring lint** - Run lint frequently
4. **Skipping async/await** - Search all call sites
5. **Outdated docs** - Update docs with code

Prevention is systematic:
- Search for dependencies
- Update tests first
- Run quality checks
- Use checklists
- Keep changes small
