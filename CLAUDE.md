# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is the **kokkai-join** project, a monorepo containing a Next.js frontend application with a planned backend directory. The project appears to be in early development stages with a standard Next.js setup.

### Repository Structure
- `frontend/` - Next.js 15.4.6 application with React 19.1.0
- `backend/` - (Currently empty, likely for future API development)
- `tools/` - (Currently empty, likely for development utilities)

### Frontend Technology Stack
- **Framework**: Next.js 15.4.6 with App Router
- **React**: Version 19.1.0 
- **TypeScript**: Full TypeScript support with strict configuration
- **Styling**: Tailwind CSS v4 with PostCSS
- **Package Manager**: Bun (evidenced by bun.lock file)
- **Build Tool**: Turbopack (enabled in dev script)
- **Fonts**: Geist Sans and Geist Mono from Google Fonts

## Common Development Commands

All commands should be run from the `frontend/` directory:

### Development
```bash
cd frontend
bun dev              # Start development server with Turbopack
```

### Build and Production
```bash
cd frontend
bun run build        # Build for production
bun run start        # Start production server
```

### Code Quality
```bash
cd frontend
bun run lint         # Run ESLint via Next.js
```

### Package Management
```bash
cd frontend
bun install          # Install dependencies
bun add <package>    # Add new dependency
bun add -d <package> # Add development dependency
```

## TypeScript Configuration

The project uses strict TypeScript settings:
- Target: ES2017
- Strict mode enabled
- Path aliases: `@/*` maps to `./src/*`
- Next.js TypeScript plugin enabled

## Development Notes

### Frontend Structure
- Uses Next.js App Router architecture
- Main application code in `frontend/src/app/`
- Current pages: Root layout (`layout.tsx`) and home page (`page.tsx`)
- Tailwind CSS for styling with custom CSS variables for theming
- Font optimization using `next/font/google`

### Project Status
This appears to be a fresh Next.js project created with `create-next-app`. The backend directory exists but is currently empty, suggesting this will be a full-stack application.

### Development Server
- Runs on http://localhost:3000 by default
- Uses Turbopack for faster development builds
- Hot reload enabled for immediate feedback

## Architecture Considerations

Since this is a monorepo structure with separate frontend and backend directories, future development should maintain clear separation between client and server code. The empty backend directory suggests plans for a Node.js/Express API or similar backend implementation.

## Coding Best Practices

### TypeScript and Prisma Type Inference

このプロジェクトでは、Prismaの自動生成型とTypeScriptの型推論を最大限活用して、型定義の重複を避けています：

1. **Prismaの型推論を使用**
   ```typescript
   // includeオプションから型を自動生成
   export type MeetingWithSpeeches = Prisma.MeetingGetPayload<{
     include: {
       speeches: {
         include: { speaker: true }
       }
     }
   }>
   ```

2. **関数の戻り値から型を推論**
   ```typescript
   // 関数の戻り値から型を推論
   export type MeetingListItem = Awaited<ReturnType<typeof getRecentMeetingsFromDB>>[number]
   ```

3. **型アノテーションを最小限に**
   - Prismaクエリの戻り値は自動的に型が付くため、明示的な型アノテーションは不要
   - エラーハンドリング時のみ必要に応じて型を指定

この方式により、型定義の重複を避け、Prismaスキーマが更新されても自動的に型が同期されます。