import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";
import type { SearchProvider } from "./base.ts";

/**
 * Provider for accessing Kokkai RAG API
 * Connects to the Kokkai RAG service that performs vector search on parliamentary records
 */
export class KokkaiRagProvider implements SearchProvider {
  readonly id = "kokkai-db";
  private endpoint: string;

  constructor({ endpoint }: { endpoint: string }) {
    this.endpoint = endpoint;
  }

  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30000); // タイムアウトを30秒に延長
    try {
      const body = JSON.stringify({
        query: q.query,
        limit: q.limit,
      });
      const resp = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}, Details: ${await resp.text()}`);
      }
      const { results }: { results: DocumentResult[] } = await resp.json();
      return results;
    } finally {
      clearTimeout(t);
    }
  }
}
