# backend の動かし方

本ディレクトリは Kokkai（国会会議録）向けの RAG 検索と Deep Research API を提供します。
- Kokkai RAG API: ベクトル検索のみ（要約なし）
- Deep Research API: クエリ計画・情報統合・回答生成（Kokkai RAG などの情報源を利用）

## 前提
- Docker / Docker Compose
- Deno 1.45+（`deno -V`）
- Ollama（`bge-m3` を使用）

## 初期設定
```bash
cd backend
cp .env.example .env
# .env を編集して以下を設定
# DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
# OLLAMA_BASE_URL=http://localhost:11434
# OPENAI_API_KEY=...
# LLM_MODEL=gpt-4o-mini
```

## 1) データベース起動（pgvector）
```bash
docker compose up -d postgres
# healthy になるまで待機
```

## 2) 埋め込み投入（初回・検証用）
十分に `kokkai_speech_embeddings` がある場合はスキップ可。
```bash
# 少量テスト（100件）
deno run -A scripts/persistent-embed-speeches.ts --limit 100
# 期間指定で実行
deno run -A scripts/persistent-embed-speeches.ts --batch-size 20 --start-date 2023-01-01
```

## 3) Kokkai RAG API（検索専用）
```bash
# チェック
deno check api/kokkai_rag.ts
# 起動（デフォルト: :8001）
deno run -A api/kokkai_rag.ts
# ヘルスチェック
curl http://localhost:8001/v1/health
# 検索例（結果のみ）
curl -s -X POST http://localhost:8001/v1/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"防衛費","limit":5}' | jq '.results[0]'
```

## 4) Deep Research API（要約・統合）
```bash
export KOKKAI_RAG_URL=http://localhost:8001/v1/search
export OPENAI_API_KEY=...  # 必須
# チェック
deno check api/server.ts
# 起動（デフォルト: :8000）
deno run -A api/server.ts
# ルート
curl http://localhost:8000/
# Deep Research v1（セクション+引用JSON）
curl -s -X POST http://localhost:8000/v1/deepresearch \
  -H 'Content-Type: application/json' \
  -d '{
        "query":"電子B/Lの法改正",
        "asOfDate":"2025-09-08",
        "limit":20,
        "providers":["kokkai-db"],
        "seedUrls":[
          "https://www.moj.go.jp/...",
          "https://www.sangiin.go.jp/..."
        ]
      }' | jq '.sections.timeline'
```

## 5) データベースダンプ（任意）
```bash
# ./data にフルダンプを作成
deno run -A scripts/dump-db.ts
```

## トラブルシュート
- Ollama 未起動/モデル未取得 → `ollama pull bge-m3`、`OLLAMA_BASE_URL` を確認。
- 8001/8000 が使用中 → `KOKKAI_RAG_PORT` / `PORT` で変更。
- Deep Research は DB に直接接続しません（`KOKKAI_RAG_URL` 経由が必須）。
