import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";
import type { SearchProvider } from "../providers/base.ts";
import { MultiSourceSearchService } from "./multi-source-search.ts";
import { FollowupGeneratorService, type OrchestratorState } from "./followup-generator.ts";
import type { Entities } from "./followup-generator.ts";

/**
 * DeepResearchOrchestrator
 *
 * 役割:
 * - セクション別のターゲット探索と、ギャップ充足ループ（最大3反復）の制御を担当。
 * - Provider の選択（セクションごとの許可 ID）と、セクションに最適化したフォローアップサブクエリ生成を行う。
 * - 取得結果のドキュメント配列と、ドキュメント→どのセクションでヒットしたかの対応関係を返す。
 */
export interface OrchestratorRunParams {
  userQuery: string;
  baseSubqueries: string[];
  providers: SearchProvider[];
  allowBySection: Record<string, string[]>;
  targets: Record<string, number>;
  limit: number;
  seedUrls?: string[];
  docsProvider?: SearchProvider | null;
}

export interface OrchestratorRunResult {
  allDocs: DocumentResult[];
  sectionHitMap: Map<string, Set<string>>;
  iterations: number;
}

export class DeepResearchOrchestrator {
  private multiSource = new MultiSourceSearchService();
  private followups = new FollowupGeneratorService();

  /**
   * 探索を実行する。
   *
   * @param userQuery ユーザの元質問
   * @param baseSubqueries プランナーが生成したベースのサブクエリ
   * @param providers 使用可能なプロバイダ一覧
   * @param allowBySection セクションごとの許可プロバイダID
   * @param targets セクションごとの最低目標件数
   * @param limit 各呼び出しあたりの上限目安
   * @param seedUrls 取得専用URL（HttpDocsProvider用）
   * @param docsProvider seedUrlsに対応するドキュメントフェッチ用プロバイダ（任意）
   */
  async run(params: OrchestratorRunParams): Promise<OrchestratorRunResult> {
    const {
      userQuery,
      baseSubqueries,
      providers,
      allowBySection,
      targets,
      limit,
      seedUrls,
      docsProvider,
    } = params;
    const sectionKeys = Object.keys(allowBySection);
    const allDocs: DocumentResult[] = [];
    const sectionHitMap = new Map<string, Set<string>>();
    const state: OrchestratorState = {
      seen: {
        queryStrings: new Set<string>(),
        urls: new Set<string>(),
        domains: new Set<string>(),
      },
    };
    const seenEntityStrings = new Set<string>();

    const iters = 3;
    for (let iter = 1; iter <= iters; iter++) {
      console.log(`[DRV1][loop ${iter}/${iters}] ▶ Section-targeted retrieval`);
      for (const sKey of sectionKeys) {
        const allowIds = allowBySection[sKey] || [];
        if (allowIds.length === 0) continue;

        // セクションで許可されたプロバイダのみ選択
        const pList = providers.filter((p) => allowIds.includes(p.id));
        if (docsProvider && allowIds.includes(docsProvider.id)) pList.push(docsProvider);
        if (!pList.length) continue;

        // セクション向けフォローアップサブクエリを生成（多様化/MMR/負ヒント付与）
        const entities = this.extractEntities(allDocs);
        const fups = this.followups.generate({
          sectionKey: sKey,
          userQuery,
          baseSubqueries,
          asOfDate: undefined,
          state,
          iter,
          k: 5,
          entities,
          seenEntities: seenEntityStrings,
        });
        fups.forEach((q) => state.seen.queryStrings.add(q));
        const pq: ProviderQuery = {
          originalQuestion: userQuery,
          subqueries: fups,
          limit: Math.max(3, Math.floor(limit / 2)),
          seedUrls,
        };
        try {
          const docs = await this.multiSource.searchAcross(pList, pq);
          for (const d of docs) {
            allDocs.push(d);
            const key = d.url || `${d.source.providerId}:${d.id}`;
            if (!sectionHitMap.has(key)) sectionHitMap.set(key, new Set());
            sectionHitMap.get(key)!.add(sKey);
            if (d.url) state.seen.urls.add(d.url);
            const dom = extractDomain(d.url);
            if (dom) state.seen.domains.add(dom);
          }
          console.log(`[DRV1][${sKey}] +${docs.length} (${pList.map((p) => p.id).join(",")})`);
        } catch (e) {
          console.error(`[DRV1][${sKey}] retrieval error:`, (e as Error).message);
        }
      }

      // 充足度を計算して未達がなければ早期終了
      const cov = this.computeCoverage(sectionKeys, targets, sectionHitMap);
      const unmet = Object.entries(cov.missing).filter(([, v]) => v > 0);
      console.log(
        `[DRV1] coverage=${JSON.stringify(cov.current)} unmet=${JSON.stringify(cov.missing)}`,
      );
      if (unmet.length === 0) return { allDocs, sectionHitMap, iterations: iter };
    }

    return { allDocs, sectionHitMap, iterations: 3 };
  }

  // フォローアップ生成は FollowupGeneratorService に委譲

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

  /** 取得済みドキュメントから簡易にエンティティを抽出する（話者/会議名など） */
  private extractEntities(docs: DocumentResult[]): Entities {
    const speakers = new Set<string>();
    const parties = new Set<string>();
    const meetings = new Set<string>();
    for (const d of docs) {
      const ex = d.extras as Record<string, unknown> | undefined;
      const sp = typeof ex?.speaker === "string" ? (ex!.speaker as string).trim() : undefined;
      const pt = typeof ex?.party === "string" ? (ex!.party as string).trim() : undefined;
      const mt = typeof ex?.meeting === "string" ? (ex!.meeting as string).trim() : undefined;
      if (sp) speakers.add(sp);
      if (pt) parties.add(pt);
      if (mt) meetings.add(mt);
    }
    return { speakers, parties, meetings };
  }
}

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
