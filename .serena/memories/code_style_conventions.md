# Code Style and Conventions

## TypeScript
- Strict TypeScript enabled
- Interface definitions for all data structures
- Type inference preferred where appropriate
- No explicit `any` types

## React Conventions
- Functional components with hooks
- Custom hooks for reusable logic (prefix with `use`)
- Component files use PascalCase (e.g., `FileUploadArea.tsx`)
- Props destructuring in function parameters

## Naming Conventions
- **Components**: PascalCase (e.g., `FileUploadArea`)
- **Files**: 
  - Components: PascalCase.tsx (e.g., `FileListItem.tsx`)
  - Hooks: camelCase.ts with `use` prefix (e.g., `useFileUpload.ts`)
  - Utils: camelCase.ts (e.g., `fileValidation.ts`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for global constants
- **CSS Classes**: kebab-case (e.g., `app-container`, `search-form`)

## File Organization
- Component-specific CSS in separate files with same name
- Test files colocated with source: `fileName.test.ts`
- Custom hooks in `hooks/` directory
- Utility functions in `utils/` directory
- Type definitions in `types/` directory

## ESLint Configuration
- Based on @eslint/js recommended
- TypeScript ESLint recommended rules
- React Hooks recommended rules
- React Refresh plugin for Vite

## Import Order
1. External libraries (React, etc.)
2. Internal utilities/hooks
3. CSS imports

## Comments
- Japanese comments preferred (based on existing code)
- Use JSDoc for complex functions
- Explain "why" not "what"
