# Task Completion Checklist

When a task is completed, run the following commands in order:

## 1. Run Tests
```bash
cd frontend
bun test
```
Ensure all tests pass before proceeding.

## 2. Run Linting
```bash
cd frontend
bun run lint
```
Fix any linting errors or warnings.

## 3. Type Check
```bash
cd frontend
bun run build
```
The build command includes `tsc -b` which performs type checking.
Ensure no TypeScript errors exist.

## 4. Manual Testing
- Test the feature in the browser with `bun dev`
- Verify the UI works as expected
- Check responsive design if applicable
- Test edge cases

## 5. Git Commit
Only commit when:
- All tests pass
- No linting errors
- No TypeScript errors
- Manual testing confirms functionality

## Quality Standards
- **Type Safety**: No type assertions (`as`) unless absolutely necessary
- **Test Coverage**: Write tests for new features and bug fixes
- **Code Comments**: Explain complex logic and business rules
- **Clean Code**: Self-documenting code with clear naming
