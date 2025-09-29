# Kokkai Deep Research API アーキテクチャドキュメント

## 概要

Kokkai Deep Research APIは、国会議事録を中心とした高度な情報検索・分析システムです。ユーザーの質問に対して、AI駆動のクエリプランニング、複数ソースからの情報収集、構造化された回答生成を行います。

## システム構成図

```
┌──────────────────────────────────────────────────────────────┐
│                         Client                               │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /v1/deepresearch
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│                 api/deepresearch.ts                          │
│  - リクエスト検証 (Valibot)                                  │
│  - CORS/認証/ロギング                                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│               Orchestration Layer                            │
│         services/deepresearch-orchestrator.ts                │
│  - 検索戦略の調整                                            │
│  - セクション別の証拠収集                                    │
│  - 重複除去と結果集約                                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        ▼            ▼            ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Query Planning│ │Multi-Source  │ │   Section    │ │ Duplication  │
│   Service    │ │   Search     │ │  Synthesis   │ │  Analyzer    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │            │
        │            ▼
        │    ┌──────────────────────────────────┐
        │    │    Provider Registry             │
        │    │  - KokkaiRagProvider (RAG検索)   │
        │    │  - OpenAIWebProvider (Web検索)   │
        │    └──────────────────────────────────┘
        │            │
        │            ▼
        │    ┌──────────────────────────────────┐
        │    │    Data Sources                  │
        │    │  - PostgreSQL + pgvector         │
        │    │  - Web Search APIs               │
        │    └──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI Services                               │
│  - OpenAI/OpenRouter (クエリプランニング、回答生成)          │
│  - Ollama/Novita (エンベディング生成)                        │
└──────────────────────────────────────────────────────────────┘
```

## 主要コンポーネント

### 1. API Layer (`api/deepresearch.ts`)

**役割**: HTTPリクエストの受信と処理、レスポンスの返却

**主要機能**:
- リクエストバリデーション (Valibot使用)
- CORS、認証、ロギングなどのミドルウェア管理
- エラーハンドリングとレスポンスフォーマット

**エンドポイント**:
- `GET /`: API情報とステータス
- `POST /v1/deepresearch`: メイン検索エンドポイント

### 2. Orchestration Layer (`services/deepresearch-orchestrator.ts`)

**役割**: 検索プロセス全体の制御と調整

**主要機能**:
- セクションごとの検索戦略の決定
- 複数イテレーションによる段階的な証拠収集
- 重複除去と結果の最適化
- カバレッジの追跡とログ出力

**セクション定義**:
```typescript
- purpose_overview: 概要・目的
- current_status: 現在の状況
- timeline: 時系列・経緯
- key_points: 要点
- background: 背景
- main_issues: 主要な論点
- reasons_for_amendment: 改正理由
- impact_analysis: 影響分析
- past_debates_summary: 過去の議論まとめ
```

### 3. Service Layer

#### Query Planning Service (`services/query-planning.ts`)

**役割**: ユーザーの質問を効果的なサブクエリに分解

**処理**:
1. 質問の内容を分析
2. 5-10個の具体的なサブクエリを生成
3. 各サブクエリは検索精度を高めるため特定の側面にフォーカス

**使用AI**: OpenAI GPT-4o-mini (設定可能)

#### Multi-Source Search Service (`services/multi-source-search.ts`)

**役割**: 複数のデータソースから並列検索

**主要機能**:
- 複数プロバイダーへの並列検索実行
- タイムアウト管理（30秒）
- エラーハンドリングとフォールバック

#### Section Synthesis Service (`services/section-synthesis.ts`)

**役割**: 収集された証拠から構造化された回答を生成

**処理**:
1. セクションごとに関連する証拠を選別
2. AI による要約生成
3. 引用の紐付けと管理

### 4. Provider Layer

#### Provider Registry (`providers/registry.ts`)

**役割**: 利用可能なデータソースの管理

**登録プロバイダー**:
- `KokkaiRagProvider`: 国会議事録データベース（直接接続）
- `OpenAIWebProvider`: Web検索（OpenAI経由）

#### KokkaiRagProvider (`providers/kokkai-rag.ts`)

**役割**: 国会議事録データベースへの直接アクセス

**特徴**:
- PostgreSQL + pgvectorによるベクトル検索
- 1024次元のbge-m3エンベディング
- 類似度スコアによるランキング

### 5. Data Layer

#### Vector Search Service (`services/vector-search.ts`)

**役割**: ベクトル類似検索の実行

**主要機能**:
- クエリのエンベディング生成
- pgvectorを使用した類似検索
- 構造化フィルタリング（話者、政党、日付など）

**検索モード**:
- シンプル検索: 類似度のみ
- 構造化検索: メタデータフィルタ併用
- フォールバック検索: 段階的な閾値調整

## 処理フロー

### 1. リクエスト受信
```typescript
{
  "query": "防衛費増額に関する議論",
  "limit": 15,
  "providers": ["kokkai-db", "web"]
}
```

### 2. クエリプランニング
入力質問を分析し、以下のようなサブクエリを生成:
- "防衛費 予算案 増額"
- "防衛力強化 財源確保"
- "GDP比2% 防衛費"
- "自衛隊 装備 調達"
- "安全保障 環境変化"

### 3. 証拠収集（イテレーション）

**第1イテレーション**: 基本検索
- 各サブクエリで検索実行
- セクションごとに結果を分類

**第2イテレーション**: 補強検索（必要に応じて）
- カバレッジが不足しているセクションを特定
- セクション特化のキーワードを追加して再検索

### 4. 重複除去と整理
- コンテンツハッシュによる重複検出
- スコアの高い証拠を優先保持
- セクション間のバランス調整

### 5. 回答生成
各セクションごとに:
1. 関連する証拠を選択
2. AIによる要約生成
3. 引用IDの紐付け

### 6. レスポンス返却
```typescript
{
  "query": "防衛費増額に関する議論",
  "sections": {
    "purpose_overview": {
      "summary": "防衛費増額は...",
      "citations": ["e1", "e3", "e5"]
    },
    // 他のセクション...
  },
  "evidence": [
    {
      "id": "e1",
      "content": "令和5年度防衛費は...",
      "metadata": {...}
    }
  ]
}
```

## 処理シーケンス図

### Deep Research API 処理フロー

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Layer<br/>(deepresearch.ts)
    participant O as Orchestrator
    participant QP as Query Planning<br/>Service
    participant MS as Multi-Source<br/>Search
    participant PR as Provider<br/>Registry
    participant KR as KokkaiRag<br/>Provider
    participant VS as Vector Search<br/>Service
    participant DB as PostgreSQL<br/>(pgvector)
    participant SS as Section<br/>Synthesis
    participant AI as OpenAI API

    C->>API: POST /v1/deepresearch<br/>{"query": "防衛費増額"}
    API->>API: Valibot検証

    %% Query Planning Phase
    API->>QP: generateSubqueries(query)
    QP->>AI: クエリ分解依頼
    AI-->>QP: サブクエリリスト
    QP-->>API: ["防衛費 予算案",<br/>"GDP比2%", ...]

    %% Orchestration Phase
    API->>O: run(subqueries, providers)
    O->>O: セクション別クエリ構築

    Note over O,MS: 全セクション並列検索（1回のみ）

    par セクション1: purpose_overview
        O->>MS: searchAcross(providers, query)
        MS->>KR: search("概要 目的 " + subqueries)
        KR->>VS: simpleSearch(query, limit)
        VS->>DB: ベクトル類似検索
        DB-->>VS: 検索結果
        VS-->>KR: SpeechResult[]
        KR-->>MS: DocumentResult[]
    and セクション2: current_status
        O->>MS: searchAcross(providers, query)
        MS->>KR: search("現状 進捗 " + subqueries)
        KR->>VS: simpleSearch(query, limit)
        VS->>DB: ベクトル類似検索
        DB-->>VS: 検索結果
        VS-->>KR: SpeechResult[]
        KR-->>MS: DocumentResult[]
    and その他セクション
        O->>MS: 各セクションの検索実行
        MS-->>O: 各セクション結果
    end

    O->>O: 全結果統合
    O->>O: sectionHitMap構築<br/>(doc→sections マッピング)
    O->>O: カバレッジ計算<br/>(current vs targets)
    O->>O: 重複分析と除去<br/>(DuplicationAnalyzer)
    O->>O: セクション内重複除去

    Note over O: カバレッジ不足でも続行<br/>(追加検索なし)

    O-->>API: 収集した証拠と<br/>セクションマッピング<br/>(iterations: 1)

    %% Synthesis Phase
    API->>SS: synthesize(sections, documents)

    loop 各セクション
        SS->>SS: 関連証拠を選択
        SS->>AI: セクション要約生成
        AI-->>SS: 要約テキスト
        SS->>SS: 引用ID紐付け
    end

    SS-->>API: セクション別要約

    %% Response
    API->>API: レスポンス構築
    API-->>C: DeepResearchResponse<br/>{sections, evidence}
```

### ベクトル検索の詳細フロー

```mermaid
sequenceDiagram
    participant VS as Vector Search<br/>Service
    participant EP as Embedding<br/>Provider
    participant DB as PostgreSQL
    participant AI as Ollama/Novita

    VS->>EP: generateEmbedding(query)
    EP->>AI: エンベディング生成要求
    AI-->>EP: 1024次元ベクトル
    EP-->>VS: Float32Array

    VS->>VS: 検索モード決定

    alt シンプル検索
        VS->>DB: SELECT ... ORDER BY<br/>embedding <=> $1<br/>LIMIT $2
    else 構造化検索
        VS->>DB: SELECT ... WHERE<br/>speaker IN (...) AND<br/>embedding <=> $1 > 0.8
    else フォールバック検索
        VS->>DB: 段階的閾値での検索<br/>(0.6 → 0.7 → 0.8)
    end

    DB-->>VS: 検索結果
    VS->>VS: SpeechResult構築
    VS-->>VS: スコアでソート
```

## データベース構造

### テーブル: `kokkai_speech_embeddings`

| カラム名        | 型           | 説明             |
|-----------------|--------------|------------------|
| speech_id       | VARCHAR(255) | 発言ID（主キー） |
| speaker         | VARCHAR(255) | 発言者名         |
| speaker_group   | VARCHAR(255) | 所属政党・会派   |
| speaker_role    | VARCHAR(255) | 役職             |
| date            | DATE         | 発言日           |
| meeting_name    | VARCHAR(255) | 会議名           |
| speech_text     | TEXT         | 発言内容         |
| speech_url      | TEXT         | 議事録URL        |
| issue_area      | VARCHAR(255) | 議題分野         |
| political_party | VARCHAR(255) | 政党             |
| created_at      | TIMESTAMP    | 作成日時         |
| embedding       | VECTOR(1024) | ベクトル表現     |

**インデックス**:
- HNSW インデックス on `embedding` (ベクトル検索用)
- B-tree インデックス on `speaker`, `date`, `meeting_name`

## 設定と環境変数

### 必須環境変数
```bash
# データベース接続
DATABASE_URL=postgresql://user:pass@localhost:5432/kokkai_db

# AI サービス
OPENAI_API_KEY=sk-...  # またはOPENROUTER_API_KEY

# エンベディング（選択）
EMBEDDING_PROVIDER=novita  # または ollama
EMBEDDING_API_KEY=...      # Novitaの場合
OLLAMA_BASE_URL=http://localhost:11434  # Ollamaの場合
```

### 設定定数 (`config/deepresearch-constants.ts`)
```typescript
// セクションごとの目標証拠数
SECTION_TARGET_COUNTS = {
  purpose_overview: 3,
  current_status: 3,
  timeline: 3,
  // ...
}

// セクションごとの許可プロバイダー
SECTION_ALLOWED_PROVIDERS = {
  purpose_overview: ["kokkai-db", "web"],
  past_debates_summary: ["kokkai-db"],  // 国会議事録のみ
  // ...
}
```

## 開発ガイド

### セットアップ

1. **環境準備**
```bash
# PostgreSQLとpgvectorの起動
docker compose up -d postgres

# 環境変数の設定
cp .env.example .env
# .envを編集

# 依存関係のインストール（Denoは自動）
```

2. **データベース準備**
```bash
# エンベディング生成（初回のみ）
deno run -A scripts/persistent-embed-speeches.ts --limit 100
```

3. **サーバー起動**
```bash
# Deep Research API
deno run -A api/deepresearch.ts
```

### 新しいプロバイダーの追加

1. `providers/base.ts` の `SearchProvider` インターフェースを実装
2. `providers/registry.ts` に登録
3. 必要に応じて `SECTION_ALLOWED_PROVIDERS` を更新

### 新しいセクションの追加

1. `config/deepresearch-constants.ts` で定義
2. `SECTION_TARGET_COUNTS` に目標数を設定
3. `SECTION_ALLOWED_PROVIDERS` で利用可能なプロバイダーを指定
4. `services/deepresearch-orchestrator.ts` の `SECTION_KEYWORD_HINTS` にヒントを追加

## トラブルシューティング

### よくある問題

**Q: "DATABASE_URL environment variable is required" エラー**
A: `.env` ファイルにデータベース接続情報を設定してください

**Q: エンベディング生成が遅い**
A:
- バッチサイズを調整: `--batch-size 10`
- Novita APIの使用を検討（Ollamaより高速）

**Q: 検索結果が期待と異なる**
A:
- 類似度閾値を調整（`VECTOR_SIMILARITY_THRESHOLD_*` 定数）
- クエリプランニングのプロンプトを改善

### デバッグ方法

1. **ログレベルの設定**
```typescript
// 詳細ログを有効化
console.log("[Orchestrator] Coverage:", coverageLog);
```

2. **個別サービスのテスト**
```bash
# ベクトル検索のテスト
deno run -A scripts/search-cli.ts

# テストの実行
deno test -A services/*_test.ts
```

## パフォーマンス最適化

### 推奨設定

- **データベース接続プール**: 10接続（MAX_DB_CONNECTIONS）
- **検索タイムアウト**: 30秒
- **バッチサイズ**: 10-20（エンベディング生成時）
- **キャッシュ**: 今後実装予定

### スケーリング戦略

1. **水平スケーリング**
   - API サーバーの複数インスタンス起動
   - ロードバランサーで分散

2. **データベース最適化**
   - pgvectorインデックスの調整
   - パーティショニングの検討（日付別など）

3. **AI処理の最適化**
   - モデルの選択（速度 vs 精度のトレードオフ）
   - バッチ処理の活用

## まとめ

Kokkai Deep Research APIは、モジュラーで拡張可能なアーキテクチャを採用しています。各コンポーネントは明確な責務を持ち、新しいデータソースやセクションの追加が容易です。AI駆動の検索と分析により、複雑な質問に対して構造化された包括的な回答を提供します。
