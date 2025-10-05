# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022
- **Module System**: Node.js ESM (nodenext)
- **Strict Mode**: Enabled
- **noUncheckedIndexedAccess**: true (safer array/object access)
- **Type Imports**: Allowed (`allowImportingTsExtensions: true`)
- **Source Maps**: Enabled

## Naming Conventions
- **Services**: PascalCase with descriptive names (e.g., `VectorSearchService`, `QueryPlanningService`)
- **Files**: kebab-case (e.g., `vector-search.ts`, `query-planning.ts`)
- **Types/Interfaces**: PascalCase
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for configuration values

## Code Organization
- Co-locate test files with source files (e.g., `multi-source-search.test.ts` next to `multi-source-search.ts`)
- Use clear separation of concerns:
  - API layer in `lib/`
  - Business logic in `services/`
  - Data access in `providers/`
  - Validation in `schemas/`

## Patterns and Practices
- **Provider Registry Pattern**: Used for managing multiple search providers with a common interface
- **Service Layer Pattern**: Business logic separated from API concerns
- **Dependency Injection**: Services receive dependencies explicitly
- **Error Handling**: Comprehensive error boundaries at API level with graceful degradation
- **Type Safety**: No type assertions (`as`), prefer type guards and explicit types

## Testing
- Test files: `*.test.ts` naming convention
- Use Vitest for unit and integration testing
- Tests should be independent and focused
- Follow TDD methodology (Red-Green-Refactor)
