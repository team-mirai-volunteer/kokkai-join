# Task Completion Checklist

When a task is completed, the following steps should be performed:

## 1. Type Checking
```bash
npm run type-check
```
- Ensure no TypeScript errors
- Fix any type issues before proceeding

## 2. Testing
```bash
npm test
```
- All tests must pass
- Add new tests for new functionality (TDD approach)
- Ensure no regression in existing tests

## 3. Code Quality (if applicable)
- Review code for clarity and maintainability
- Ensure proper error handling
- Check for potential performance issues

## 4. Documentation
- Update README.md if API or usage changes
- Update CLAUDE.md if architectural changes
- Add JSDoc comments for public APIs

## 5. Environment Variables
- Update .env.example if new variables are added
- Document new variables in README.md

## Commit Discipline
- Only commit when all tests pass
- Use clear commit messages with [STRUCTURAL] or [BEHAVIORAL] prefix
- Each commit should be a single logical unit of work
- Never commit work-in-progress code
