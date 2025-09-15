# Deep Research 設計・実装ガイド

作成日: 2025-09-13

このドキュメントは、現状の `/search` 実装を正しく捉えた上で、「単純にRAG APIを呼ぶだけ」から脱却し、反復型の Deep Research を実装するための設計・作業計画をまとめたものです。

## 1. 現状の実装の正確な把握

- エントリ: `api/server.ts`
  - L216 からの `executeDeepResearchPipeline()` が検索パイプライン本体。
  - 流れ: QueryPlanning → MultiSource(=Provider) 検索 → RelevanceEvaluation → AnswerGeneration。
- プランニング: `services/query-planning.ts`
  - Cerebras でサブクエリとエンティティ抽出（JSON）を生成。
- 検索: `services/multi-source-search.ts` + `services/provider-registry.ts`
  - 現状 `ProviderRegistry` は `HttpRagProvider`（`KOKKAI_RAG_URL:/v1/search`）のみ登録。
  - `HttpRagProvider` は `ProviderQuery.originalQuestion`（単一文字列）しか使わない。`subqueries` は未活用。
- RAG（下層）: `api/kokkai_rag.ts`（DBベクトル検索のみ返却） + `services/vector-search.ts`
- 関連度評価: `services/relevance-evaluation.ts`（LLMで再ランキング/フィルタ）
- 回答生成: `services/answer-generation.ts`
  - 「Chain of Agents」的な分割要約→統合要約はあるが、探索の反復やギャップ充足は行っていない。

要点:
- 現在の `/search` は「(1) プラン生成 → (2) 単回のベクトル検索（実体は下流のRAG API呼び出し）→ (3) 関連度評価 → (4) 要約生成」。
- 実質、検索は一度きりで、サブクエリや再探索、ギャップ充足、反証検証などの「Deep Research ループ」は未実装。

## 2. 目指す Deep Research の定義

Deep Research とは、以下を満たす反復型の調査ワークフローを指します。

1) 問いをサブタスク化（仮説/情報要求の明確化）
2) 複数ソース（Kokkai DB, ウェブ, PDF, 省庁資料など）を横断探索
3) 証拠（evidence）抽出・正規化・重複排除・スコアリング
4) ギャップ分析（何がまだ不足か）と再探索の計画更新
5) 反証・矛盾検出（主張 vs 出典の突合）
6) 収束条件（予算/反復回数/網羅率）で停止し、引用付きで統合回答を生成

このループにより、「一度取りに行った結果を要約するだけ」ではなく、「不足があれば掘り下げて取りに行く」行動が可能になります。

## 3. ギャップ分析（現状 → Deep Research）

- サブクエリ活用: 生成はしているが、検索実行に使っていない（`HttpRagProvider` が未対応）。
- 反復探索: なし（1回の取得で終了）。
- 情報源の多様性: 1プロバイダ（KOKKAI RAG）のみ。
- 証拠管理: 要約対象の `SpeechResult[]` はあるが、証拠の性質（出典種別・検証状態・引用粒度）を持たない。
- 反証/矛盾検出: なし。
- 収束判定: なし（固定フロー）。
- トレース/再現性: 途中経過（探索ログ、意思決定理由）を返却しない。

## 4. 追加すべきコンポーネントと変更点

### 4.1 新規サービス

- `services/research-orchestrator.ts`
  - 研究ループの制御（計画→探索→抽出→評価→再計画）。
  - 収束条件（`maxIters`, `budgetMs`, `coverageThreshold`）。

- `services/evidence-store.ts`
  - 一時的な証拠ストア（メモリ/将来的にKV）。
  - ドキュメント断片、メタデータ、出典、スコア、紐付くサブクエリIDを保持。

- `services/claim-extractor.ts`
  - テキストから「主張/事実」を抽出（出典スパンと紐付け）。
  - 出力: `Claim { text, quoteSpan, citations[], stance? }`。

- `services/contradiction-checker.ts`
  - Claims 間の矛盾/整合を検査、信頼度を再評価。

- `services/citation-graph.ts`
  - 証拠と主張のグラフ（`Claim` ⇄ `Evidence` ⇄ `Source`）。

### 4.2 プロバイダ拡張（複数ソース化）

- `providers/web-search.ts`
  - 汎用検索APIラッパ（クエリ→候補URL集合）。
  - 例: SerpAPI/Bing（APIキーは環境変数で任意）

- `providers/web-fetch.ts`
  - URL→本文抽出（HTML→Text、PDF→Text）。

- `providers/gov-opendata.ts`（任意）
  - e-Gov/省庁PDFのサイトマップ/検索APIがあれば優先。

- 既存 `HttpRagProvider` の拡張
  - `ProviderQuery.subqueries` を順次投げるモードを追加（合算/ユニーク化）。

### 4.3 既存サービスの拡張

- `services/multi-source-search.ts`
  - 単発検索→「サブクエリごと×プロバイダごと」に並列/逐次のハイブリッド実行。
  - 研究ループ内から呼び出せるよう、キャンセル/タイムアウト対応。

- `services/relevance-evaluation.ts`
  - Evidence 単位での再評価、重複除去と多様性促進（MMR）。

- `services/answer-generation.ts`
  - 主張と証拠を明示的に結び付け、段落ごとに引用を付与。
  - 出力: 本文 + 参考文献（URL/会議録ID/日付など）。

### 4.4 型とレスポンス拡張

- `types/knowledge.ts` 追加案
  - `Evidence { id, source: DocumentSource, content, url?, date?, score, subqueryId }`
  - `Claim { id, text, citations: EvidenceRef[], confidence }`
  - `ResearchTraceStep { step, input, output, meta, tookMs }`
  - `ResearchResult { answer, claims[], evidences[], sources[], trace? }`

- API リクエスト拡張（`/search` 互換維持 or `/deepsearch` 追加）
  - `depth?: number`（0=現状, 1+=反復）
  - `maxIters?: number`, `budgetMs?: number`
  - `providers?: string[]`（使用プロバイダの選択）
  - `returnTrace?: boolean`（探索ログを返す）

## 5. 研究ループの参考フロー（擬似コード）

```
plan = planner.createQueryPlan(userQuery)
frontier = initFrontier(plan.subqueries)
store = new EvidenceStore()
iters = 0; deadline = now + budgetMs

while (iters < maxIters && now < deadline) {
  subq = frontier.pop()
  docs = multiSource.searchAcross(providers, { originalQuestion: subq, subqueries:[subq], limit })
  evs  = extractEvidence(docs)           // 正規化・スコア付与
  evs  = evaluateRelevance(subq, evs)    // 再ランク・多様性
  store.add(evs)

  gaps = analyzeGaps(plan, store)        // 情報要求に対する充足度
  if (gaps.coverage >= coverageThreshold) break

  nextSubqs = generateFollowups(gaps, store)
  frontier.push(nextSubqs)
  iters += 1
}

claims = extractClaims(store)
claims = checkContradictions(claims, store)
answer = synthesizeAnswer(userQuery, claims, store, { cite: true })

return { answer, sources: store.topSources(), evidences: store.all(), trace }
```

収束条件は以下のいずれかで停止:
- 反復上限到達 / 予算超過
- 充足率（coverage）到達
- 情報価値の限界（新規有用証拠が増えない）

## 6. API 仕様（案）

リクエスト（互換維持を前提に拡張）:

```json
POST /search
{
  "query": "防衛費の増額と財源",
  "limit": 20,
  "depth": 2,
  "maxIters": 3,
  "budgetMs": 15000,
  "providers": ["kokkai-db", "web-search"],
  "returnTrace": true
}
```

レスポンス（追加フィールドは任意返却）:

```json
{
  "query": "...",
  "answer": "...（各段落に[1][2]など引用）",
  "sources": [ { "title": "...", "url": "...", "date": "..." } ],
  "evidences": [ { "id": "e1", "source": {"providerId":"kokkai-db"}, "content": "..." } ],
  "claims": [ { "id": "c1", "text": "...", "citations": ["e1","e3"], "confidence": 0.72 } ],
  "trace": [ { "step": "search", "input": "subq1", "output": {"hits": 12}, "tookMs": 420 } ],
  "metadata": { "totalResults": 18, "processingTime": 5321, "timestamp": "..." }
}
```

## 7. 段階的実装計画（安全に差分を進める）

### Phase 1（サブクエリ活用と多ソース化、MVP）
- [api] `/search` に `depth`, `maxIters`, `providers`, `returnTrace` を受け付けるが、まずは `depth=0/1` の固定動作に。
- [providers] `HttpRagProvider` に `subqueries` 順次実行モードを追加（ユニーク化 + スコア統合）。
- [services] `multi-source-search.ts` を「(プロバイダ×サブクエリ)」で実行→マージに拡張。
- [types] `Evidence`, `ResearchTraceStep` を追加（最低限）。
- [answer] 既存の要約生成に、出典（URL / speechId）を段落単位で挿入。
- [tests] モックプロバイダで「サブクエリ分割→統合」一連のユニットテスト。

### Phase 2（反復ループとギャップ充足）
- [services] `research-orchestrator.ts` を追加し、ループ（計画→探索→評価→再計画）を実装。
- [services] `evidence-store.ts` を導入し、重複排除と多様性（MMR）を組込み。
- [services] `claim-extractor.ts` で主張抽出、`citation-graph.ts` で引用グラフを構築。
- [api] `returnTrace=true` で意思決定ログ・メトリクスを返却。
- [tests] ループの停止条件（iters/budget/coverage）と再現性のテスト。

### Phase 3（ウェブ/省庁資料）
- [providers] `web-search.ts` + `web-fetch.ts` を追加（APIキー/ユーザエージェントは環境変数）。
- [utils] HTML/PDF 抽出の安定化（タイムアウト・文字化け対策・正規化）。
- [services] 反証・矛盾検出の導入、信頼度スコアの再評価。
- [tests] 外部依存はフィクスチャでVCR風に固定。

## 8. 設定・セキュリティ

環境変数（追加想定）:
- `KOKKAI_RAG_URL`（既存）
- `WEB_SEARCH_API_KEY`（任意）
- `WEB_SEARCH_ENDPOINT`（任意）
- `FETCH_CONCURRENCY`, `REQUEST_TIMEOUT_MS`

## 9. テスト方針

- Deno 内蔵テストでユニット/結合テスト。
- 主要ケース:
  - サブクエリを用いたマージ結果の一意化と多様性確保
  - 反復ループ停止条件の検証
  - 段落ごとの引用出力整合
  - 低品質ソース混入時のスコア低減が効くこと

## 10. 運用・観測

- ロギング: 各ステップの `tookMs`, 件数, 失敗率, キャンセル数。
- メトリクス: 反復ごとの新規有用証拠件数、重複率、coverage 推定値。
- 将来: キャッシュ（サブクエリ→結果）と再利用。

## 11. まとめ

現状の `/search` は「単回RAG + 要約」の段階です。上記の `Research Orchestrator` と `Evidence/Citation` レイヤを導入し、サブクエリ活用・多ソース化・反復探索・ギャップ充足・引用一体の回答生成を実装することで、Deep Research に必要な要件を段階的に満たせます。まずは Phase 1（破壊的変更なし）から着手し、テストで品質を確保しながら拡張していくのが安全です。

