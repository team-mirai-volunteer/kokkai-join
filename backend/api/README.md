# Kokkai Deep Research API

国会議事録深層調査システムのHono API実装

## 概要

国会議事録を深層調査・分析するRESTful APIです。

## 機能

- **国会議事録深層調査**: ベクトル検索による類似発言の抽出と分析
- **AI深層分析**: Cerebras LLMによる多角的分析と回答生成
- **ヘルスチェック**: サービス状態の確認
- **CORS対応**: ブラウザからの直接アクセス可能

## API エンドポイント

### GET /
API情報とエンドポイント一覧を返します。


### POST /search
国会議事録を深層調査して多角的分析を実行します。

**リクエスト:**
```json
{
  "query": "防衛費と子育て支援と消費税についての最近の議論",
  "limit": 20
}
```

**レスポンス:**
```json
{
  "query": "防衛費の増額について",
  "answer": "## 全体のまとめ\n\n- 防衛費の増額について複数の観点から議論が展開されており...\n- 子育て支援政策では財源確保の課題が指摘されている...\n- 消費税に関しては減税と社会保障の両面での議論が活発化している...",
  "sources": [
    {
      "speaker": "岸田文雄",
      "party": "自由民主党",
      "date": "2023-03-15",
      "content": "防衛費について...",
      "url": "https://kokkai.ndl.go.jp/...",
      "similarity_score": 0.85
    }
  ],
  "metadata": {
    "totalResults": 15,
    "processingTime": 2500,
    "timestamp": "2025-09-01T12:00:00.000Z"
  }
}
```

## 環境変数

以下の環境変数が必要です：

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/kokkai_db
CEREBRAS_API_KEY=your_cerebras_api_key
OLLAMA_BASE_URL=http://localhost:11434  # オプション（デフォルト値）
PORT=8000  # オプション（デフォルト値）
```

## 使用方法

**注意**: 以下のコマンドは `backend/` ディレクトリから実行してください。

```bash
cd backend
```

### 1. 開発サーバーの起動

```bash
# 依存関係の確認
deno check api/server.ts

# サーバー起動
deno run -A api/server.ts

# 別のポートで起動
PORT=443 deno run -A api/server.ts
```

### 1-b. Kokkai RAG API（検索専用）の起動（新規）

```bash
# 依存関係の確認
deno check api/kokkai_rag.ts

# Kokkai RAG API 起動（デフォルト :8001）
deno run -A api/kokkai_rag.ts

# 動作確認
curl http://localhost:8001/v1/health

# 検索例（結果のみ・要約なし）
curl -s -X POST http://localhost:8001/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "防衛費", "limit": 5}'
```

### 2. API テスト

```bash
# 検索リクエスト
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "防衛費と子育て支援と消費税についての政策議論", "limit": 10}'
```

## アーキテクチャ

```
[Client Request] 
    ↓
[Hono Middleware] (CORS, Logger, Validator)
    ↓  
[RAG Pipeline]
    ├── QueryPlanningService (クエリ計画)
    ├── VectorSearchService (ベクトル検索)
    ├── RelevanceEvaluationService (関連度評価)
    └── AnswerGenerationService (回答生成)
    ↓
[JSON Response]
```

### マイクロサービス分離（段階的）

- Kokkai RAG API: ベクトル検索と結果返却のみ（`api/kokkai_rag.ts`）。
- Deep Research API: クエリ計画・複数プロバイダ統合・要約生成（`api/server.ts`）。
  - 将来的に Deep Research から Kokkai RAG API を HTTP 経由で呼び出す構成へ移行予定。

## 依存関係

- **Hono**: 軽量Web フレームワーク
- **pgvector**: ベクトル検索
- **Ollama**: 埋め込みモデル（BGE-M3）
- **Cerebras**: LLM推論
- **PostgreSQL**: データベース

## エラーハンドリング

- **400**: リクエスト形式エラー
- **404**: エンドポイント未存在
- **500**: サーバー内部エラー
- **503**: サービス利用不可（ヘルスチェック失敗時）

## パフォーマンス

- **並行処理**: 複数リクエストの同時処理対応
- **エラー復旧**: 一時的な障害からの自動回復
- **タイムアウト**: 適切なタイムアウト設定
- **ログ**: 詳細なリクエストログ
