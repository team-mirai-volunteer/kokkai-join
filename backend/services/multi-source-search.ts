import type { ProviderQuery, DocumentResult } from "../types/knowledge.ts";
import type { SearchProvider } from "../providers/base.ts";

export class MultiSourceSearchService {
  async searchAcross(providers: SearchProvider[], query: ProviderQuery): Promise<DocumentResult[]> {
    const tasks = providers.map(async (p) => {
      try {
        const results = await p.search(query);
        return results.map((r) => ({ ...r, source: r.source ?? { providerId: p.id, type: p.id } }));
      } catch (e) {
        console.error(`Provider ${p.id} failed:`, (e as Error).message);
        return [] as DocumentResult[];
      }
    });
    const arrays = await Promise.all(tasks);
    const merged = arrays.flat();
    // 重複排除: 優先 URL、なければ id
    const seen = new Set<string>();
    const unique: DocumentResult[] = [];
    for (const d of merged) {
      const key = d.url || `${d.source.providerId}:${d.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(d);
    }
    // スコアがある場合は降順
    unique.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return unique;
  }
}

