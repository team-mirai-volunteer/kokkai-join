# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **kokkai-join backend**, a Deno-based TypeScript application providing RAG (Retrieval-Augmented Generation) services for Japanese parliamentary records (Kokkai). The system offers two distinct APIs:
- **Kokkai RAG API** (port 8001): Direct vector search without AI processing
- **Deep Research API** (port 8000): Advanced AI-powered search with query planning, multi-source integration, and answer generation

## Technology Stack

- **Runtime**: Deno 1.45+ (TypeScript/JavaScript runtime)
- **Web Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with pgvector extension (vector similarity search)
- **Embedding Model**: Ollama with bge-m3 (1024-dimensional embeddings)
- **LLM**: Cerebras API for query planning and answer generation
- **Vector Search**: LlamaIndex for embedding management

## Common Development Commands

### Environment Setup
```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Configure environment variables
cp .env.example .env
# Edit .env with required values:
# DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
# CEREBRAS_API_KEY=<your-api-key>
# OLLAMA_BASE_URL=http://localhost:11434
```

### Data Processing
```bash
# Generate embeddings for speeches (small test batch)
deno run -A scripts/persistent-embed-speeches.ts --limit 100

# Generate embeddings with date range
deno run -A scripts/persistent-embed-speeches.ts --batch-size 20 --start-date 2023-01-01

# Create database backup
deno run -A scripts/dump-db.ts

# Interactive CLI search
deno task rag
```

### Running APIs
```bash
# Kokkai RAG API (simple vector search)
deno run -A api/kokkai_rag.ts
# Test: curl http://localhost:8001/v1/health

# Deep Research API (AI-powered search)
export KOKKAI_RAG_URL=http://localhost:8001/v1/search
deno run -A api/server.ts
# Test: curl http://localhost:8000/
```

### Code Quality
```bash
# Type checking
deno check api/server.ts
deno check api/kokkai_rag.ts

# Format code
deno fmt

# Lint code
deno lint

# Run tests
deno test -A
```

## Architecture & Code Structure

### Core Services Architecture
The backend implements a layered architecture with clear separation of concerns:

1. **API Layer** (`api/`)
   - `server.ts`: Deep Research API with AI-powered processing pipeline
   - `kokkai_rag.ts`: Simple RAG API for direct vector search

2. **Service Layer** (`services/`)
   - `vector-search.ts`: Core vector similarity search with pgvector
   - `query-planning.ts`: AI-powered query decomposition using Cerebras
   - `answer-generation.ts`: Comprehensive answer synthesis from search results
   - `relevance-evaluation.ts`: Result filtering and ranking
   - `provider-registry.ts`: Multi-source provider management system
   - `multi-source-search.ts`: Coordinated search across multiple providers

3. **Provider System** (`providers/`)
   - `base.ts`: Abstract provider interface for extensibility
   - `kokkai-db.ts`: Direct database provider implementation
   - `http-rag.ts`: HTTP-based RAG provider for remote services
   - `adapter.ts`: Type conversion between different provider formats

### Database Schema
The system uses PostgreSQL with a single main table:
- **kokkai_speech_embeddings**: Stores parliamentary speeches with embeddings
  - Core fields: speech_id, speaker, date, meeting_name, speech_text, speech_url
  - Embedding: 1024-dimensional vector for similarity search
  - Metadata: speaker_group, speaker_role, issue_area, political_party, etc.

### AI Processing Pipeline (Deep Research API)
1. **Query Planning**: Decomposes complex queries into focused subqueries
2. **Multi-Source Search**: Executes searches across registered providers
3. **Relevance Evaluation**: Filters results using AI-based relevance scoring
4. **Answer Generation**: Synthesizes comprehensive responses with citations

### Environment Variables
Required configuration in `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `CEREBRAS_API_KEY`: Required for AI features (query planning, answer generation)
- `OLLAMA_BASE_URL`: Ollama server for embeddings (default: http://localhost:11434)
- `PORT`: Deep Research API port (default: 8000)
- `KOKKAI_RAG_PORT`: RAG API port (default: 8001)
- `KOKKAI_RAG_URL`: RAG service endpoint for Deep Research API

## API Endpoints

### Kokkai RAG API (port 8001)
- `GET /v1/health`: Health check endpoint
- `POST /v1/search`: Vector similarity search
  ```json
  {
    "query": "防衛費",
    "limit": 10,
    "filters": {
      "speaker": "岸田文雄",
      "date_from": "2023-01-01",
      "date_to": "2023-12-31"
    }
  }
  ```

### Deep Research API (port 8000)
- `GET /`: API information and status
- `POST /search`: AI-powered comprehensive search
  ```json
  {
    "query": "防衛費と子育て支援の関係",
    "limit": 10
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
- Currently supports HTTP-based and direct database providers

### Error Handling
- Comprehensive error boundaries at API level
- Graceful degradation when AI services unavailable
- Detailed logging for debugging with structured messages

## Testing Approach

The project uses Deno's built-in testing framework:
- Test files follow `*_test.ts` naming convention
- Run all tests: `deno test -A`
- Test specific file: `deno test -A path/to/file_test.ts`

## Performance Considerations

- Database contains millions of speech records (GB-scale)
- Embedding generation is compute-intensive (use batch processing)
- Vector search optimized with pgvector indexes
- AI operations cached where appropriate to reduce API calls

## Deployment Notes

- The system requires both Kokkai RAG API and Deep Research API running
- Deep Research API depends on Kokkai RAG API for data retrieval
- Ensure Ollama is running with bge-m3 model loaded
- PostgreSQL with pgvector extension is mandatory
- Cerebras API key required for AI features