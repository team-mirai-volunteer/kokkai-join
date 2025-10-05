# Project Overview

## Purpose
国会議事録深層調査システムのバックエンドAPI実装。国会議事録を深層調査・分析するRESTful APIを提供する。

## Main Features
- **Deep Research API (port 8000)**: AI-powered comprehensive search with query planning, multi-source integration, section synthesis, and answer generation
- **Vector Search**: PostgreSQL with pgvector extension for similarity search
- **AI Analysis**: OpenAI API for query planning and section synthesis

## Tech Stack
- **Runtime**: Node.js with TypeScript (using tsx for execution)
- **Web Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with pgvector extension
- **Embedding Model**: Ollama with bge-m3 or Novita (configurable via environment variables)
- **LLM**: OpenAI for query planning and section synthesis
- **Vector Search**: LlamaIndex for embedding management
- **Testing**: Vitest for unit and integration testing
- **Deployment**: Vercel Functions compatible

## Project Structure
```
backend/
├── lib/           # API implementation (Hono-based)
├── services/      # Core business logic services
├── providers/     # Search provider implementations
├── schemas/       # Data validation schemas
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── config/        # Configuration files
├── scripts/       # Development and testing scripts
└── server.ts      # Application entry point
```

## Key Services
- `vector-search.ts`: Core vector similarity search with pgvector
- `query-planning.ts`: AI-powered query decomposition via OpenAI LLMs
- `section-synthesis.ts`: Comprehensive answer synthesis with section-based structure
- `deepresearch-orchestrator.ts`: Orchestrates the entire deep research pipeline
- `multi-source-search.ts`: Coordinated search across multiple providers

## Database Schema
- **kokkai_speech_embeddings**: Stores parliamentary speeches with 1024-dimensional embeddings for similarity search
  - Core fields: speech_id, speaker, date, meeting_name, speech_text, speech_url
  - Metadata: speaker_group, speaker_role, issue_area, political_party, etc.
