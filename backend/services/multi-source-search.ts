import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";
import type { SearchProvider } from "../providers/base.ts";

/**
 * 複数プロバイダ横断検索サービス。
 *
 * - 各プロバイダに並行で問い合わせ
 * - エラーハンドリング（一部プロバイダが失敗しても他の結果を返す）
 * - 結果をマージして返す
 *
 * 注: 重複排除は api/deepresearch.ts の DuplicationAnalyzer で行う
 */
export class MultiSourceSearchService {
  async searchAcross(
    providers: SearchProvider[],
    query: ProviderQuery,
  ): Promise<DocumentResult[]> {
    const tasks = providers.map(async (p) => {
      try {
        const results = await p.search(query);
        return results;
      } catch (e) {
        console.error(`Provider ${p.id} failed:`, (e as Error).message);
        return [] as DocumentResult[];
      }
    });
    const arrays = await Promise.all(tasks);
    const merged = arrays.flat();
    return merged;
  }
}
