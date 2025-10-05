# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **kokkai-join backend**, a Node.js-based TypeScript application providing RAG (Retrieval-Augmented Generation) services for Japanese parliamentary records (Kokkai). The system provides a Deep Research API with AI-powered analysis capabilities.

- **Deep Research API** (port 8000): Advanced AI-powered search with query planning, multi-source integration, section synthesis, and answer generation

## Technology Stack

- **Runtime**: Node.js with TypeScript (using tsx for execution)
- **Web Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with pgvector extension (vector similarity search)
- **Embedding Model**: Ollama with bge-m3 or Novita (OpenAI-compatible) - configurable via environment variables
- **LLM**: OpenAI for query planning and section synthesis
- **Vector Search**: LlamaIndex for embedding management
- **Testing**: Vitest for unit and integration testing
- **Deployment**: Vercel Functions compatible

## Common Development Commands

### Environment Setup

```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with required values:
# DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
# OPENAI_API_KEY=<your-api-key>
# EMBEDDING_PROVIDER=novita  # or "ollama"
# EMBEDDING_API_KEY=<your-embedding-api-key>  # for novita
# EMBEDDING_MODEL=baai/bge-m3
# EMBEDDING_BASE_URL=https://api.novita.ai/openai
# OLLAMA_BASE_URL=http://localhost:11434  # for ollama
# OLLAMA_EMBEDDING_MODEL=bge-m3
```

### Running the Server

```bash
# Development mode with watch
npm run dev

# Production mode
npm run start

# API test
npm run test-api
```

### Code Quality

```bash
# Type checking
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Architecture & Code Structure

### Core Architecture

The backend implements a layered architecture with clear separation of concerns:

1. **Entry Point**
   - `server.ts`: Application entry point that initializes and serves the API

2. **API Layer** (`lib/`)
   - `deepresearch-api.ts`: Hono-based API implementation with middleware, routes, and orchestration logic

3. **Service Layer** (`services/`)
   - `vector-search.ts`: Core vector similarity search with pgvector
   - `query-planning.ts`: AI-powered query decomposition via OpenAI LLMs
   - `section-synthesis.ts`: Comprehensive answer synthesis with section-based structure
   - `deepresearch-orchestrator.ts`: Orchestrates the entire deep research pipeline
   - `multi-source-search.ts`: Coordinated search across multiple providers

4. **Provider System** (`providers/`)
   - `base.ts`: Abstract provider interface for extensibility
   - `kokkai-rag.ts`: Direct database provider implementation for Kokkai parliamentary records
   - `websearch.ts`: OpenAI web search provider for external information
   - `registry.ts`: Provider registry for managing multiple search sources
   - `embedding.ts`: Embedding provider abstraction (Ollama and Novita support)

### Database Schema

The system uses PostgreSQL with a single main table:

- **kokkai_speech_embeddings**: Stores parliamentary speeches with embeddings
  - Core fields: speech_id, speaker, date, meeting_name, speech_text, speech_url
  - Embedding: 1024-dimensional vector for similarity search
  - Metadata: speaker_group, speaker_role, issue_area, political_party, etc.

### AI Processing Pipeline (Deep Research API)

The system uses a sophisticated multi-stage pipeline:

1. **Query Planning**: Decomposes complex queries into focused subqueries using OpenAI
2. **Multi-Source Search**: Executes searches across registered providers (Kokkai DB, Web Search)
3. **Section Synthesis**: Synthesizes results into structured sections with citations
4. **Orchestration**: Coordinates the entire pipeline with error handling and result aggregation

### Environment Variables

Required configuration in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Required for AI features (query planning, section synthesis)
- `EMBEDDING_PROVIDER`: Embedding provider type (`ollama` or `novita`, default: `ollama`)
- `EMBEDDING_API_KEY`: API key for Novita embedding provider (when using `novita`)
- `EMBEDDING_MODEL`: Embedding model name (e.g., `baai/bge-m3`)
- `EMBEDDING_BASE_URL`: Base URL for Novita API (when using `novita`)
- `OLLAMA_BASE_URL`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_EMBEDDING_MODEL`: Ollama embedding model name (e.g., `bge-m3`)
- `PORT`: Server port (default: 8000)

## API Endpoints

### Deep Research API (port 8000)

- `GET /`: API information and status
- `POST /api/v1/deepresearch`: AI-powered comprehensive search returning sections, evidences, and metadata
  ```json
  {
    "query": "防衛費と子育て支援の関係",
    "limit": 10,
    "providers": ["kokkai-db", "openai-web"],
    "asOfDate": "2025-09-01",
    "seedUrls": ["https://example.com/document.pdf"]
  }
  ```

**Response structure:**
```json
{
  "query": "防衛費と子育て支援の関係",
  "sections": {
    "purpose_overview": {
      "summary": "...",
      "citations": ["e1", "e2"]
    },
    "timeline": {
      "summary": "...",
      "citations": ["e3"]
    }
  },
  "evidences": [
    {
      "id": "e1",
      "title": "...",
      "url": "...",
      "source": { "providerId": "kokkai-db" }
    }
  ],
  "metadata": {
    "usedProviders": ["kokkai-db"],
    "totalResults": 15,
    "timestamp": "2025-10-05T...",
    "version": "deepresearch-v1"
  }
}
```

## Key Implementation Details

### Vector Search Configuration

- Embedding model: bge-m3 (1024 dimensions)
- Default similarity threshold: 0.6
- Batch processing size: 10-20 for optimal performance
- Index type: HNSW for efficient similarity search

### Provider Registry Pattern

The system uses a registry pattern for managing multiple search providers:

- Providers implement a common interface (`SearchProvider`)
- Registry manages provider lifecycle and routing
- Currently supports:
  - **kokkai-db**: Direct PostgreSQL database provider for parliamentary records
  - **openai-web**: OpenAI web search provider for external information
- Embedding providers support both Ollama (local) and Novita (cloud) services

### Error Handling

- Comprehensive error boundaries at API level
- Graceful degradation when AI services unavailable
- Detailed logging for debugging with structured messages

## Testing Approach

The project uses Vitest for testing:

- Test files follow `*.test.ts` naming convention
- Run all tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run tests with UI: `npm run test:ui`
- Test files are colocated with source files in `services/` directory

## Performance Considerations

- Database contains millions of speech records (GB-scale)
- Embedding generation is compute-intensive (use batch processing)
- Vector search optimized with pgvector indexes
- AI operations cached where appropriate to reduce API calls

## Deployment Notes

- The system is designed for deployment on Vercel Functions
- Vercel configuration in `vercel.json` sets function timeout to 300s and memory to 1024MB
- PostgreSQL with pgvector extension is mandatory
- Choose between Ollama (local) or Novita (cloud) for embeddings via `EMBEDDING_PROVIDER`
- OpenAI API key required for AI features (query planning and section synthesis)
- All necessary environment variables must be configured in deployment environment
