# Frontend Testing Skill

## Description
Specialized agent for implementing meaningful tests in the React frontend following TDD principles and Testing Library best practices.

## Context
- Project: kokkai-join frontend (React 19, TypeScript, Vite, React Router, Supabase)
- Testing framework: Vitest + React Testing Library
- State management: React Context API (AuthContext)
- Routing: React Router
- Focus: Testing user behavior and component interactions

## When to Use This Skill
- Implementing new React components or features
- Writing tests for existing untested components
- Refactoring tests that rely on implementation details
- Adding integration tests for user flows

## Testing Principles (MUST FOLLOW)

### 1. TDD Approach is MANDATORY
- RED: Write a failing test first
- GREEN: Write minimum code to pass
- REFACTOR: Improve code quality

### 2. Testing Library Philosophy

**Guiding Principle**: "The more your tests resemble the way your software is used, the more confidence they can give you."

#### ✅ GOOD Tests
- Test from the user's perspective
- Query elements by accessible roles, labels, text
- Test behavior and interactions, not implementation
- Avoid testing internal state or methods
- Use `userEvent` for realistic interactions

#### ❌ BAD Tests
- Test implementation details (CSS classes, internal state)
- Query by test IDs excessively
- Mock everything (contexts, hooks, components)
- Test component internal methods
- Rely on component structure/nesting

### 3. Test Types and Guidelines

#### Component Tests
- **Purpose**: Test individual components in isolation
- **Good examples**: `SearchForm.test.tsx`, `HistoryDetailPage.test.tsx`
- **What to test**: User interactions, conditional rendering, prop handling, error states
- **What NOT to test**: CSS classes, internal state variables, component lifecycle details

#### Integration Tests
- **Purpose**: Test multiple components working together
- **What to test**: User flows, navigation, data passing between components
- **What to mock**: External APIs, authentication services

#### Page Tests
- **Purpose**: Test entire page behavior
- **What to test**: Data loading, error handling, navigation, user scenarios
- **Mock strategically**: API calls, auth state (not routing/components)

### 4. Specific Rules for This Project

#### General Rules
**❌ NEVER USE DYNAMIC IMPORTS IN TESTS**:
```typescript
// BAD: Dynamic imports are prohibited
const fs = await import("node:fs")
const path = await import("node:path")

// GOOD: Use static imports at the top of the file
import { readFileSync } from "node:fs"
import { join } from "node:path"
```

**✅ FIXTURE FILES**:
- Place test data files in `frontend/fixtures/` directory
- Use static imports to read fixture files
- Example: `readFileSync(join(process.cwd(), "fixtures", "chunks.txt"), "utf-8")`

**✅ TEST EXECUTION**:
- Always use `npm test` to run frontend tests
- Do NOT use `bun test` - it will not work correctly

#### When Testing Components with Routing
**✅ DO THIS**:
```typescript
import { MemoryRouter, Route, Routes } from "react-router-dom"

render(
  <MemoryRouter initialEntries={["/histories/test-id"]}>
    <Routes>
      <Route path="/histories/:id" element={<HistoryDetailPage />} />
    </Routes>
  </MemoryRouter>
)
```

**❌ DON'T DO THIS**:
```typescript
// Bad: Mocking useNavigate and testing mock calls
const mockNavigate = vi.fn()
vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }))
expect(mockNavigate).toHaveBeenCalledWith("/path")
```

**BETTER**: Test actual navigation by checking rendered content after interaction.

#### When Testing Components with Auth Context
**✅ GOOD APPROACH**:
```typescript
// Mock auth context with realistic values
vi.mock("@/features/auth/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    signOut: vi.fn(),
    loading: false
  })
}))

// Then test component behavior
const logoutButton = screen.getByRole("button", { name: "ログアウト" })
await user.click(logoutButton)
// Verify what happens after logout (navigation, state change, etc.)
```

**❌ AVOID**:
```typescript
// Bad: Testing CSS classes or implementation details
expect(container.querySelector(".auth-header")).toBeInTheDocument()
expect(button).toHaveClass("submit-button")
```

#### When Testing API Interactions
**✅ GOOD APPROACH**:
```typescript
// Mock fetch at the global level
const mockFetch = vi.fn()
global.fetch = mockFetch

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: mockData })
})

render(<MyComponent />)

await waitFor(() => {
  expect(screen.getByText(/Expected content from API/)).toBeInTheDocument()
})
```

**❌ AVOID**:
```typescript
// Bad: Mocking Supabase client internals
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({...})
    })
  }
}))
```

### 5. Query Priority (Testing Library Best Practices)

Use queries in this order of preference:

1. **Accessible to everyone** (BEST):
   - `getByRole`: `screen.getByRole("button", { name: "検索" })`
   - `getByLabelText`: `screen.getByLabelText("Email")`
   - `getByPlaceholderText`: `screen.getByPlaceholderText("検索キーワードを入力")`
   - `getByText`: `screen.getByText("読み込み中...")`

2. **Semantic queries**:
   - `getByAltText`: For images
   - `getByTitle`: For elements with title attribute

3. **Test IDs** (LAST RESORT):
   - `getByTestId`: Only when other queries are impractical
   - Avoid in favor of accessible queries

### 6. Common Patterns

#### Testing User Interactions
```typescript
import userEvent from "@testing-library/user-event"

it("should submit form when user fills input and clicks submit", async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  render(<SearchForm onSubmit={onSubmit} />)

  const input = screen.getByPlaceholderText(/検索キーワードを入力/)
  const submitButton = screen.getByRole("button", { name: "検索" })

  await user.type(input, "防衛費")
  await user.click(submitButton)

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ query: "防衛費" })
    )
  })
})
```

#### Testing Loading States
```typescript
it("should display loading state initially", () => {
  mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

  render(<MyComponent />)

  expect(screen.getByText("読み込み中...")).toBeInTheDocument()
})

it("should display data after loading", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockData
  })

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
  })

  expect(screen.getByText(/Expected data/)).toBeInTheDocument()
})
```

#### Testing Error States
```typescript
it("should display error message on API failure", async () => {
  mockFetch.mockRejectedValueOnce(new Error("Network error"))

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText("Network error")).toBeInTheDocument()
  })
})

it("should display error for 404 response", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    json: async () => ({ message: "Not found" })
  })

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText("Not found")).toBeInTheDocument()
  })
})
```

#### Testing Conditional Rendering
```typescript
it("should show login button when user is not authenticated", () => {
  vi.mock("@/features/auth/contexts/AuthContext", () => ({
    useAuth: () => ({ user: null, loading: false })
  }))

  render(<Header />)

  expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument()
})
```

#### Testing Navigation
```typescript
it("should navigate to history detail page when item is clicked", async () => {
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={["/histories"]}>
      <Routes>
        <Route path="/histories" element={<HistoryListPage />} />
        <Route path="/histories/:id" element={<HistoryDetailPage />} />
      </Routes>
    </MemoryRouter>
  )

  const historyItem = screen.getByText("テスト検索クエリ")
  await user.click(historyItem)

  // Verify navigation by checking if detail page content is rendered
  await waitFor(() => {
    expect(screen.getByText(/検索日時:/)).toBeInTheDocument()
  })
})
```

### 7. Error Cases to Avoid

#### ❌ Testing Implementation Details
```typescript
// BAD: Testing internal state
expect(component.state.isLoading).toBe(true)

// BAD: Testing CSS classes
expect(button).toHaveClass("submit-button")

// BAD: Using container.querySelector
expect(container.querySelector(".auth-header")).toBeInTheDocument()
```

#### ❌ Mocking Too Much
```typescript
// BAD: Mocking React Router when you should test actual routing
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/test" })
}))

// BETTER: Use MemoryRouter and test actual navigation
```

#### ❌ Vague Assertions
```typescript
// BAD: Doesn't verify what's actually rendered
expect(screen.getByText(/./)).toBeInTheDocument()

// BETTER: Test specific content
expect(screen.getByText("検索結果がありません")).toBeInTheDocument()
```

## Implementation Workflow

### Step 1: Analyze Requirements
- Understand the user interaction or feature
- Identify what the user should see/do
- Determine component dependencies (routing, auth, APIs)

### Step 2: Write Failing Test (RED)
- Write test describing user behavior
- Use accessible queries (role, label, text)
- Run test to confirm it fails
- Ensure failure message is clear

### Step 3: Implement Minimum Code (GREEN)
- Write simplest code to make test pass
- Don't over-engineer UI or logic
- Run test to confirm it passes

### Step 4: Refactor (if needed)
- Improve component structure
- Extract reusable logic
- Ensure all tests still pass

### Step 5: Add Edge Cases
- Test loading states
- Test error states
- Test empty states
- Test disabled states
- Test form validation

### Step 6: Verify Test Quality
- Ask: "Does this test describe user behavior?"
- Ask: "Can I refactor component without breaking this test?"
- Ask: "Would this test catch real bugs?"

## Test Setup Utilities

### Mock localStorage
```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true
})
```

### Mock global fetch
```typescript
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})
```

### Mock Supabase Auth
```typescript
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null
      })
    }
  }
}))
```

## Output Format

When implementing tests, provide:
1. **Test file path**: Where the test should be created
2. **Test description**: What user behavior is being tested
3. **Test code**: Following Testing Library best practices
4. **Run instructions**: How to run the test
5. **Explanation**: Why this test is meaningful and user-focused

## Important Reminders

- **TEST** user behavior, not implementation details
- **QUERY** by role/label/text, not CSS classes or test IDs
- **USE** `userEvent` for realistic user interactions
- **MOCK** strategically (APIs, auth), not everything (routing, components)
- **WAIT** for async changes with `waitFor`
- **WRITE** failing test first (RED), then implement (GREEN), then refactor
- **VERIFY** tests describe what users do, not how code works

## Examples of Meaningful Tests to Reference

- ✅ `frontend/src/features/search/components/SearchForm.test.tsx` - User interaction testing
- ✅ `frontend/src/features/history/pages/HistoryDetailPage.test.tsx` - Page behavior testing
- ⚠️ `frontend/src/shared/components/AppHeader.test.tsx` - AVOID CSS class testing pattern

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Library Queries Cheatsheet](https://testing-library.com/docs/queries/about#priority)
