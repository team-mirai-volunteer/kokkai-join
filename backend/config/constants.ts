// Configuration constants for Kokkai RAG system

// Database Configuration
export const MAX_DB_CONNECTIONS = 10;

// Search Configuration
export const DEFAULT_TOP_K_RESULTS = 20;
export const STRUCTURED_FILTER_LIMIT = 1000;

// Vector Similarity Thresholds
export const VECTOR_SIMILARITY_THRESHOLD_STRUCTURED = 0.8;
export const VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY = 0.6;
export const VECTOR_SIMILARITY_THRESHOLD_FALLBACK = 0.7;

// Default Values
export const UNKNOWN_VALUE = "?";

export const ProviderID = {
  KokkaiDB: "kokkai-db",
  WebSearch: "openai-web",
  GovMeetingRag: "gov-meeting-rag",
} as const;

export type ProviderType = (typeof ProviderID)[keyof typeof ProviderID];
