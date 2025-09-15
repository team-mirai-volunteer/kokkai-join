// Normalized document types for multi-source RAG

export interface DocumentSource {
  providerId: string; // e.g., "kokkai-db"
  type: string; // e.g., "kokkai-db", "web-rag"
}

export interface DocumentResult {
  id: string;
  title?: string;
  content: string;
  url?: string;
  date?: string;
  author?: string;
  score?: number;
  source: DocumentSource;
  extras?: Record<string, unknown>;
}

export interface ProviderQuery {
  originalQuestion: string;
  subqueries: string[];
  limit: number;
  // Optional structured fields left generic for now
  // entities?: { speakers?: string[]; parties?: string[]; dateRange?: { start: string; end: string } };
  seedUrls?: string[]; // Optional seed URLs for HttpDocsProvider
}
