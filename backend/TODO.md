# Deep Research 実装分析とタスク一覧

生成日: 2025-09-13
生成者: requirements-analyzer
プロジェクト: kokkai-join Deep Research API

## 現状分析結果

### ✅ 実装済み機能（高度なDeep Research実装）

**重要**: api/server.ts の L216 付近は既に本格的なDeep Research実装になっています

#### 実装済みサービス
1. **QueryPlanningService** (`services/query-planning.ts`)
   - Cerebras AIを使った高度なクエリ計画
   - サブクエリ分解、エンティティ抽出、戦略選択
   - 信頼度と複雑度の評価

2. **MultiSourceSearchService** (`services/multi-source-search.ts`) 
   - 複数プロバイダーからの並列検索
   - 重複排除とスコアベースソート
   - エラーハンドリング付き

3. **RelevanceEvaluationService** (`services/relevance-evaluation.ts`)
   - Cerebras AIによる関連性評価
   - スコア調整とノイズフィルタリング
   - 段階的関連性判定（高/中/低/無関係）

4. **AnswerGenerationService** (`services/answer-generation.ts`)
   - Chain of Agents アプローチ
   - 段階的要約（Sub-summary → Mid-consolidation → Final answer）
   - Markdownフォーマット出力
   - 発言者グループ化とチャンク処理

5. **ProviderRegistry** (`services/provider-registry.ts`)
   - プロバイダー管理システム
   - 環境変数による設定

6. **HttpRagProvider** (`providers/http-rag.ts`)
   - HTTP経由でのRAG検索
   - タイムアウト設定とエラーハンドリング

#### アーキテクチャ設計
- **Kokkai RAG API** (port 8001): シンプルなベクトル検索専用
- **Deep Research API** (port 8000): 高度な分析・統合・要約機能

## 現状の問題点

### 🔴 クリティカル（優先度: 高）
- [ ] **テストコードが皆無** - TDD違反、品質保証不可
- [ ] **設定のハードコーディング** - 環境間での移植性問題
- [ ] **エラーハンドリングの不統一** - 障害時の予測不能な動作

### 🟡 重要（優先度: 中）
- [ ] **パフォーマンス監視なし** - ボトルネック特定困難
- [ ] **ログレベル制御なし** - 本番運用時の課題
- [ ] **レート制限未実装** - API濫用への脆弱性

### 🟢 改善（優先度: 低）
- [ ] **API仕様書未整備** - 利用者への情報不足
- [ ] **メトリクス収集なし** - 運用改善データ不足

## 実装タスク（MUSTルール準拠）

### Phase 1: 品質基盤構築（優先度: 高）

#### テスト実装（TDD準拠）
- [ ] [RED] QueryPlanningServiceの振る舞いテストを書く
- [ ] [GREEN] テストを通すための最小実装確認
- [ ] [REFACTOR] QueryPlanningServiceのリファクタリング
- [ ] [RED] MultiSourceSearchServiceの振る舞いテストを書く
- [ ] [GREEN] テストを通すための最小実装確認
- [ ] [REFACTOR] MultiSourceSearchServiceのリファクタリング
- [ ] [RED] RelevanceEvaluationServiceの振る舞いテストを書く
- [ ] [GREEN] テストを通すための最小実装確認
- [ ] [REFACTOR] RelevanceEvaluationServiceのリファクタリング
- [ ] [RED] AnswerGenerationServiceの振る舞いテストを書く
- [ ] [GREEN] テストを通すための最小実装確認
- [ ] [REFACTOR] AnswerGenerationServiceのリファクタリング
- [ ] [RED] エンドツーエンドAPIテストを書く
- [ ] [GREEN] APIテストを通すための調整
- [ ] [REFACTOR] API実装のリファクタリング

#### 設定管理の改善
- [ ] [STRUCTURAL] 設定ファイルの外部化（config/）
- [ ] [STRUCTURAL] 環境変数スキーマの定義
- [ ] [STRUCTURAL] 設定バリデーション機能追加

### Phase 2: 運用品質向上（優先度: 中）

#### パフォーマンス最適化
- [ ] [BEHAVIORAL] レスポンス時間メトリクス追加
- [ ] [BEHAVIORAL] メモリ使用量監視追加
- [ ] [BEHAVIORAL] 並列処理の最適化
- [ ] [BEHAVIORAL] キャッシュ機能の実装

#### エラーハンドリング強化
- [ ] [STRUCTURAL] 統一エラー型の定義
- [ ] [BEHAVIORAL] 段階的フォールバック機能
- [ ] [BEHAVIORAL] 詳細エラーログ実装
- [ ] [BEHAVIORAL] ヘルスチェック機能強化

#### セキュリティ対策
- [ ] [BEHAVIORAL] レート制限機能の実装
- [ ] [BEHAVIORAL] API認証機能の追加
- [ ] [BEHAVIORAL] 入力サニタイゼーション強化

### Phase 3: 運用支援機能（優先度: 低）

#### 監視・メトリクス
- [ ] [BEHAVIORAL] Prometheus メトリクス出力
- [ ] [BEHAVIORAL] 構造化ログ出力
- [ ] [BEHAVIORAL] アプリケーション監視ダッシュボード

#### ドキュメント整備
- [ ] [STRUCTURAL] OpenAPI仕様書の作成
- [ ] [STRUCTURAL] アーキテクチャドキュメント作成
- [ ] [STRUCTURAL] デプロイメントガイド作成

## 実装時の注意事項（MUSTルール準拠）

### 必須遵守事項
1. **TDD**: 必ずテストファースト（RED → GREEN → REFACTOR）
2. **Tidy First**: 構造変更と機能変更を分離してコミット
3. **Background Process**: ghostを使用（&, nohup等は禁止）
4. **不確実性**: 推測せず明確に質問し調査を行う
5. **コミット**: [STRUCTURAL] or [BEHAVIORAL] のプレフィックス必須

### 技術スタック
- **Runtime**: Deno 1.45+
- **Framework**: Hono
- **Database**: PostgreSQL + pgvector
- **AI**: Cerebras API
- **Embedding**: Ollama (bge-m3)
- **Testing**: Deno Test（実装予定）

### 既存設定
```bash
# 必要な環境変数
DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
CEREBRAS_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
KOKKAI_RAG_URL=http://localhost:8001/v1/search
```

## 参考情報

### ポート使用状況
- **8001**: Kokkai RAG API（シンプル検索）
- **8000**: Deep Research API（高度分析）

### 既存ファイル構成
```
api/
├── server.ts          # Deep Research API (✅実装済み)
└── kokkai_rag.ts      # Simple RAG API (✅実装済み)

services/
├── query-planning.ts       # ✅実装済み
├── multi-source-search.ts  # ✅実装済み
├── relevance-evaluation.ts # ✅実装済み
├── answer-generation.ts    # ✅実装済み
├── provider-registry.ts    # ✅実装済み
└── vector-search.ts        # ✅実装済み

providers/
├── base.ts           # ✅実装済み
├── http-rag.ts       # ✅実装済み
├── kokkai-db.ts      # ✅実装済み
└── adapter.ts        # ✅実装済み
```

### 実装優先順序の理由
1. **Phase 1優先**: 現在テストが皆無なため、品質保証が困難
2. **TDD準拠**: 既存実装の動作保証とリファクタリング安全性確保
3. **設定外部化**: 環境間移植性の向上

## まとめ

現在の実装は既に高度なDeep Research機能を提供していますが、テストコードの不在が最大のリスクです。TDDに従った品質基盤の構築を最優先に、段階的に運用品質を向上させる必要があります。