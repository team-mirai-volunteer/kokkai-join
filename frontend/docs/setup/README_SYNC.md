# 国会会議録データ同期ガイド

## 📋 概要

国会会議録検索APIから過去のデータを取得し、ローカルのPostgreSQLデータベースに保存するためのツールです。

## 🚀 クイックスタート

### 1. PostgreSQLの起動

```bash
# Docker Composeでデータベースを起動
cd frontend
bun run db:up

# データベースの状態確認
docker ps
```

### 2. データベースの初期化

```bash
# Prismaのマイグレーションを実行
bun run db:migrate

# Prisma Studioでデータベースを確認（オプション）
bun run db:studio
```

### 3. データの同期

#### 特定期間のデータを同期

```bash
# 基本的な使用方法
bun run sync:data sync <開始日> <終了日>

# 例：2024年のデータを同期
bun run sync:data sync 2024-01-01 2024-12-31

# 衆議院の本会議のみを同期
bun run sync:data sync 2024-01-01 2024-12-31 衆議院 本会議
```

#### 過去10年分のデータを同期

```bash
# 過去10年分を一括同期（時間がかかります）
bun run sync:data sync-10years
```

#### データベース統計の確認

```bash
# 保存されているデータの統計を表示
bun run sync:data stats
```

## 📊 コマンド一覧

### データベース管理

| コマンド              | 説明                         |
| --------------------- | ---------------------------- |
| `bun run db:up`       | PostgreSQLコンテナを起動     |
| `bun run db:down`     | PostgreSQLコンテナを停止     |
| `bun run db:reset`    | データベースを完全リセット   |
| `bun run db:migrate`  | Prismaマイグレーションを実行 |
| `bun run db:generate` | Prismaクライアントを生成     |
| `bun run db:studio`   | Prisma Studioを起動          |

### データ同期

| コマンド                                                 | 説明                   |
| -------------------------------------------------------- | ---------------------- |
| `bun run sync:data sync <開始日> <終了日> [院] [会議名]` | 指定期間のデータを同期 |
| `bun run sync:data sync-10years`                         | 過去10年分を同期       |
| `bun run sync:data stats`                                | データベース統計を表示 |

## 🔧 詳細設定

### 環境変数

`.env`ファイルでデータベース接続を設定：

```env
DATABASE_URL="postgresql://kokkai_user:kokkai_password@localhost:5432/kokkai_db?schema=public"
```

### Docker Compose設定

`docker-compose.yml`でPostgreSQLの設定を変更可能：

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: kokkai_user # ユーザー名
      POSTGRES_PASSWORD: kokkai_password # パスワード
      POSTGRES_DB: kokkai_db # データベース名
    ports:
      - '5432:5432' # ポート番号
```

## ⚠️ 注意事項

### API制限について

- 国会図書館APIへの負荷を考慮し、リクエスト間に1秒のディレイを設けています
- 大量のデータを同期する際は、APIの利用規約を遵守してください
- 過度な自動リクエストは避けてください

### データ容量

- 10年分のデータは数GBのディスク容量を必要とします
- 発言テキストを含むため、データベースのサイズが大きくなります
- 定期的なバックアップを推奨します

### 同期時間

- 1年分のデータ同期には約30分〜1時間かかります
- 10年分の一括同期は数時間かかる可能性があります
- 初回同期は特に時間がかかります

## 🐛 トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
docker ps

# ログを確認
docker logs kokkai-postgres

# データベースをリセット
bun run db:reset
bun run db:migrate
```

### 同期エラー

```bash
# ネットワーク接続を確認
ping kokkai.ndl.go.jp

# 詳細なログを見る
bun run sync:data sync 2024-01-01 2024-01-31
```

### ディスク容量不足

```bash
# Dockerボリュームのサイズを確認
docker system df

# 不要なボリュームを削除
docker volume prune
```

## 📝 データ構造

### Meetingテーブル

- 会議録の基本情報（日付、院、会議名など）
- 国会APIのissueIDで一意に識別

### Speechテーブル

- 各発言の詳細情報
- 発言者、所属、発言内容などを保存

### SyncHistoryテーブル

- 同期履歴を記録
- エラー情報も保存

## 🔍 データの活用

同期したデータは以下から利用可能：

1. **Prisma Studio**: `bun run db:studio`でGUIから確認
2. **Next.jsアプリ**: Prismaクライアント経由でアクセス
3. **直接SQL**: PostgreSQLクライアントで直接クエリ

## 📚 参考資料

- [国会会議録検索システムAPI仕様](https://kokkai.ndl.go.jp/#/api)
- [Prismaドキュメント](https://www.prisma.io/docs)
- [Docker Compose](https://docs.docker.com/compose/)
