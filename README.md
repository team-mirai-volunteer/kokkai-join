# kokkai-join

みらい議会のdeep research api

## プロジェクト構成

```
kokkai-join/
├── frontend/          # Vite + React 19 フロントエンド
├── backend/           # Hono 4.9.9 バックエンドAPI
├── supabase/          # Supabase ローカル設定
└── types/             # 共有型定義
```

## 技術スタック

### フロントエンド
- **Framework**: Vite + React 19
- **UI**: Tailwind CSS v4
- **認証**: Supabase Auth
- **状態管理**: React Context API
- **パッケージマネージャー**: Bun

### バックエンド
- **Framework**: Hono 4.9.9
- **認証**: Supabase Auth (JWT検証)
- **データベース**: PostgreSQL + pgvector
- **ランタイム**: Node.js
- **パッケージマネージャー**: npm

### インフラ
- **認証・DB**: Supabase (ローカル開発対応)
- **コンテナ**: Docker (Supabase用)

## 必要な環境

- **Node.js**: v20以上
- **Bun**: 最新版
- **Docker**: 最新版 (Supabase用)
- **Homebrew**: (macOS) Supabase CLI インストール用

## ローカル開発環境のセットアップ

### 1. 依存パッケージのインストール

```bash
# フロントエンド
cd frontend
bun install

# バックエンド
cd ../backend
bun install
```

### 2. Supabase CLI のインストール（未インストールの場合）

```bash
# macOS
brew install supabase/tap/supabase

# その他のOSの場合は公式ドキュメントを参照
# https://supabase.com/docs/guides/cli/getting-started
```

### 3. Supabase の起動

```bash
# プロジェクトルートで実行
supabase start

# 起動後、以下の情報が表示されます
# API URL: http://127.0.0.1:54321
# Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
# Mailpit URL: http://127.0.0.1:54324
# Publishable key: sb_publishable_...
# Secret key: sb_secret_...
```

### 4. 環境変数の設定

既存の環境変数ファイルを確認し、必要に応じて更新：

**backend/.env**
```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # supabase start で表示された値
DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
```

**frontend/.env.development**
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_...  # supabase start で表示された値
VITE_API_ENDPOINT=http://localhost:8000/api
```

### 5. 開発サーバーの起動

```bash
# バックエンド（http://localhost:8000）
cd backend
bun run dev
# または ghost を使用する場合
ghost run bun run dev

# フロントエンド（http://localhost:5173 または 5174）
cd frontend
bun dev
# または ghost を使用する場合
ghost run bun dev
```

### 6. テストユーザーの作成

初回ログイン用のテストユーザーを作成します：

```bash
# デフォルトユーザーを作成
bun scripts/create-test-user.js

# カスタムユーザーを作成
bun scripts/create-test-user.js myuser@example.com mypassword
```

**デフォルトのテストユーザー認証情報**:
- Email: `test@example.com`
- Password: `test123456`

### 7. 動作確認

1. ブラウザで `http://localhost:5173` (または 5174) にアクセス
2. 上記で作成したテストユーザーでログイン
3. ログイン成功後、メインアプリケーション画面が表示されます
4. ログアウトボタンでログアウトできることを確認

## 開発用コマンド

### フロントエンド

```bash
cd frontend

bun dev          # 開発サーバー起動
bun run build    # プロダクションビルド
bun run preview  # ビルドのプレビュー
bun run lint     # Lintチェック
bun run fmt      # フォーマットチェック＆自動修正
bun run type-check  # 型チェック
bun test         # テスト実行
```

### バックエンド

```bash
cd backend

bun run dev      # 開発サーバー起動
bun run build    # TypeScriptビルド
bun run start    # プロダクションサーバー起動
bun run lint     # Lintチェック
bun run fmt      # フォーマットチェック＆自動修正
bun run type-check  # 型チェック
bun test         # テスト実行
```

### Supabase

```bash
# Supabase の起動
supabase start

# Supabase の停止
supabase stop

# Supabase の状態確認
supabase status

# データベースマイグレーション
supabase db reset

# 型定義の再生成
supabase gen types typescript --local > types/supabase.types.ts
```

## Supabase Studio

Supabaseの管理画面にアクセスできます：

- URL: `http://127.0.0.1:54323`
- データベーステーブルの確認
- ユーザー管理
- 認証設定
- SQLエディタ

## Mailpit (ローカルメール確認)

ローカル環境で送信されたメールを確認できます：

- URL: `http://127.0.0.1:54324`
- パスワードリセットメールなどの確認に使用

## トラブルシューティング

### Supabase が起動しない

```bash
# コンテナを完全停止してから再起動
supabase stop
docker system prune -f
supabase start
```

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :5173  # フロントエンド
lsof -i :8000  # バックエンド
lsof -i :54321 # Supabase API

# プロセスを停止してから再起動
```

### 型定義エラー

```bash
# 型定義を再生成
cd /path/to/kokkai-join
supabase gen types typescript --local > types/supabase.types.ts

# フロントエンド用にコピー（既にある場合はスキップ）
# cp types/supabase.types.ts frontend/types/

# バックエンド用にコピー（既にある場合はスキップ）
# cp types/supabase.types.ts backend/types/
```

### 環境変数が読み込まれない

```bash
# .env ファイルが正しい場所にあるか確認
ls backend/.env
ls frontend/.env.development

# Supabaseの接続情報を再確認
supabase status
```
