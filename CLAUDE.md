# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 重要な指示

**このプロジェクトに関する回答は日本語で行ってください。**

## プロジェクトアーキテクチャ

これは **kokkai-join** プロジェクトで、Next.jsフロントエンドアプリケーションを含むモノレポです。バックエンドディレクトリも計画されています。

### リポジトリ構造
- `frontend/` - Next.js 15.4.6 アプリケーション（React 19.1.0）
- `backend/` - （現在は空、将来のAPI開発用）
- `tools/` - （現在は空、開発ユーティリティ用）

### フロントエンド技術スタック
- **フレームワーク**: Next.js 15.4.6（App Router使用）
- **React**: バージョン 19.1.0 
- **TypeScript**: 完全なTypeScriptサポート（strict設定）
- **UIライブラリ**: Material-UI (MUI) v7.3.1
- **スタイリング**: Emotion（MUIに統合）+ CSS Modules
- **データベース**: PostgreSQL + Prisma ORM v6.14.0
- **パッケージマネージャー**: Bun
- **ビルドツール**: Turbopack（dev scriptで有効）
- **フォント**: Geist Sans と Geist Mono（Google Fonts）
- **テスト**: Jest + React Testing Library

## 共通開発コマンド

すべてのコマンドは `frontend/` ディレクトリから実行してください：

### 開発
```bash
cd frontend
bun dev              # Turbopackで開発サーバー起動
```

### ビルドと本番環境
```bash
cd frontend
bun run build        # 本番用ビルド
bun run start        # 本番サーバー起動
```

### コード品質
```bash
cd frontend
bun run lint         # ESLint実行（Next.js経由）
bun run format       # Prettierでコード整形
bun run format:check # Prettierでフォーマットチェック
bun run test         # Jestでテスト実行
bun run test:watch   # Jestでウォッチモード
bun run test:coverage # テストカバレッジ計測
```

### データベース管理
```bash
cd frontend
bun run db:up        # PostgreSQLコンテナ起動
bun run db:down      # PostgreSQLコンテナ停止
bun run db:reset     # データベースリセット
bun run db:migrate   # Prismaマイグレーション実行
bun run db:generate  # Prismaクライアント生成
bun run db:studio    # Prisma Studio起動（データベースGUI）
```

### パッケージ管理
```bash
cd frontend
bun install          # 依存関係インストール
bun add <package>    # 新規依存関係追加
bun add -d <package> # 開発用依存関係追加
```

## TypeScript設定

プロジェクトは厳格なTypeScript設定を使用：
- Target: ES2017
- Strictモード有効
- パスエイリアス: `@/*` は `./src/*` にマップ
- Next.js TypeScriptプラグイン有効

## 開発ノート

### フロントエンド構造
- Next.js App Routerアーキテクチャを使用
- メインアプリケーションコードは `frontend/src/app/` に配置
- 実装済みページ:
  - `/` - ホームページ（最近の会議録一覧）
  - `/search` - 検索ページ
  - `/meeting/[id]` - 会議詳細ページ
- コンポーネント構成:
  - `src/app/components/` - ページ固有コンポーネント
  - `src/components/features/` - 機能別コンポーネント
- Material-UI + Emotionでスタイリング
- Server Componentsを活用したデータフェッチング

### プロジェクトステータス
国会会議録の検索・閲覧システムの開発中。以下の機能が実装済み:
- 国会APIからのデータ同期
- 会議録の検索機能
- 会議詳細表示
- 発言者の正規化と管理
- Material-UIによるモダンなUI

### 開発サーバー
- デフォルトで http://localhost:3000 で起動
- Turbopackによる高速開発ビルド
- ホットリロード有効

## アーキテクチャの考慮事項

モノレポ構造でフロントエンドとバックエンドが分離されているため、クライアントとサーバーのコードは明確に分離してください。

## プロジェクトドメインとデータモデル

### 国会会議録データベース

このプロジェクトは国会会議録（Diet proceedings）のデータを管理・検索・表示するシステムです。

#### 主要なデータモデル

1. **Speaker（発言者）**
   - 同姓同名は同一人物として扱う
   - `normalizedName`: 正規化された名前（敬称や役職を除去）
   - `SpeakerAlias`: 表記揺れを管理（「○○君」「○○議員」など）

2. **マスターデータ**
   - `House`: 院（衆議院/参議院）
   - `PartyGroup`: 会派・政党
   - `Position`: 役職（大臣、委員長、理事など）
   - `SpeakerRole`: 会議での役割

3. **時系列データ**
   - `SpeakerAffiliation`: 発言者の所属履歴（院・会派の期間管理）
   - `Speech`: 会議ごとの発言（役職・役割は会議単位で変動）

#### データ同期スクリプト

```bash
cd frontend
# DBリセット＆過去1年分同期
bun scripts/sync-kokkai-data-improved.ts reset-and-sync-year

# 特定期間の同期
bun scripts/sync-kokkai-data-improved.ts sync 2024-01-01 2024-12-31

# キャッシュクリア
bun scripts/sync-kokkai-data-improved.ts clear-cache

# 統計表示
bun scripts/sync-kokkai-data-improved.ts stats

# デバッグ用スクリプト
bun scripts/debug-sync.ts                # 特定日付のデータ取得テスト
bun scripts/check-meeting.ts             # 特定会議IDの存在確認
bun scripts/check-api-meeting.ts         # APIから直接会議データ取得
bun scripts/cleanup-duplicate-speakers.ts # 重複Speakerの削除
```

#### 重要な設計方針

1. **Speaker正規化**
   - 敬称（君、議員、さん等）を除去
   - 役職付き表記を標準化
   - 同姓同名は同一人物として`normalizedName`で統合

2. **並列処理と競合対策**
   - API呼び出しは10件並列、DB保存は5件並列
   - `pendingCreations` Mapでマスターデータ作成の競合を防止
   - キャッシュシステム（`.cache/`ディレクトリ、7日間有効）

3. **リレーション設計**
   - 所属（院・会派）は期間を持つ履歴として管理
   - 役職・役割は会議ごとに記録（時間軸での変動に対応）

## コーディングベストプラクティス

### TypeScriptとPrismaの型推論

このプロジェクトでは、Prismaの自動生成型とTypeScriptの型推論を最大限活用して、型定義の重複を避けています：

1. **Prismaの型推論を使用**
   ```typescript
   // includeオプションから型を自動生成
   export type MeetingWithSpeeches = Prisma.MeetingGetPayload<{
     include: {
       speeches: {
         include: { speaker: true }
       }
     }
   }>
   ```

2. **関数の戻り値から型を推論**
   ```typescript
   // 関数の戻り値から型を推論
   export type MeetingListItem = Awaited<ReturnType<typeof getRecentMeetingsFromDB>>[number]
   ```

3. **型アノテーションを最小限に**
   - Prismaクエリの戻り値は自動的に型が付くため、明示的な型アノテーションは不要
   - エラーハンドリング時のみ必要に応じて型を指定

この方式により、型定義の重複を避け、Prismaスキーマが更新されても自動的に型が同期されます。

## ファイル構成と命名規則

### ディレクトリ構造
```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── components/   # ページ固有コンポーネント
│   │   └── [route]/      # ルートごとのページ
│   ├── components/       # 共有コンポーネント
│   │   └── features/     # 機能別コンポーネント
│   └── lib/              # ユーティリティとビジネスロジック
│       ├── actions/      # Server Actions
│       ├── api/          # APIクライアント
│       ├── db/           # データベース操作
│       ├── types/        # 型定義
│       └── utils/        # ユーティリティ関数
├── prisma/
│   └── schema.prisma     # データベーススキーマ
├── scripts/              # 同期・管理スクリプト
└── docs/                 # プロジェクトドキュメント
```

### ファイル命名規則
- **コンポーネント**: PascalCase（例: `SearchButton.tsx`）
- **ユーティリティ**: kebab-case（例: `speaker-normalizer.ts`）
- **Server Actions**: kebab-case + `-actions`（例: `meeting-actions.ts`）
- **型定義ファイル**: kebab-case（例: `api.ts`, `meeting.ts`）
- **テストファイル**: `__tests__/[filename].test.ts`
- **ドキュメント**: UPPERCASE_UNDERSCORE（例: `SPEAKER_DETAIL_REQUIREMENTS.md`）

## API設計

### 国会議事録API（外部）
- **ベースURL**: `https://kokkai.ndl.go.jp/api`
- **主要エンドポイント**:
  - `/meeting_list` - 会議リスト検索
  - `/meeting` - 会議詳細取得
  - `/speech` - 発言検索

### Server Actions（内部）
主要なServer Actionsは `src/lib/actions/` に配置:
- `meeting-actions.ts` - 会議関連の操作
- `sync-actions.ts` - データ同期操作

## テスト戦略

### テストツール
- **Jest**: 単体テスト
- **React Testing Library**: コンポーネントテスト

### テストカバレッジ
- ユーティリティ関数: 100%目標
- コンポーネント: インタラクションと表示ロジック
- Server Actions: モックを使用した統合テスト

### テスト実行
```bash
cd frontend
bun run test          # 全テスト実行
bun run test:watch    # ウォッチモード
bun run test:coverage # カバレッジレポート
```