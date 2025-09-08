import { HttpRagProvider } from "../providers/http-rag.ts";
import type { SearchProvider } from "../providers/base.ts";

export class ProviderRegistry {
  private providers: SearchProvider[] = [];

  constructor() {
    // 最小構成: 環境変数から Kokkai RAG を登録
    const kokkaiUrl = Deno.env.get("KOKKAI_RAG_URL") || "http://localhost:8001/v1/search";
    this.providers.push(new HttpRagProvider({ id: "kokkai-db", endpoint: kokkaiUrl }));
  }

  all(): SearchProvider[] {
    return this.providers;
  }

  byIds(ids?: string[]): SearchProvider[] {
    if (!ids || ids.length === 0) return this.providers;
    const set = new Set(ids);
    return this.providers.filter((p) => set.has(p.id));
  }
}

