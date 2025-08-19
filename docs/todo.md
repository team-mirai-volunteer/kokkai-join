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
  - PGVectorStore vs テキストベースVectorStoreの比較
  - 構造化検索の必要性確認

- [x] **システム設計**
  - GPT5の4層アーキテクチャをベースとした設計
  - 将来のWeb検索拡張を考慮したStrategy Pattern
  - 国会議事録特化のエンティティ抽出設計

---

## 未実装項目（優先度順）

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

1. **Phase 1.1-1.2**: プロジェクト初期化 + DB拡張 (1-2日)
2. **Phase 1.3**: 基盤クラス実装 (2-3日)  
3. **Phase 2.1**: 構造化検索実装 (3-4日)
4. **Phase 2.2**: ベクトル検索・埋め込み生成 (3-5日)
5. **Phase 3.1**: 4層アーキテクチャ実装 (5-7日)

### マイルストーン

**MVP (Minimum Viable Product)**  
- **PGVectorStore** による基本的な国会議事録検索
- 出典URL付き回答生成
- 簡易CLI実行
- 4層Deep Research の基本実装

**v1.0**  
- パフォーマンス最適化
- REST API充実
- エラーハンドリング強化

**v2.0**
- Web検索統合
- フロントエンド
- 高度分析機能

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
