# 国会ジョイン - フロントエンド

国会会議録を使いやすいUI/UXで表示し、国民が議論に参加したり、国会の議題に対して見識を深めるためのプラットフォームです。

## 技術スタック

- **Framework**: Next.js 15.4.6 (App Router)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v7
- **Database**: PostgreSQL with Prisma ORM
- **Package Manager**: Bun
- **Testing**: Jest + React Testing Library

## セットアップ

### 1. 環境変数の設定

```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env
# 必要に応じて.envの値を編集
```

### 2. 依存関係のインストール

```bash
bun install
```

### 3. データベースのセットアップ

```bash
# PostgreSQLをDockerで起動
docker-compose up -d

# データベースマイグレーション
bun run db:migrate

# 初期データの同期（2025年のデータ）
bun run sync:data
```

### 4. 開発サーバーの起動

```bash
bun dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 主なスクリプト

```bash
bun dev          # 開発サーバー起動
bun run build    # プロダクションビルド
bun run start    # プロダクションサーバー起動
bun run lint     # ESLintチェック
bun run format   # Prettierでフォーマット
bun test         # Jestテスト実行
bun run db:migrate    # Prismaマイグレーション
bun run db:generate   # Prismaクライアント生成
bun run sync:data     # 国会データ同期
```

## プロジェクト構造

```
frontend/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── meeting/[id]/    # 会議詳細ページ
│   │   ├── search/          # 検索ページ
│   │   └── page.tsx         # トップページ
│   ├── components/          # 共通コンポーネント
│   └── lib/                 # ユーティリティとライブラリ
│       ├── actions/         # Server Actions
│       ├── api/             # APIクライアント
│       ├── db/              # データベース関連
│       ├── types/           # 型定義
│       └── utils/           # ユーティリティ関数
├── prisma/                  # Prismaスキーマとマイグレーション
├── scripts/                 # スタンドアロンスクリプト
└── docs/                    # ドキュメント

```

## ドキュメント

詳細なドキュメントは以下を参照してください：

- [データベースセットアップ](./docs/setup/README_DATABASE.md)
- [マイグレーション手順](./docs/setup/README_MIGRATION.md)
- [データ同期](./docs/setup/README_SYNC.md)
- [Speaker テーブル設計](./docs/SPEAKER_TABLE_DESIGN.md)

## 開発ガイドライン

開発時は[CLAUDE.md](../CLAUDE.md)のガイドラインに従ってください。特に：

- Prismaの型推論を最大限活用
- 定数は`src/lib/constants`に集約
- Server Actionsでデータベース操作を実装
- Material-UIのコンポーネントを使用

## テスト

```bash
# 全テスト実行
bun test

# カバレッジ付きテスト
bun test:coverage

# ウォッチモード
bun test:watch
```

## ライセンス

MIT
