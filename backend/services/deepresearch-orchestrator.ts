import type { DocumentResult, ProviderQuery } from "../types/knowledge.js";
import type { SearchProvider } from "../providers/base.js";
import { MultiSourceSearchService } from "./multi-source-search.js";
import { DuplicationAnalyzer, type SectionDocumentTracker } from "../utils/duplication-analyzer.js";

const SECTION_KEYWORD_HINTS: Record<string, string[]> = {
  purpose_overview: ["概要", "目的", "趣旨"],
  current_status: ["現状", "進捗", "最新"],
  timeline: ["年表", "タイムライン", "経緯"],
  key_points: ["要点", "ポイント"],
  background: ["背景", "狙い", "経緯"],
  main_issues: ["論点", "課題", "争点"],
  reasons_for_amendment: [], // 既存の証拠から統合するため、追加の検索は不要
  impact_analysis: ["影響", "効果"],
  past_debates_summary: ["国会議事録", "質疑応答"],
};

/**
 * DeepResearchOrchestrator
 *
 * 役割:
 * - セクションごとに許可されたプロバイダーへシンプルなサブクエリで検索を実行。
 * - 取得した結果をセクション単位で追跡し、 coverage ログを出力。
 * - 収集したドキュメント一覧と sectionHitMap を返す。
 */
export interface OrchestratorRunParams {
  baseSubqueries: string[];
  providers: SearchProvider[];
  allowBySection: Record<string, string[]>;
  targets: Record<string, number>;
  limit: number;
}

export interface OrchestratorRunResult {
  finalDocs: DocumentResult[]; // 重複除去後の最終ドキュメント
  sectionHitMap: Map<string, Set<string>>;
  iterations: number;
}

export class DeepResearchOrchestrator {
  private multiSource = new MultiSourceSearchService();

  /**
   * 探索を実行する。
   *
   * @param baseSubqueries プランナーが生成したベースのサブクエリ
   * @param providers 使用可能なプロバイダ一覧
   * @param allowBySection セクションごとの許可プロバイダID
   * @param targets セクションごとの最低目標件数
   * @param limit 各呼び出しあたりの上限目安
   */
  async run(params: OrchestratorRunParams): Promise<OrchestratorRunResult> {
    const { baseSubqueries, providers, allowBySection, targets, limit } = params;
    const sectionKeys = Object.keys(allowBySection);
    const allDocs: DocumentResult[] = [];
    const sectionHitMap = new Map<string, Set<string>>();
    const sectionQueryMap = new Map<string, Map<string, string>>(); // ドキュメントごとのセクション別検索クエリ

    // 各セクションの検索タスクを準備
    const searchTasks = sectionKeys
      .map((sectionKey) => {
        const allowedProviderIds = allowBySection[sectionKey] ?? [];
        if (allowedProviderIds.length === 0) return null;

        const sectionProviders = providers.filter((p) => allowedProviderIds.includes(p.id));
        if (!sectionProviders.length) return null;

        const query = this.buildSectionQuery(sectionKey, baseSubqueries);
        const providerQuery: ProviderQuery = {
          query,
          limit: this.sectionLimit(limit),
        };

        // 非同期検索タスクを返す
        return async () => {
          try {
            const docs = await this.multiSource.searchAcross(
              sectionProviders,
              providerQuery,
            );
            const providerList = sectionProviders.map((p) => p.id).join(",");
            console.log(
              `[DRV1][${sectionKey}] +${docs.length} providers=${providerList} subqueries=${query}`,
            );
            return { sectionKey, docs, query };
          } catch (e) {
            console.error(
              `[DRV1][${sectionKey}] retrieval error:`,
              (e as Error).message,
            );
            return { sectionKey, docs: [], query };
          }
        };
      })
      .filter(
        (
          task,
        ): task is () => Promise<{
          sectionKey: string;
          docs: DocumentResult[];
          query: string;
        }> => task !== null,
      );

    // 並列実行
    console.log(
      `[DRV1] ▶ Starting parallel search for ${searchTasks.length} sections`,
    );
    const results = await Promise.all(searchTasks.map((task) => task()));

    // 結果を統合
    for (const { sectionKey, docs, query } of results) {
      for (const doc of docs) {
        allDocs.push(doc);
        const key = this.docKey(doc);
        if (!sectionHitMap.has(key)) sectionHitMap.set(key, new Set());
        sectionHitMap.get(key)!.add(sectionKey);

        // 検索クエリ情報を保存
        if (!sectionQueryMap.has(key)) {
          sectionQueryMap.set(key, new Map());
        }
        sectionQueryMap.get(key)!.set(sectionKey, query);
      }
    }

    const coverage = this.computeCoverage(sectionKeys, targets, sectionHitMap);
    console.log(
      `[DRV1] coverage=${JSON.stringify(coverage.current)} unmet=${JSON.stringify(
        coverage.missing,
      )
      }`,
    );

    // 重複分析と除去
    console.log(`[DRV1] ▶ Analyzing duplicates totalDocs=${allDocs.length}`);
    const analyzer = new DuplicationAnalyzer();

    // セクション情報付きドキュメントのリストを構築
    const documentsWithSections: SectionDocumentTracker[] = [];

    // 統計収集とセクション情報の整理
    for (const doc of allDocs) {
      analyzer.collectStatistics(doc, sectionHitMap);
      const key = doc.url || `${doc.source.providerId}:${doc.id}`;
      const sections = sectionHitMap.get(key) || new Set();
      // 各セクションごとにドキュメントをリストに追加
      for (const section of sections) {
        // セクションの検索コンテキスト（どのクエリでヒットしたか）を取得
        const sectionQueries = sectionQueryMap.get(key);
        const searchContext = sectionQueries?.get(section);
        documentsWithSections.push({ section, doc, key, searchContext });
      }
    }

    // セクション内重複を除去
    const finalDocs = analyzer.deduplicateWithinSections(documentsWithSections);

    // 統計情報を生成して出力
    const stats = analyzer.generateStatistics(allDocs.length);
    analyzer.printStatistics(stats);
    console.log(
      `[DRV1] ◀ After section-aware dedup finalDocs=${finalDocs.length}`,
    );

    return {
      finalDocs,
      sectionHitMap,
      iterations: 1,
    };
  }

  /**
   * セクションの充足状況を計算
   *
   * アルゴリズムの概要:
   * 1) 初期化: 全セクションの現在件数 current[s] を 0 に初期化。
   * 2) 集計: 取得済みドキュメント docs を1件ずつ走査し、
   *    - doc のユニークキー（URL または provider:id）から sectionHitMap を引く。
   *    - ヒットしたセクション集合 hints が存在する場合、集合内の各セクション s について current[s]++。
   *      （sectionHitMap は Set<string> を使うため、同一ドキュメントが同一セクションに重複加算されない）
   * 3) 不足計算: targets[s] が設定されているセクションについて、
   *      missing[s] = max(0, targets[s] - current[s]) を計算。
   * 4) 戻り値: { current, missing } を返す。
   *
   * 性質/注意:
   * - sectionHitMap は「どのセクション探索でそのドキュメントがヒットしたか」を保持している。
   *   1ドキュメントが複数セクションでヒットした場合、それぞれの current に 1 ずつ加算する。
   * - 同一URL（または同一 provider:id）の重複は sectionHitMap の Set により二重加算されない。
   * - targets が未指定のセクションは missing を計算しない（=充足要件なし）。
   * - 計算量は O(|docs| + |sectionKeys|)。
   */
  private computeCoverage(
    sectionKeys: string[],
    targets: Record<string, number>,
    sectionHitMap: Map<string, Set<string>>,
  ): { current: Record<string, number>; missing: Record<string, number> } {
    // 注意: allDocs には同一ドキュメントが複数回含まれる可能性があるため、
    // coverage 集計は sectionHitMap（ユニークキー→セクション集合）を基準に行う。
    const current: Record<string, number> = {};
    for (const s of sectionKeys) current[s] = 0;
    for (const [, hints] of sectionHitMap.entries()) {
      for (const s of hints) current[s] = (current[s] ?? 0) + 1;
    }
    const missing: Record<string, number> = {};
    for (const s of sectionKeys) {
      const tgt = targets[s] ?? 0;
      if (tgt > 0) missing[s] = Math.max(0, tgt - (current[s] ?? 0));
    }
    return { current, missing };
  }

  /*
   * シンプル化: サブクエリを統合し、セクションヒントを追加
   * 例:
   *   buildSectionSubqueries(
   *     "timeline",
   *     "防衛費 増額",
   *     ["防衛費 財源", "防衛費 審議"],
   *   ) ⇒ [
   *     "防衛費 増額 財源 審議 年表 タイムライン 経緯",  // すべて統合
   *   ]
   */
  buildSectionQuery(sectionKey: string, baseSubqueries: string[]): string {
    // すべてのクエリを統合
    const allQueries = [...baseSubqueries];

    // 重複するキーワードを除去
    const uniqueWords = new Set<string>();
    for (const query of allQueries) {
      const words = query.split(/\s+/).filter((w) => w.length > 0);
      words.forEach((w) => uniqueWords.add(w));
    }

    // セクション固有のヒントを追加
    const hints = SECTION_KEYWORD_HINTS[sectionKey] ?? [];
    hints.forEach((hint) => uniqueWords.add(hint));

    // 1つの統合クエリとして返す
    const combinedQuery = Array.from(uniqueWords).join(" ");
    return combinedQuery;
  }

  private sectionLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit <= 0) return 10;
    // 各セクションでより多くの結果を取得（重複は後で除去される）
    return Math.max(10, Math.floor(limit * 0.7));
  }

  private docKey(doc: DocumentResult): string {
    return doc.url || `${doc.source.providerId}:${doc.id}`;
  }
}
