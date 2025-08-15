# 発言者テーブル設計ドキュメント

## 概要

発言者（Speaker）を独立したテーブルとして管理することで、以下の機能を実現します：

- 発言者ごとの統計・分析
- 発言者の活動履歴追跡
- 所属会派・役職の時系列管理

## 主な課題と解決策

### 1. 同姓同名の識別

#### 課題

- 「田中太郎」のような一般的な名前で複数人が存在する可能性
- 国会APIには発言者の一意なIDが存在しない

#### 解決策

```typescript
// 識別キーの生成例
function generateSpeakerKey(speech: SpeechRecord): string {
  const name = speech.speaker
  const yomi = speech.speakerYomi || ''
  const group = speech.speakerGroup || ''

  // 名前＋よみがな＋所属で識別
  return `${name}_${yomi}_${group}`.toLowerCase()
}
```

### 2. 表記ゆれの処理

#### 課題

APIデータの表記が統一されていない：

- 「安倍晋三」
- 「安倍総理」
- 「安倍内閣総理大臣」
- 「安倍晋三君」（敬称付き）

#### 解決策

```typescript
// 正規化処理
function normalizeSpeakerName(rawName: string): string {
  return rawName
    .replace(/君$/g, '') // 敬称を削除
    .replace(/総理大臣$/g, '') // 役職を削除
    .replace(/内閣総理大臣$/g, '') // 役職を削除
    .replace(/大臣$/g, '') // 役職を削除
    .replace(/委員長$/g, '') // 役職を削除
    .replace(/議長$/g, '') // 役職を削除
    .trim()
}

// 別名テーブルで元の表記を保持
// SpeakerAliasテーブルに「安倍総理」「安倍内閣総理大臣」などを登録
```

### 3. 役職・所属の時系列変化

#### 課題

- 同一人物が時期により異なる役職に就く
- 会派の移籍や解散・結成

#### 解決策

履歴テーブルによる管理：

```sql
-- 例：安倍晋三氏の役職履歴
-- SpeakerPositionテーブル
-- 2006-09-26 〜 2007-09-26: 内閣総理大臣
-- 2012-12-26 〜 2020-09-16: 内閣総理大臣

-- 会派履歴
-- SpeakerAffiliationテーブル
-- 1993-07-18 〜 現在: 自由民主党
```

### 4. データ移行戦略

#### 段階的移行アプローチ

**Phase 1: 並行運用（推奨）**

```typescript
// 既存のSpeechテーブルはそのまま維持
// 新規にSpeakerテーブルを追加し、徐々にマッチング

async function matchSpeakerToSpeech(speech: Speech) {
  // 1. 正規化した名前で検索
  const normalizedName = normalizeSpeakerName(speech.rawSpeaker)

  // 2. 既存のSpeakerを検索
  let speaker = await findSpeaker(normalizedName, speech.rawSpeakerYomi)

  // 3. 見つからない場合は新規作成
  if (!speaker) {
    speaker = await createSpeaker({
      normalizedName,
      displayName: speech.rawSpeaker,
      nameYomi: speech.rawSpeakerYomi,
    })
  }

  // 4. SpeechとSpeakerを関連付け
  await updateSpeech(speech.id, { speakerId: speaker.id })
}
```

**Phase 2: 名寄せ処理**

```typescript
// 同一人物の可能性が高いSpeakerを検出
async function findMergeCandidates() {
  // 1. 名前の類似度で候補を抽出
  // 2. 所属会派の重複をチェック
  // 3. 活動期間の重複をチェック
  // 4. 手動確認用のリストを生成
}
```

## 実装の優先順位

### 必須機能（MVP）

1. ✅ Speakerテーブルの基本構造
2. ✅ 正規化処理
3. ✅ Speech→Speaker の関連付け

### 追加機能（Phase 2）

1. ⏳ 所属会派・役職の履歴管理
2. ⏳ 別名管理（SpeakerAlias）
3. ⏳ 名寄せ候補の自動検出
4. ⏳ 管理画面での手動名寄せ

### 将来機能（Phase 3）

1. 📋 発言者プロフィールページ
2. 📊 発言者ごとの統計・分析
3. 🔍 発言者での高度な検索
4. 📈 発言傾向の可視化

## メリットとデメリット

### メリット

- **データの正規化**: 重複データの削減
- **検索性能向上**: 発言者での検索が高速に
- **分析機能**: 発言者ごとの統計が容易に
- **履歴管理**: 役職・所属の変遷を追跡可能

### デメリット

- **実装の複雑性**: 名寄せロジックが必要
- **メンテナンス**: 定期的な名寄せ作業
- **初期移行コスト**: 既存データの移行作業
- **不完全性**: 100%正確な名寄せは困難

## 推奨される実装手順

1. **新規データから適用**
   - 新しく同期するデータからSpeakerテーブルを使用
   - 既存データは段階的に移行

2. **簡易的な名寄せから開始**
   - 名前＋よみがなでの単純マッチング
   - 複雑な名寄せは後回し

3. **管理機能の実装**
   - 手動での名寄せ機能
   - 発言者の統合・分離機能

4. **分析機能の追加**
   - 発言者ごとの統計表示
   - 発言傾向の可視化

## サンプルクエリ

```sql
-- 発言者の発言数ランキング
SELECT
  s.displayName,
  COUNT(sp.id) as speech_count
FROM Speaker s
JOIN Speech sp ON s.id = sp.speakerId
GROUP BY s.id
ORDER BY speech_count DESC
LIMIT 10;

-- 特定期間の発言者の所属会派
SELECT
  s.displayName,
  sa.groupName,
  sa.startDate,
  sa.endDate
FROM Speaker s
JOIN SpeakerAffiliation sa ON s.id = sa.speakerId
WHERE sa.startDate <= '2024-01-01'
  AND (sa.endDate IS NULL OR sa.endDate >= '2024-01-01');
```
