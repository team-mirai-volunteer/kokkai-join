# データベースセットアップガイド

## 1. PostgreSQLのインストール

### macOS

```bash
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows

PostgreSQLの公式サイトからインストーラーをダウンロードしてインストール

## 2. データベースの作成

```bash
# PostgreSQLにログイン
psql -U postgres

# データベースとユーザーを作成
CREATE DATABASE kokkai_db;
CREATE USER kokkai_user WITH PASSWORD 'kokkai_password';
GRANT ALL PRIVILEGES ON DATABASE kokkai_db TO kokkai_user;

# 終了
\q
```

## 3. 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集してデータベース接続情報を設定
# DATABASE_URL="postgresql://kokkai_user:kokkai_password@localhost:5432/kokkai_db?schema=public"
```

## 4. Prismaのセットアップ

```bash
# Prismaクライアントを生成
npx prisma generate

# データベースマイグレーションを実行
npx prisma migrate dev --name init

# Prisma Studioでデータベースを確認（オプション）
npx prisma studio
```

## 5. データ同期の実行

### 管理画面からの同期

1. 開発サーバーを起動

```bash
bun dev
```

2. ブラウザで管理画面にアクセス

```
http://localhost:3000/admin/sync
```

3. 同期オプションを選択:
   - **日付範囲指定同期**: 特定期間のデータを同期
   - **過去10年分を同期**: 直近10年分のデータを一括同期（時間がかかります）

### 注意事項

- 初回の10年分同期には数時間かかる可能性があります
- API制限を考慮して、1秒間隔でリクエストを送信しています
- 同期中にエラーが発生した場合は、同期履歴で確認できます
- データベースのディスク容量に注意してください（10年分で数GB必要）

## 6. トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
brew services list  # macOS
systemctl status postgresql  # Linux

# 接続情報を確認
psql -U kokkai_user -d kokkai_db -h localhost
```

### マイグレーションエラー

```bash
# スキーマをリセットして再実行
npx prisma migrate reset
npx prisma migrate dev
```

### 同期エラー

- 国会図書館APIのステータスを確認
- ネットワーク接続を確認
- 同期履歴でエラーメッセージを確認

## 7. データベースのバックアップ

```bash
# バックアップ
pg_dump -U kokkai_user -d kokkai_db > backup.sql

# リストア
psql -U kokkai_user -d kokkai_db < backup.sql
```
