# 発言者テーブル移行ガイド

## 現在の状況

既存のデータベースには約66万件の発言データが存在しており、スキーマ変更には注意が必要です。

## 移行オプション

### Option 1: クリーンインストール（推奨：検証環境）

```bash
# データベースを完全リセット
bun run db:reset

# マイグレーション実行
bun run db:migrate

# 1年分のデータを再同期
bun run sync:data sync-year
```

### Option 2: 既存データを保持（本番環境向け）

既存のデータを保持したい場合は、手動でマイグレーションを行う必要があります：

```sql
-- 1. 新しいテーブルを作成
CREATE TABLE "Speaker" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "normalizedName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "nameYomi" TEXT,
  "speechCount" INTEGER DEFAULT 0,
  "firstSpeechDate" TIMESTAMP(3),
  "lastSpeechDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SpeakerAlias" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "speakerId" TEXT NOT NULL,
  "aliasName" TEXT NOT NULL,
  "aliasYomi" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("speakerId") REFERENCES "Speaker"(id) ON DELETE CASCADE
);

-- 2. Speechテーブルに新しいカラムを追加
ALTER TABLE "Speech"
ADD COLUMN "speakerId" TEXT,
ADD COLUMN "rawSpeaker" TEXT,
ADD COLUMN "rawSpeakerYomi" TEXT,
ADD COLUMN "rawSpeakerGroup" TEXT,
ADD COLUMN "rawSpeakerPosition" TEXT,
ADD COLUMN "rawSpeakerRole" TEXT;

-- 3. 既存データをコピー
UPDATE "Speech" SET
  "rawSpeaker" = "speaker",
  "rawSpeakerYomi" = "speakerYomi",
  "rawSpeakerGroup" = "speakerGroup",
  "rawSpeakerPosition" = "speakerPosition",
  "rawSpeakerRole" = "speakerRole";

-- 4. 古いカラムを削除
ALTER TABLE "Speech"
DROP COLUMN "speaker",
DROP COLUMN "speakerYomi",
DROP COLUMN "speakerGroup",
DROP COLUMN "speakerPosition",
DROP COLUMN "speakerRole";

-- 5. インデックスを作成
CREATE INDEX ON "Speaker"("normalizedName");
CREATE INDEX ON "Speaker"("nameYomi");
CREATE INDEX ON "Speaker"("displayName");
CREATE UNIQUE INDEX ON "Speaker"("normalizedName", "nameYomi");
CREATE INDEX ON "SpeakerAlias"("speakerId");
CREATE INDEX ON "SpeakerAlias"("aliasName");
CREATE UNIQUE INDEX ON "SpeakerAlias"("aliasName", "aliasYomi");
CREATE INDEX ON "Speech"("speakerId");
CREATE INDEX ON "Speech"("rawSpeaker");
```

## 推奨手順（検証環境）

検証段階のため、クリーンインストールを推奨します：

1. **データベースのリセット**

   ```bash
   bun run db:reset
   ```

2. **新しいスキーマでマイグレーション**

   ```bash
   bun run db:migrate
   ```

3. **1年分のデータを同期**

   ```bash
   bun run sync:data sync-year
   ```

4. **統計確認**
   ```bash
   bun run sync:data stats
   ```

## 注意事項

- 既存データがある場合、リセットするとすべてのデータが削除されます
- 本番環境では Option 2 の手動マイグレーションを使用してください
- 1年分のデータ同期には約30分〜1時間かかります
