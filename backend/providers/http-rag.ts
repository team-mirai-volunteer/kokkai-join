import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";
import type { SearchProvider } from "./base.ts";

interface HttpRagConfig {
  id: string;
  endpoint: string; // POST endpoint that accepts { query, limit }
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class HttpRagProvider implements SearchProvider {
  id: string;
  private endpoint: string;
  private timeoutMs: number;
  private headers: Record<string, string>;

  constructor(cfg: HttpRagConfig) {
    this.id = cfg.id;
    this.endpoint = cfg.endpoint;
    this.timeoutMs = cfg.timeoutMs ?? 15000;
    this.headers = { "Content-Type": "application/json", ...(cfg.headers ?? {}) };
  }

  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const body = JSON.stringify({ query: q.originalQuestion, limit: q.limit });
      const resp = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body,
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      // Expect shape: { results: DocumentResult[] }
      const docs: DocumentResult[] = data?.results ?? [];
      return docs.map((d) => ({
        ...d,
        source: d.source ?? { providerId: this.id, type: this.id },
      }));
    } finally {
      clearTimeout(t);
    }
  }
}
