# 国会議事録Deep Research システム TODO

## 実装済み項目 ✅

### インフラストラクチャ
- [x] **PostgreSQL + pgvector環境構築**
  - Docker Compose設定 (`backend/compose.yaml`)
  - pgvector拡張有効化
  - データベース: `kokkai_db`
  - コンテナ: `kokkai-postgres`

- [x] **データベースリストア**  
  - 議事録ダンプファイル配置 (`backend/data/`)
  - 1,184,779件の発言データ
  - 10,997件の会議データ
  - 5,412件の議員マスター

- [x] **URL構成パターン確認**
  - 出典URL: `https://kokkai.ndl.go.jp/txt/{issueID}/{speechOrder}`
  - テーブル関係確認 (`Speech` ↔ `Meeting`)

### 設計・調査
- [x] **Deep Research仕組み調査**
  - ChatGPT Deep Research vs GPT5回答の比較分析
  - 4層アーキテクチャの採用決定

- [x] **技術選定**
  - LlamaIndex.TS採用
  - pgvector-node直接使用（PGVectorStore互換性問題により）
  - 構造化検索の必要性確認

- [x] **システム設計**
  - GPT5の4層アーキテクチャをベースとした設計
  - 将来のWeb検索拡張を考慮したStrategy Pattern
  - 国会議事録特化のエンティティ抽出設計

### 実装完了項目 🎉

#### Phase 0: RAG-CLI MVP ✅ **完了**
- [x] **プロジェクト環境設定**
  - `backend/.env` 設定完了
  - `backend/deno.json` 設定完了
  - Ollama BGE-M3 + GPT-OSS:20B 動作確認

- [x] **ベクトル永続化システム**
  - `scripts/persistent-embed-speeches.ts` 実装完了
  - pgvector + PostgreSQLによる永続ベクトルストレージ
  - バッチ処理（50件×20バッチ = 1,000件）での動作確認
  - エラー率0%、処理速度10.9 docs/sec

- [x] **RAG検索システム**  
  - `scripts/persistent-rag-cli.ts` 実装完了
  - 永続化ベクトルからの高速検索
  - LLM（GPT-OSS:20B）による回答生成
  - 検索統計情報表示

- [x] **データ品質の確保**
  - NULL/空文字列の適切な処理
  - 重複データ回避
  - 進捗監視・エラーハンドリング

#### Phase 2.2: 埋め込みベクトル生成 ✅ **完了**
- [x] **大規模データ処理対応**
  - 1,000件のベクトル化実行（テスト完了）
  - 全106万件への対応準備完了
  - メモリ効率的なバッチ処理

- [x] **検索品質検証**
  - 「防衛費について」: 防衛省装備品・安全保障関連で高精度（類似度0.592）
  - 「岸田総理の経済政策について」: ガソリン税・関税政策で関連度高（類似度0.541）
  - セマンティック検索の有効性確認

#### コードベース整理 ✅ **完了**
- [x] **不要スクリプト削除**
  - `embed-speeches.ts` 削除（非永続化版）
  - `rag-cli-with-db.ts` 削除（検索時ベクトル化の非効率版）
  - `rag-cli.ts` 削除（初期プロトタイプ）
  - 現在は永続化対応の2スクリプトのみに整理

---

## 現在利用可能な機能 🚀

### 実用的なRAG検索システム
現在以下の機能が完全に動作します：

#### **1. ベクトル化バッチ処理**
```bash
# 使用方法
deno run -A scripts/persistent-embed-speeches.ts [batchSize] [maxBatches]

# 例：50件ずつ20バッチ（計1,000件）を処理
deno run -A scripts/persistent-embed-speeches.ts 50 20

# 例：100件ずつ100バッチ（計10,000件）を処理  
deno run -A scripts/persistent-embed-speeches.ts 100 100
```

#### **2. 永続化RAG検索**
```bash
# 使用方法
deno run -A scripts/persistent-rag-cli.ts "検索クエリ"

# 例：防衛費関連の議事録を検索
deno run -A scripts/persistent-rag-cli.ts "防衛費について"

# 例：経済政策関連の議事録を検索
deno run -A scripts/persistent-rag-cli.ts "岸田総理の経済政策について"
```

### 動作確認済みの機能
- ✅ **高品質セマンティック検索**: BGE-M3による日本語ベクトル化
- ✅ **永続ベクトルストレージ**: PostgreSQL + pgvectorによる高速検索
- ✅ **LLM回答生成**: GPT-OSS:20Bによる包括的回答作成
- ✅ **出典URL自動生成**: 国会議事録の正式URLを自動構築
- ✅ **バッチ処理**: 大量データの効率的処理（10.9 docs/sec）
- ✅ **エラーハンドリング**: 堅牢な例外処理とデータ品質管理

---

## 未実装項目（優先度順）

---

### Phase 1: 基盤実装 🔥

#### 1.1 プロジェクト初期化
- [x] **Deno環境確認**
  ```bash
  deno --version  # v1.40+ 推奨
  cd backend
  ```

- [x] **Ollama環境確認**
  ```bash
  # Ollamaインストール確認
  ollama --version
  
  # 必要モデルのダウンロード
  ollama pull bge-m3          # 埋め込み用
  ollama pull gpt-oss:20b     # チャット用
  
  # サーバー起動確認
  ollama serve               # localhost:11434
  ```

- [ ] **プロジェクト初期化**
  ```bash
  cd backend
  # JSRパッケージの追加
  deno add jsr:@std/dotenv
  deno add jsr:@std/http
  ```

- [ ] **依存関係確認**
  ```typescript
  // npm パッケージ
  import { VectorStoreIndex, Settings } from "npm:llamaindex";
  import { Ollama, OllamaEmbedding } from "npm:@llamaindex/ollama";
  import { PGVectorStore } from "npm:@llamaindex/community";
  import { Pool } from "npm:pg";
  import { TinySegmenter } from "npm:tiny-segmenter";
  
  // JSR パッケージ
  import { load } from "jsr:@std/dotenv";
  import { serve } from "jsr:@std/http/server";
  ```

- [ ] **環境設定ファイル**
  ```bash
  # backend/.env
  DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
  OLLAMA_BASE_URL=http://localhost:11434
  
  # backend/deno.json
  {
    "imports": {
      "@std/dotenv": "jsr:@std/dotenv@^0.225.5",
      "@std/http": "jsr:@std/http@^0.224.0"
    },
    "tasks": {
      "dev": "deno run --allow-net --allow-env --allow-read --watch main.ts"
    }
  }
  ```

#### 1.2 PGVectorStore初期化
- [ ] **PGVectorStore 設定**
  ```typescript
  const vectorStore = new PGVectorStore({
    connectionString: process.env.DATABASE_URL!,
    tableName: "kokkai_vectors",        // 国会議事録用
    dimension: 1024,                    // BGE-M3 embedding
    schemaName: "public"
  });
  ```
  - LlamaIndexが自動でテーブル作成
  - 独自SQL不要でシンプル

#### 1.3 基盤クラス実装  
- [ ] **KokkaiDeepResearch メインクラス**
  - PGVectorStore初期化
  - データベース接続プール
  - Strategy Pattern基盤

- [ ] **エンティティ抽出機能**
  ```typescript
  extractKokkaiEntities(query: string): Promise<KokkaiEntities>
  ```

### Phase 2: 検索機能実装 🚀

#### 2.1 検索戦略実装
- [ ] **StructuredSearchStrategy**
  - SQL動的クエリ構築
  - 議員名・政党・日付・会議での絞り込み
  - メタデータ付きSearchResult生成
  - 既存のSpeech/Meetingテーブルを直接検索

- [ ] **VectorSearchStrategy** 
  - PGVectorStore.similaritySearch() を使用（MVP）
  - LlamaIndex標準のセマンティック検索
  - Document.metadata でフィルタ機能
  - 標準チャンキング（十分実用的）

- [ ] **StatisticalAnalysisStrategy**
  - 発言頻度分析
  - 時系列トレンド分析  
  - 政党間比較

#### 2.2 データ前処理
- [ ] **Document作成機能**
  ```typescript
  createDocumentFromSpeech(speech: Speech, metadata: SpeechMetadata): Document
  ```

- [ ] **埋め込みベクトル生成バッチ**
  - 既存Speechデータの埋め込み生成
  - Ollama BGE-M3で埋め込み処理
  - PGVectorStore.add() で保存
  - LlamaIndex標準チャンキング使用
  - 進捗表示機能

### Phase 3: Deep Research実装 🧠

#### 3.1 4層アーキテクチャ
- [ ] **Planner実装**  
  ```typescript
  planKokkaiQuery(question: string): Promise<QueryPlan>
  planSubqueries(question: string): Promise<string[]>
  ```

- [ ] **Searcher実装**
  ```typescript  
  searchMultiSource(plan: QueryPlan): Promise<SearchResult[]>
  rankAndMerge(results: SearchResult[]): SearchResult[]
  ```

- [ ] **Synthesizer実装**
  ```typescript
  synthesizeWithSources(question: string, results: SearchResult[]): Promise<string>  
  ```

- [ ] **Critic実装**
  ```typescript
  critique(answer: string): Promise<string[]>
  calculateConfidence(results: SearchResult[]): number
  ```

#### 3.2 メイン実行機能
- [ ] **deepResearch メソッド**
  - 反復的改善ループ  
  - 処理時間測定
  - 統計情報生成

### Phase 4: API・インターフェース 🌐

#### 4.1 REST API
- [ ] **Deno HTTP Server セットアップ**
  ```typescript
  import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
  ```
- [ ] **検索エンドポイント**
  ```
  POST /api/research
  {
    "question": "岸田総理の2024年の防衛費に関する発言",
    "options": { "maxRounds": 3 }
  }
  ```

- [ ] **レスポンス形式標準化**
  ```typescript
  KokkaiResearchResult
  ```

#### 4.2 簡易CLI
- [ ] **コマンドライン実行**
  ```bash
  deno run --allow-net --allow-env --allow-read research.ts "質問内容"
  ```
- [ ] **権限設定**
  - `--allow-net`: データベース接続・API通信用
  - `--allow-env`: 環境変数読み取り用
  - `--allow-read`: 設定ファイル読み取り用

### Phase 5: 品質・パフォーマンス向上 ⚡

#### 5.1 テスト実装
- [ ] **ユニットテスト** (Deno標準テストランナー)
  ```bash
  deno test --allow-net --allow-env tests/
  ```
- [ ] **統合テスト**
- [ ] **エンドツーエンドテスト**

#### 5.2 最適化
- [ ] **検索パフォーマンス測定**
- [ ] **インデックス最適化**  
- [ ] **並列処理最適化**
- [ ] **メモリ使用量最適化**

#### 5.3 モニタリング
- [ ] **ログ機能**
- [ ] **メトリクス収集**
- [ ] **エラーハンドリング強化**

### Phase 6: 将来拡張（v2.0以降）

#### 6.1 Web検索統合
- [ ] **WebSearchStrategy基盤**
- [ ] **Tavily API統合**
- [ ] **信頼度重み付け機能**

#### 6.2 UI/UX
- [ ] **Next.js フロントエンド**
- [ ] **リアルタイム進捗表示**
- [ ] **インタラクティブ出典表示**

#### 6.3 高度分析機能
- [ ] **時系列分析**
- [ ] **政党間比較ダッシュボード**
- [ ] **議題別トレンド分析**


---

## 次のアクション

### 直近の実装優先度

1. **Phase 0.1-0.4**: RAG-CLI MVP実装 (1-2日) **←最優先**
2. **Phase 1.1-1.2**: プロジェクト初期化 + DB拡張 (1-2日)
3. **Phase 1.3**: 基盤クラス実装 (2-3日)  
4. **Phase 2.1**: 構造化検索実装 (3-4日)
5. **Phase 2.2**: ベクトル検索・埋め込み生成 (3-5日)
6. **Phase 3.1**: 4層アーキテクチャ実装 (5-7日)

### マイルストーン

**✅ RAG-CLI MVP (Phase 0) - 完了**
- `deno run -A scripts/persistent-rag-cli.ts "検索内容"` が動作
- pgvector + PostgreSQL + Ollama BGE-M3 による高品質検索
- 出典URL付き結果表示
- LLMによる包括的回答生成

**🚀 現在の状況**
- **永続化ベクトルシステム完成**: 1,000件処理確認済み、106万件対応可能
- **実用的RAG検索**: 高精度セマンティック検索 + LLM回答生成
- **スケーラビリティ確保**: バッチ処理による大量データ対応

**次の目標: Deep Research MVP (Phase 1-3)**  
- 4層アーキテクチャ実装（Planner → Searcher → Synthesizer → Critic）
- 構造化検索戦略の実装
- より高度な多段階検索・分析機能

**v1.0 目標**  
- パフォーマンス最適化
- REST API実装
- フロントエンド連携

**v2.0 目標**
- Web検索統合
- インタラクティブUI
- 高度分析機能（時系列・政党比較など）

---

## 技術的課題・注意点

### 既知の課題
- [ ] **PostgreSQL接続プールサイズ調整**
- [ ] **大量データ処理時のメモリ管理**
- [ ] **日本語トークナイザの精度向上**
- [ ] **埋め込み生成の処理時間最適化**
- [ ] **Deno権限設定の最適化**
- [ ] **npm:パッケージ互換性確認**

### 検討事項  
- [x] **OpenAI API vs ローカルLLM の選択** → **Ollama採用決定**
- [x] **埋め込みモデル選択** → **BGE-M3採用決定** (1024次元)
- [ ] **チャンクサイズの最適化**
- [ ] **インデックス戦略の詳細設計**
- [ ] **DenoでのPGVectorStore互換性**
- [ ] **npm:パッケージ vs Deno標準ライブラリの使い分け**

### 削除した項目
- ~~**Phase 6: 将来拡張対応**~~ → MVP完成後に別途検討
- ~~**独自speech_embeddingsテーブル**~~ → PGVectorStoreで十分実用的
- ~~**高度特化チャンキング**~~ → LlamaIndex標準で十分
