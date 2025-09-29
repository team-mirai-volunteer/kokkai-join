import { KokkaiRagProvider } from "../providers/kokkai-rag.ts";
import type { SearchProvider } from "../providers/base.ts";
import { OpenAIWebProvider } from "../providers/websearch.ts";
import { ensureEnv } from "../utils/env.ts";

export class ProviderRegistry {
  private providers: SearchProvider[] = [];

  constructor() {
    // Kokkai RAG Provider: 国会議事録のベクトル検索API
    this.providers.push(new KokkaiRagProvider({ endpoint: ensureEnv("KOKKAI_RAG_URL") }));

    // OpenAI Web Search
    this.providers.push(new OpenAIWebProvider());
  }

  byIds(ids?: string[]): SearchProvider[] {
    if (!ids || ids.length === 0) return this.providers;
    const set = new Set(ids);
    return this.providers.filter((p) => set.has(p.id));
  }
}
