import { Pool } from "pg";
import type { DocumentResult, ProviderQuery } from "../types/knowledge.js";
import type { SearchProvider } from "./base.js";
import type { SpeechResult } from "../types/kokkai.js";
import { VectorSearchService } from "../services/vector-search.js";
import { ensureEnv } from "../utils/env.js";
import { DEFAULT_TOP_K_RESULTS, MAX_DB_CONNECTIONS } from "../config/constants.js";

/**
 * Convert SpeechResult to DocumentResult for unified response format
 */
function mapSpeechToDocument(r: SpeechResult): DocumentResult {
  return {
    id: r.speechId,
    title: r.meeting || undefined,
    content: r.content,
    url: r.url || undefined,
    date: r.date || undefined,
    author: r.speaker ? `${r.speaker} (${r.party})` : undefined,
    score: r.score,
    source: { providerId: "kokkai-db", type: "kokkai-db" },
    extras: {
      speaker: r.speaker,
      party: r.party,
      meeting: r.meeting,
    },
  };
}

/**
 * Provider for direct access to Kokkai database
 * Performs vector search on parliamentary records without HTTP overhead
 */
export class KokkaiRagProvider implements SearchProvider {
  readonly id = "kokkai-db";
  private dbPool: Pool;
  private vectorSearch: VectorSearchService;

  constructor() {
    const databaseUrl = ensureEnv("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    this.dbPool = new Pool({
      connectionString: databaseUrl,
      max: MAX_DB_CONNECTIONS,
      query_timeout: 25000,
      statement_timeout: 25000,
    });

    this.vectorSearch = new VectorSearchService(this.dbPool);
  }

  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    const speeches = await this.vectorSearch.simpleSearch(
      q.query,
      q.limit || DEFAULT_TOP_K_RESULTS,
    );

    return speeches.map(mapSpeechToDocument);
  }

  async close() {
    await this.dbPool.end();
  }
}
