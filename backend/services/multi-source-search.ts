import type { ProviderQuery, DocumentResult } from "../types/knowledge.ts";
import type { SearchProvider } from "../providers/base.ts";

/**
 * 複数プロバイダ横断検索サービス。
 *
 * - 各プロバイダに並行で問い合わせ → 結果をマージ
 * - URL もしくは provider:id で重複排除
 * - 近似重複の抑制 + MMR による多様性重視の再ランク
 */
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
    // MMRによる多様性重視の再ランク（λ=0.6）+ 近似重複の抑制
    const reranked = this.mmrRerank(unique, 0.6, query.limit ?? unique.length);
    return reranked;
  }

  /** 近似重複抑制 + 多様性確保の簡易MMR */
  private mmrRerank(docs: DocumentResult[], lambda: number, topN: number): DocumentResult[] {
    const cleaned = this.dropNearDuplicates(docs);
    if (cleaned.length <= 2) return cleaned;
    // base relevance from score (fallback 0.5)
    const rel = (d: DocumentResult) => (typeof d.score === "number" ? d.score : 0.5);
    const sim = (a: DocumentResult, b: DocumentResult) => jaccardSim(textOf(a), textOf(b));
    const selected: DocumentResult[] = [];
    const candidates = [...cleaned];
    while (candidates.length && selected.length < topN) {
      let bestIdx = 0;
      let bestVal = -Infinity;
      for (let i = 0; i < candidates.length; i++) {
        const d = candidates[i];
        const diversityPenalty = selected.length
          ? Math.max(...selected.map((s) => sim(d, s)))
          : 0;
        const val = lambda * rel(d) - (1 - lambda) * diversityPenalty;
        if (val > bestVal) { bestVal = val; bestIdx = i; }
      }
      selected.push(candidates.splice(bestIdx, 1)[0]);
    }
    return selected;
  }

  /** タイトル+本文のJaccard類似で近似重複を除外 */
  private dropNearDuplicates(docs: DocumentResult[], threshold = 0.9): DocumentResult[] {
    const out: DocumentResult[] = [];
    for (const d of docs) {
      const t = textOf(d);
      if (!t) { out.push(d); continue; }
      const dup = out.some((o) => jaccardSim(t, textOf(o)) >= threshold);
      if (!dup) out.push(d);
    }
    return out;
  }
}

function textOf(d: DocumentResult): string {
  const title = d.title ?? "";
  const content = d.content ?? "";
  return (title + "\n" + content).toLowerCase().slice(0, 800);
}

function jaccardSim(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

function tokenize(t: string): string[] {
  return t.split(/[^\p{L}\p{N}]+/u).filter((s) => s.length >= 2);
}
