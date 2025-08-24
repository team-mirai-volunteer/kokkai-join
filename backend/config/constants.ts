// Configuration constants for Kokkai RAG system

// Ollama Configuration
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const EMBEDDING_MODEL_NAME = "bge-m3";
export const LLM_MODEL_NAME = "gpt-oss:20b";

// Database Configuration
export const MAX_DB_CONNECTIONS = 10;

// Search Configuration
export const DEFAULT_TOP_K_RESULTS = 20;
export const STRUCTURED_FILTER_LIMIT = 1000;

// Vector Similarity Thresholds
export const VECTOR_SIMILARITY_THRESHOLD_STRUCTURED = 0.8;
export const VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY = 0.6;
export const VECTOR_SIMILARITY_THRESHOLD_FALLBACK = 0.7;

// Chain of Agents Configuration
export const CHAIN_OF_AGENTS_CHUNK_SIZE = 3;
export const CHAIN_OF_AGENTS_MIN_RESULTS = 3;
export const MID_CONSOLIDATION_CHUNK_SIZE = 3;
export const MID_CONSOLIDATION_THRESHOLD = 5;

// Display Configuration
export const CONTENT_PREVIEW_LENGTH = 300;

// Default Values
export const UNKNOWN_VALUE = "?";
export const DEFAULT_DATE_VALUE = "2024-01-01";
