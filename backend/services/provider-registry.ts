import { KokkaiRagProvider } from "../providers/kokkai-rag.ts";
import type { SearchProvider } from "../providers/base.ts";
import { OpenAIWebProvider } from "../providers/websearch.ts";
import { ensureEnv } from "../utils/env.ts";

export class ProviderRegistry {
  private providers: SearchProvider[] = [];

  constructor() {
    // Kokkai RAG Provider: 国会議事録のベクトル検索API
    this.providers.push(new KokkaiRagProvider({ endpoint: ensureEnv("KOKKAI_RAG_URL") }));
    // OpenAI Web Search（前提: OPENAI_API_KEY が必須）
    this.providers.push(
      new OpenAIWebProvider({
        apiKey: ensureEnv("OPENAI_API_KEY"),
        model: ensureEnv("OPENAI_MODEL"),
      }),
    );
  }

  byIds(ids?: string[]): SearchProvider[] {
    if (!ids || ids.length === 0) return this.providers;
    const set = new Set(ids);
    return this.providers.filter((p) => set.has(p.id));
  }
}
