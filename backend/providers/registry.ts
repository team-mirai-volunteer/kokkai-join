import { KokkaiRagProvider } from "../providers/kokkai-rag.js";
import type { SearchProvider } from "../providers/base.js";
import { OpenAIWebProvider } from "../providers/websearch.js";

export class ProviderRegistry {
  private providers: SearchProvider[] = [];

  constructor() {
    // Kokkai RAG Provider: 国会議事録のベクトル検索
    this.providers.push(new KokkaiRagProvider());

    // OpenAI Web Search
    this.providers.push(new OpenAIWebProvider());
  }

  byIds(ids?: string[]): SearchProvider[] {
    if (!ids || ids.length === 0) return this.providers;
    const set = new Set(ids);
    return this.providers.filter((p) => set.has(p.id));
  }
}
