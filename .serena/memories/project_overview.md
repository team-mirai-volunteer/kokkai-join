# Project Overview

## Purpose
kokkai-join is a web application that provides deep research capabilities using AI. It allows users to:
- Enter search queries
- Upload files for context
- Get AI-generated research results in markdown format

## Tech Stack
- **Framework**: React 19.1.1 with Vite (using rolldown-vite for faster builds)
- **Language**: TypeScript 5.8.3
- **Styling**: CSS with custom styles
- **Testing**: Vitest with @testing-library/react
- **Markdown**: react-markdown with remark-gfm for GitHub Flavored Markdown
- **Package Manager**: Bun (based on bun.lock file in repo)

## Repository Structure
- `frontend/` - React application with Vite
  - `src/`
    - `components/` - React components (FileUploadArea, FileListItem)
    - `hooks/` - Custom hooks (useFileUpload, useLocalStorageCache)
    - `utils/` - Utility functions (fileValidation, fileEncoder)
    - `types/` - TypeScript type definitions
    - `test/` - Test setup
    - `assets/` - Static assets
- `backend/` - Backend directory (not yet implemented)
- `tools/` - Tools directory (not yet implemented)

## Key Features
- File upload with drag-and-drop support
- LocalStorage caching of search results
- Base64 file encoding for API submission
- Real-time markdown rendering
- File validation (size, type, count limits)
