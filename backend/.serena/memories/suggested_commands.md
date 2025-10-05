# Suggested Commands

## Development
```bash
# Start development server with watch mode
npm run dev

# Start production server
npm run start

# Type checking
npm run type-check

# API testing
npm run test-api
```

## Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Database
```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Stop database
docker compose down
```

## Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Required environment variables:
# - DATABASE_URL: PostgreSQL connection string
# - OPENAI_API_KEY: Required for AI features
# - EMBEDDING_PROVIDER: "ollama" or "novita" (default: ollama)
# - EMBEDDING_API_KEY: For Novita embedding provider
# - EMBEDDING_MODEL: e.g., "baai/bge-m3"
# - EMBEDDING_BASE_URL: For Novita API
# - OLLAMA_BASE_URL: For Ollama (default: http://localhost:11434)
# - OLLAMA_EMBEDDING_MODEL: e.g., "bge-m3"
# - PORT: Server port (default: 8000)
```

## System-specific Notes (macOS)
- Standard Unix commands available: `ls`, `cd`, `grep`, `find`, `git`
- Package manager: npm
- Shell: bash/zsh (standard macOS terminal)
