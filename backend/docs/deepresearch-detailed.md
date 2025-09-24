# Deep Research API 詳細実装分析

## アーキテクチャ概要

Deep Research APIは、複雑な質問に対して構造化された包括的な回答を生成するために設計された、多層的な情報検索・処理システムです。

## 詳細処理フロー

### 1. リクエスト受信と初期化 (api/deepresearch.ts)

```
[Client] → POST /v1/deepresearch
         ↓
[Valibot Validation]
         ↓
[executeDeepResearchV1()]
```

**初期化プロセス:**

- 環境変数 `OPENAI_API_KEY` の存在確認（必須）
- サービスクラスのインスタンス化:
  - QueryPlanningService
  - RelevanceEvaluationService
  - ProviderRegistry
  - SectionSynthesisService
  - DeepResearchOrchestrator

### 2. クエリプランニングフェーズ

```
QueryPlanningService.createQueryPlan(userQuestion)
    ↓
[OpenAI API] - task="query_planning"
    ↓
QueryPlan {
  originalQuestion: string
  subqueries: string[]      // 分解されたサブクエリ
  entities: {
    speakers: string[]      // 話者名
    parties: string[]       // 政党名
    topics: string[]        // トピック
    meetings: string[]      // 会議名
    positions: string[]     // 役職
    dateRange?: {...}       // 日付範囲
  }
  enabledStrategies: string[]
  confidence: number
  estimatedComplexity: number
}
```

### 3. DeepResearchOrchestrator による反復探索

**重要な実装詳細:**

#### 3.1 反復ループ構造（最大3回）

```typescript
for (let iter = 1; iter <= 3; iter++) {
  for (const sectionKey of sectionKeys) {
    // セクション別処理
  }

  // 充足度チェック
  const coverage = computeCoverage(...)
  if (全セクション充足) {
    return // 早期終了
  }
}
```

#### 3.2 セクション駆動型検索

**現在実装されている9つのセクション:**

| セクション           | 許可プロバイダー            | ターゲット件数 | 目的             |
| -------------------- | --------------------------- | -------------- | ---------------- |
| purpose_overview     | ["openai-web"]              | 2              | 目的・概要の把握 |
| current_status       | ["kokkai-db", "openai-web"] | 1              | 現状の把握       |
| timeline             | ["kokkai-db", "openai-web"] | 3              | 時系列情報       |
| key_points           | ["openai-web"]              | 3              | 要点抽出         |
| background           | ["openai-web", "kokkai-db"] | 2              | 背景情報         |
| main_issues          | ["openai-web", "kokkai-db"] | 3              | 主要論点         |
| past_debates_summary | ["kokkai-db"]               | 3              | 過去の議論       |

#### 3.3 セクション別サブクエリ構成

DeepResearchOrchestrator はシンプルな規則でセクション向けサブクエリを構成します。

```typescript
buildSectionSubqueries(sectionKey, userQuery, baseSubqueries) {
  // 1. 元クエリを必ず含める
  // 2. プランナーが提案したサブクエリを順番通りに追加
  // 3. セクション固有のキーワードヒント（例: "概要", "年表"）を付与した派生クエリを追加
  // 4. 重複を除外し、最大10件にクリップ
}
```

kokkai-rag と Web 検索へ同じ観点のクエリを投げつつ、セクション固有の視点を軽量に補強することに集中しています。

### 4. 状態管理とトラッキング

#### 4.1 sectionHitMap の構造

```typescript
Map<string, Set<string>>;
// Key: documentKey (URL または "providerId:docId")
// Value: Set of sectionKeys
```

**用途:**

- 同一ドキュメントが複数セクションで使用されることを許可
- 各ドキュメントがどのセクションに貢献したかを追跡
- 充足度計算の基礎データ

#### 4.2 状態管理の簡素化

反復探索の状態管理は撤廃し、オーケストレータが保持するのは `sectionHitMap` のみです。
重複抑制や多様化は MultiSourceSearchService の MMR と後段の重複解析ユーティリティが担います。

### 5. 充足度計算アルゴリズム

```typescript
computeCoverage(sectionKeys, targets, sectionHitMap) {
  // 1. 現在のカウント初期化
  current[section] = 0

  // 2. sectionHitMapから集計
  for ([docKey, sections] of sectionHitMap) {
    for (section of sections) {
      current[section]++
    }
  }

  // 3. 不足分計算
  for (section of sectionKeys) {
    missing[section] = max(0, targets[section] - current[section])
  }

  return { current, missing }
}
```

### 6. 関連度評価プロセス

**実装の特徴:**

- **直列処理**: レート制限対策のため各ドキュメントを順次評価
- **スコア調整**:
  - 高関連: そのまま (1.0)
  - 中関連: 0.8倍
  - 低関連: 0.5倍
  - 無関係: 除外
- **フォールバック**: エラー時は元の結果を保持

### 7. 証拠レコード生成

```typescript
buildEvidences(finalDocs) {
  for (doc of finalDocs) {
    const key = doc.url || `${providerId}:${id}`

    if (!evidenceMap.has(key)) {
      const evidenceId = `e${++count}`
      const record = toEvidenceRecord(doc, evidenceId)

      // セクションヒント追加
      const hints = sectionHitMap.get(key)
      if (hints) {
        record.sectionHints = Array.from(hints)
      }

      evidenceMap.set(key, record)
      evidences.push(record)
    }
  }
}
```

### 8. セクション統合

SectionSynthesisService が最終的な構造化セクションを生成:

**使用モデル**: "gpt-5" (ハードコード)
**最大トークン**: 8000
**処理**: JSONレスポンスをパースし、DeepResearchSections型として返却

## プロバイダーシステム

### KokkaiRagProvider

- **エンドポイント**: 環境変数 `KOKKAI_RAG_URL` (デフォルト: http://localhost:8001/v1/search)
- **タイムアウト**: 15秒
- **特徴**: 国会議事録のベクトル検索

### OpenAIWebProvider

- **API**: OpenAI Responses API with web_search_preview
- **タイムアウト**: 20秒
- **サブクエリ処理**: 最大3つのサブクエリを並列実行
- **重複除去**: URL基準

## パフォーマンス特性

### 処理時間の内訳（典型的なケース）

1. クエリプランニング: ~2秒
2. 反復探索（3回）: ~15-30秒
3. 関連度評価: ~5-10秒（結果数による）
4. セクション統合: ~3-5秒
5. **合計**: 25-47秒

### ボトルネック

- **直列的な関連度評価**: 各ドキュメントを順次処理
- **セクション別の逐次処理**: 並列化の余地あり
- **LLM呼び出しの頻度**: 特に関連度評価で顕著

## 今後の改善ポイント

1. **並列化の強化**
   - セクション別検索の並列実行
   - 関連度評価のバッチ処理

2. **キャッシング**
   - プロバイダーレベルでの結果キャッシュ
   - LLM評価結果のキャッシュ

3. **動的調整**
   - 反復回数の動的決定
   - セクション優先度の動的調整

4. **エラーハンドリング**
   - 部分的失敗の許容
   - グレースフルデグレーション
