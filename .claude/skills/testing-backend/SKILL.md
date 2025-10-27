# Backend Testing Skill

## Description
Specialized agent for implementing meaningful tests in the backend (Node.js/TypeScript) following TDD principles and best practices.

## Context
- Project: kokkai-join backend (Node.js, TypeScript, Vitest, Hono, Supabase)
- Testing framework: Vitest
- Database: PostgreSQL with Supabase
- Focus: Writing tests that verify actual behavior, not just function calls

## When to Use This Skill
- Implementing new backend features (API endpoints, services, utilities)
- Writing tests for existing untested code
- Refactoring tests that are meaningless or low-value
- Adding integration tests for database operations

## Testing Principles (MUST FOLLOW)

### 1. TDD Approach is MANDATORY
- RED: Write a failing test first
- GREEN: Write minimum code to pass
- REFACTOR: Improve code quality

### 2. What Makes a Meaningful Test

#### ✅ GOOD Tests
- Test behavior and business logic, not implementation details
- Use appropriate levels of mocking (mock boundaries, not internals)
- Cover edge cases, error conditions, and boundary values
- Provide clear failure messages
- Are refactoring-resistant (don't break on internal changes)

#### ❌ BAD Tests
- Mock everything and only verify function calls were made
- Test implementation details (e.g., `expect(mockClient._mocks.from).toHaveBeenCalledWith(...)`)
- Have vague assertions like `expect(result).toBeDefined()`
- Are written just for coverage without verifying correctness

### 3. Test Types and Guidelines

#### Unit Tests
- **Purpose**: Test pure functions, business logic, data transformations
- **Good example**: `markdown-converter.test.ts`, `duplication-analyzer.test.ts`
- **What to test**: Input/output transformations, edge cases, error handling
- **What NOT to do**: Mock database clients and only test that functions were called

#### Integration Tests
- **Purpose**: Test service layer logic, multi-component interactions
- **Good example**: `multi-source-search.test.ts`
- **What to test**: How components work together, orchestration logic
- **What to mock**: External providers (using test implementations), not the service itself

#### Database/API Tests
- **Purpose**: Test actual database operations and API endpoints
- **AVOID**: Full Supabase client mocking (like `search-history-api.test.ts`)
- **BETTER**: Use test database, Supabase local instance, or test transactions with rollback
- **What to test**: Actual queries, RLS policies, data integrity

### 4. Specific Rules for This Project

#### When Testing Supabase Operations
**❌ DON'T DO THIS** (meaningless):
```typescript
// Bad: Mocking the entire Supabase chain
mockClient._mocks.from.mockReturnValue({...})
mockClient._mocks.select.mockReturnValue({...})
expect(mockClient._mocks.from).toHaveBeenCalledWith("table_name")
```

**✅ DO THIS INSTEAD**:
```typescript
// Good: Use Supabase local instance or test database
// Option 1: Supabase local development
const supabase = createClient(testUrl, testKey)
const result = await getSearchHistories(supabase)
expect(result).toHaveLength(expectedCount)
expect(result[0]).toMatchObject({ query: "expected query" })

// Option 2: Mock at HTTP level, not client level
nock('https://supabase-url.com')
  .post('/rest/v1/search_histories')
  .reply(200, mockData)
```

#### When Testing Services
**✅ GOOD APPROACH**:
- Mock providers/external dependencies at interface boundaries
- Test actual service logic
- Verify business rules, error handling, data transformations

**Example** (from `multi-source-search.test.ts`):
```typescript
// Good: Mock providers, test service orchestration
class MockProvider implements SearchProvider {
  async search(query: ProviderQuery): Promise<DocumentResult[]> {
    return this.results
  }
}

const results = await service.searchAcross([provider1, provider2], query)
expect(results.length).toBe(expectedLength)
expect(results).toContainEqual(expectedDocument)
```

#### When Testing Utilities
**✅ GOOD APPROACH**:
- Test pure functions thoroughly
- Cover all edge cases and boundary conditions
- No mocking needed for pure functions

**Example** (from `markdown-converter.test.ts`):
```typescript
// Good: Test actual transformation logic
const markdown = convertDeepResearchToMarkdown(response)
expect(markdown).toContain("これはテストです[^1]")
expect(markdown).toContain("[^1]: [テスト資料](https://example.com/test)")
```

### 5. Error Cases to Avoid

#### ❌ Testing Function Calls Instead of Behavior
```typescript
// BAD
expect(mockClient._mocks.getUser).toHaveBeenCalled()
expect(mockClient._mocks.insert).toHaveBeenCalledWith(expect.objectContaining({...}))
// This only tests that functions were called, not that they work correctly
```

#### ❌ Vague Assertions
```typescript
// BAD
expect(result).toBeDefined()
expect(client).toBeDefined()
// These don't verify correctness
```

#### ❌ Testing Implementation Details
```typescript
// BAD
expect(service.internalHelperMethod()).toBe(...)
// Internal methods can change without affecting behavior
```

## Implementation Workflow

### Step 1: Analyze Requirements
- Understand the feature/bug to implement
- Identify what behavior needs testing
- Determine appropriate test type (unit, integration, e2e)

### Step 2: Write Failing Test (RED)
- Write a test that describes desired behavior
- Run test to confirm it fails
- Ensure failure message is clear

### Step 3: Implement Minimum Code (GREEN)
- Write simplest code to make test pass
- Don't over-engineer
- Run test to confirm it passes

### Step 4: Refactor (if needed)
- Improve code quality
- Ensure all tests still pass
- Don't change behavior

### Step 5: Add Edge Cases
- Test error conditions
- Test boundary values
- Test null/undefined/empty cases

### Step 6: Verify Test Quality
- Ask: "If this test fails, do I know what's wrong?"
- Ask: "Can I refactor code without breaking this test?"
- Ask: "Does this test verify actual behavior?"

## Common Patterns

### Testing API Endpoints (Hono)
```typescript
describe("POST /api/v1/endpoint", () => {
  it("should return 200 with valid data", async () => {
    const app = createApp() // Real app instance
    const res = await app.request("/api/v1/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test" })
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ success: true })
  })

  it("should return 400 with invalid data", async () => {
    // Test error case
  })
})
```

### Testing Services with Dependencies
```typescript
describe("MyService", () => {
  it("should orchestrate multiple providers", async () => {
    const mockProvider1 = new MockProvider("p1", [doc1, doc2])
    const mockProvider2 = new MockProvider("p2", [doc3])
    const service = new MyService()

    const results = await service.process([mockProvider1, mockProvider2])

    // Test actual orchestration logic
    expect(results).toHaveLength(3)
    expect(results.map(r => r.id).sort()).toEqual(["doc1", "doc2", "doc3"])
  })
})
```

### Testing Pure Functions
```typescript
describe("convertData", () => {
  it("should convert valid input", () => {
    const input = { ... }
    const result = convertData(input)
    expect(result).toEqual(expectedOutput)
  })

  it("should handle empty input", () => {
    const result = convertData({})
    expect(result).toEqual(defaultOutput)
  })

  it("should throw on invalid input", () => {
    expect(() => convertData(null)).toThrow("Invalid input")
  })
})
```

## Output Format

When implementing tests, provide:
1. **Test file path**: Where the test should be created
2. **Test description**: What behavior is being tested
3. **Test code**: Following TDD principles
4. **Run instructions**: How to run the test
5. **Explanation**: Why this test is meaningful

## Important Reminders

- **NEVER** mock Supabase client internals and only test function calls
- **ALWAYS** test actual behavior, not implementation details
- **PREFER** integration tests over unit tests for database operations
- **USE** test databases or Supabase local instance for DB tests
- **WRITE** failing test first (RED), then implement (GREEN), then refactor
- **VERIFY** tests are meaningful by asking: "What does this failure tell me?"

## Examples of Meaningful Tests to Reference

- ✅ `backend/utils/markdown-converter.test.ts` - Pure function testing
- ✅ `backend/services/multi-source-search.test.ts` - Service integration testing
- ✅ `backend/utils/duplication-analyzer.test.ts` - Complex logic testing
- ⚠️ `backend/lib/search-history-api.test.ts` - AVOID this pattern (too much mocking)
