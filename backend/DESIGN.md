# Kokkai Deep Research API 設計書

生成日: 2025-09-13
生成者: requirements-analyzer
プロジェクト: kokkai-join Deep Research API

## システム概要

### 目的
日本の国会会議録データを活用し、高度な調査・分析機能を提供するDeep Research APIシステム。単純な検索機能を超え、複数の観点からの分析、関連性評価、そして包括的な回答生成を実現する。

### 全体アーキテクチャ
```
┌─────────────────────────────────────────────────────┐
│                Frontend                             │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP Request
┌─────────────────▼───────────────────────────────────┐
│           Deep Research API                         │
│               (Port 8000)                           │
│  ┌─────────────────────────────────────────────┐    │
│  │     QueryPlanningService                   │    │
│  │  • サブクエリ分解                           │    │
│  │  • エンティティ抽出                         │    │
│  │  • 戦略選択                                │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │     MultiSourceSearchService               │    │
│  │  • プロバイダー間検索                        │    │
│  │  • 結果統合・重複排除                        │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │     RelevanceEvaluationService             │    │
│  │  • 関連性評価・フィルタリング                 │    │
│  │  • スコア調整                               │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │     AnswerGenerationService                │    │
│  │  • Chain of Agents                         │    │
│  │  • 段階的要約                               │    │
│  │  • Markdown出力                            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP Request
┌─────────────────▼───────────────────────────────────┐
│            Kokkai RAG API                           │
│               (Port 8001)                           │
│  ┌─────────────────────────────────────────────┐    │
│  │     VectorSearchService                    │    │
│  │  • ベクトル類似度検索                        │    │
│  │  • pgvector使用                            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────────┘
                  │ SQL Query
┌─────────────────▼───────────────────────────────────┐
│            PostgreSQL + pgvector                   │
│  • 国会会議録データ                                 │
│  • ベクトル埋め込み                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               External APIs                         │
│  ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   Cerebras AI   │    │      Ollama (bge-m3)   │  │
│  │  • 自然言語処理   │    │  • 埋め込み生成         │  │
│  │  • 要約生成      │    │                        │  │
│  │  • 関連性評価    │    │                        │  │
│  └─────────────────┘    └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 詳細設計

### 1. Query Planning Layer

#### QueryPlanningService
**責務**: ユーザークエリの構造化と検索戦略の決定

**主要機能**:
- サブクエリへの分解
- エンティティ抽出（発言者、政党、トピック、会議、役職、日付）
- 検索戦略の選択
- 信頼度と複雑度の評価

**入力**: `string` (ユーザーの自然言語クエリ)
**出力**: `QueryPlan`
```typescript
interface QueryPlan {
  originalQuestion: string;
  subqueries: string[];
  entities: {
    speakers?: string[];
    parties?: string[];
    topics?: string[];
    meetings?: string[];
    positions?: string[];
    dateRange?: { start: string; end: string };
  };
  enabledStrategies: string[];
  confidence: number;
  estimatedComplexity: number;
}
```

**AI統合**: Cerebras APIを使用したプロンプトベース処理

### 2. Search Layer

#### MultiSourceSearchService
**責務**: 複数検索プロバイダーからの並列検索と結果統合

**主要機能**:
- プロバイダー間の並列検索実行
- エラーハンドリング（プロバイダー単位）
- 重複排除（URL基準、フォールバックはproviderId:id）
- スコアベースソート

**入力**: `SearchProvider[]`, `ProviderQuery`
**出力**: `DocumentResult[]`

**プロバイダー拡張性**: 
- `SearchProvider`インターフェース準拠で新プロバイダー追加可能
- 現在実装: `HttpRagProvider` (Kokkai RAG API接続)

#### ProviderRegistry
**責務**: 検索プロバイダーの管理と設定

**設定方式**: 環境変数ベース
```bash
KOKKAI_RAG_URL=http://localhost:8001/v1/search
```

### 3. Evaluation Layer

#### RelevanceEvaluationService
**責務**: 検索結果の関連性評価とノイズフィルタリング

**評価プロセス**:
1. 各検索結果に対してCerebras APIで関連性評価
2. 4段階評価: 高/中/低/無関係
3. スコア調整: 高(1.0x), 中(0.8x), 低(0.5x), 無関係(除外)
4. 結果の再ソート

**レート制限対策**: 直列処理によるAPI負荷軽減

### 4. Answer Generation Layer

#### AnswerGenerationService
**責務**: Chain of Agentsアプローチによる段階的要約と回答生成

**処理フロー**:
```
Input: SpeechResult[] 
    ↓
1. 発言者グループ化
    ↓
2. チャンク分割 (CHAIN_OF_AGENTS_CHUNK_SIZE)
    ↓
3. Sub-summary生成 (各チャンク)
    ↓
4. Mid-consolidation (観点別統合)
    ↓
5. Final answer生成
    ↓
Output: Markdown形式の構造化回答
```

**アルゴリズム特徴**:
- 発言者単位でのグループ化により文脈保持
- 段階的要約による大量データ処理
- フォールバック機能による堅牢性確保

**出力フォーマット**:
```markdown
## 全体のまとめ
[要約内容]

## 観点別の詳細
### [観点名]
#### 要約
[観点別要約]

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
```

## データフロー設計

### リクエスト処理フロー
```
1. POST /search
    ↓
2. バリデーション (query, limit)
    ↓
3. QueryPlanning
   • Cerebras APIでクエリ解析
   • サブクエリ・エンティティ抽出
    ↓
4. MultiSourceSearch
   • プロバイダー登録取得
   • 並列検索実行
   • 結果統合・重複排除
    ↓
5. RelevanceEvaluation
   • 各結果の関連性評価
   • スコア調整・フィルタリング
    ↓
6. AnswerGeneration
   • Chain of Agents処理
   • 段階的要約
   • Markdown生成
    ↓
7. Response構築
   • メタデータ付加
   • JSON応答
```

### データ変換チェーン
```
string (user query)
    ↓ QueryPlanning
QueryPlan
    ↓ MultiSourceSearch
ProviderQuery → DocumentResult[]
    ↓ Adapter
SpeechResult[]
    ↓ RelevanceEvaluation
SpeechResult[] (filtered)
    ↓ AnswerGeneration
string (markdown)
    ↓ Response
SearchResponse (JSON)
```

## セキュリティ設計

### 現在の実装
- CORS設定: オリジン制限なし（開発環境）
- 入力バリデーション: クエリ長・形式・リミット値
- エラーハンドリング: 内部エラーの詳細隠蔽

### 推奨強化事項
- API認証機能の追加
- レート制限の実装
- 入力サニタイゼーション強化
- CORS設定の本番環境最適化

## 性能設計

### 現在の最適化
- 並列プロバイダー検索
- 直列関連性評価（レート制限対策）
- 段階的要約によるメモリ効率化
- チャンク処理による大量データ対応

### 性能特性
```
推定処理時間（10件検索の場合）:
- QueryPlanning: ~1-2秒
- MultiSourceSearch: ~2-3秒
- RelevanceEvaluation: ~3-5秒 (件数依存)
- AnswerGeneration: ~5-10秒 (内容依存)
合計: ~15-20秒
```

### スケーラビリティ考慮事項
- Cerebras API依存によるレート制限
- データベース接続プール設定
- メモリ使用量の最適化が必要

## 保守性設計

### 現在の構造
- レイヤー分離による責務明確化
- 依存性注入によるテスタビリティ
- 型安全性の確保

### 改善が必要な領域
- テストコードの不在
- 設定の外部化
- ログレベル制御
- メトリクス収集

## 今後の拡張性

### プロバイダー拡張
```typescript
// 新プロバイダー例
class WikipediaProvider implements SearchProvider {
  async search(query: ProviderQuery): Promise<DocumentResult[]> {
    // Wikipedia API統合
  }
}

class NewsApiProvider implements SearchProvider {
  async search(query: ProviderQuery): Promise<DocumentResult[]> {
    // News API統合
  }
}
```

### 機能拡張の方向性
1. **マルチモーダル対応**: 画像・音声データの統合
2. **リアルタイム分析**: WebSocket対応
3. **キャッシュ層**: Redis統合
4. **ファインチューニング**: ドメイン特化モデル
5. **可視化機能**: グラフ・チャート生成

## 運用要件

### 必要な外部依存
- PostgreSQL + pgvector
- Ollama (bge-m3モデル)
- Cerebras API
- Deno Runtime

### 環境変数
```bash
# 必須
DATABASE_URL=postgresql://...
CEREBRAS_API_KEY=...

# オプション（デフォルト値あり）
OLLAMA_BASE_URL=http://localhost:11434
KOKKAI_RAG_URL=http://localhost:8001/v1/search
PORT=8000
KOKKAI_RAG_PORT=8001
```

### ヘルスチェック
- `GET /` - API情報取得
- Deep Research API依存性:
  - Cerebras API接続
  - Kokkai RAG API接続

## 制約事項

### 技術的制約
- Cerebras APIのレート制限
- 単一スレッド処理（Deno）
- メモリ使用量（大量データ処理時）

### ビジネス的制約
- 国会会議録データのみ対応
- 日本語処理のみ
- リアルタイム性は限定的

## 品質保証

### 現在の状況
❌ テストコード: 未実装
❌ コードカバレッジ: 未測定
❌ パフォーマンステスト: 未実装
✅ 型安全性: TypeScript使用
✅ 静的解析: Deno lint使用

### 推奨実装
1. 単体テスト（各サービス）
2. 統合テスト（エンドツーエンド）
3. パフォーマンステスト
4. セキュリティテスト