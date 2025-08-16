# Speaker詳細画面 要件定義書

## 1. 概要

Speaker（発言者）の詳細情報を表示する画面の要件を定義する。この画面では、発言者の基本情報、所属履歴、役職・役割、発言履歴、統計情報などを包括的に表示する。

## 2. 画面設計

### 2.1 URL設計
- パス: `/speakers/[id]`
- パラメータ: `id` - SpeakerのID（CUID形式）

### 2.2 レイアウト構成

#### ヘッダーセクション
- **発言者名**: 大きく表示（displayName）
- **よみがな**: nameYomi（存在する場合）
- **正規化名**: normalizedName（システム内部での統一名）
- **統計サマリー**: 総発言数、初回発言日、最終発言日

#### メインコンテンツ
タブまたはアコーディオン形式で以下のセクションを表示：

1. **基本情報タブ**
2. **所属履歴タブ**
3. **役職・役割タブ**
4. **発言履歴タブ**
5. **統計・分析タブ**

## 3. 機能要件

### 3.1 基本情報セクション

#### 表示項目
- 正規化名（normalizedName）
- 表示名（displayName）
- よみがな（nameYomi）
- 別名リスト（SpeakerAlias）
  - 各別名の表記とよみがな
  - 使用回数
- 活動期間（firstSpeechDate 〜 lastSpeechDate）
- 総発言数（speechCount）

### 3.2 所属履歴セクション

#### 表示項目
- 時系列での所属変遷
  - 期間（startDate 〜 endDate）
  - 院（House）
  - 会派（PartyGroup）
- 現在の所属（endDateがnullのレコード）を強調表示
- 過去の所属をタイムライン形式で表示

#### ソート・フィルタ機能
- デフォルト: 新しい順
- フィルタ: 院別、会派別

### 3.3 役職・役割セクション

#### 表示項目
- 会議ごとの役職（Position）履歴
  - 役職名
  - カテゴリ（大臣、委員長、理事、議長など）
  - 該当会議の情報（日付、会議名）
- 会議での役割（SpeakerRole）履歴
  - 役割名
  - 該当会議の情報

#### 集計表示
- よく務める役職TOP5
- 役職別の発言回数

### 3.4 発言履歴セクション

#### 表示項目
- 発言リスト（ページネーション付き）
  - 発言日時
  - 会議名（nameOfMeeting）
  - 院（nameOfHouse）
  - 発言順序（speechOrder）
  - 発言内容の冒頭（最初の200文字程度）
  - 詳細リンク（speechURLまたは会議詳細ページへ）

#### 検索・フィルタ機能
- キーワード検索（発言内容）
- 期間指定
- 会議名フィルタ
- 院フィルタ

#### ソート機能
- 日付順（新しい/古い）
- 発言の長さ順
- 会議別グループ化

### 3.5 統計・分析セクション

#### 基本統計
- 総発言数
- 総発言文字数
- 平均発言長
- 活動期間
- 月別発言数グラフ
- 年別発言数グラフ

#### 会議別統計
- よく発言する会議TOP10
- 会議種別ごとの発言割合（円グラフ）

#### 共演分析
- よく同じ会議に出席する他の発言者TOP10
- ネットワーク図（オプション）

## 4. データ取得要件

### 4.1 必要なAPI/Query

#### メインデータ取得
```typescript
// Speaker基本情報 + 関連データ
getSpeakerDetail(id: string) {
  return prisma.speaker.findUnique({
    where: { id },
    include: {
      aliases: true,
      affiliations: {
        include: {
          house: true,
          partyGroup: true,
        },
        orderBy: { startDate: 'desc' }
      },
      speeches: {
        include: {
          meeting: true,
          position: true,
          role: true,
          affiliation: {
            include: {
              house: true,
              partyGroup: true,
            }
          }
        },
        orderBy: { meeting: { date: 'desc' } },
        take: 20, // 最初の20件
      },
      _count: {
        select: { speeches: true }
      }
    }
  });
}
```

#### 統計データ取得
```typescript
// 月別発言数
getMonthlySpeechCount(speakerId: string, startDate?: Date, endDate?: Date)

// 会議別集計
getMeetingStatistics(speakerId: string)

// 共演者分析
getCoSpeakers(speakerId: string, limit: number = 10)
```

### 4.2 パフォーマンス考慮事項

- 発言履歴は初期表示を20件に制限し、無限スクロールまたはページネーションで追加読み込み
- 統計データはキャッシュを活用（1日程度）
- 重い集計クエリは非同期で実行し、ローディング表示

## 5. UI/UX要件

### 5.1 デザイン要件
- Material-UI v6のコンポーネントを使用
- レスポンシブデザイン（モバイル対応）
- ダークモード対応

### 5.2 インタラクション
- タブ切り替えはURLに反映（ブラウザバック対応）
- 発言内容は折りたたみ可能
- グラフはインタラクティブ（ホバーで詳細表示）
- 無限スクロール or ページネーション

### 5.3 ローディング状態
- スケルトンスクリーンの使用
- 部分的なローディング（タブごと）

## 6. エラーハンドリング

- 存在しないIDの場合: 404ページ表示
- データ取得エラー: エラーメッセージ表示とリトライボタン
- 部分的エラー: 該当セクションのみエラー表示

## 7. アクセシビリティ要件

- スクリーンリーダー対応
- キーボードナビゲーション対応
- 適切なARIAラベル
- コントラスト比の確保

## 8. 関連画面への導線

- 会議詳細画面へのリンク
- 他の発言者詳細画面へのリンク
- 会派一覧画面へのリンク
- 検索画面への戻るリンク

## 9. 追加機能（Phase 2）

- 発言内容のワードクラウド
- AIによる発言要約
- 発言のエクスポート機能（CSV/PDF）
- お気に入り登録機能
- 発言の共有機能（SNS連携）

## 10. 技術仕様

### 10.1 使用技術
- **フレームワーク**: Next.js 15.4.6
- **UI**: Material-UI v6
- **状態管理**: React Context API or Zustand
- **データフェッチ**: tRPC or REST API
- **グラフ**: Recharts or Chart.js

### 10.2 コンポーネント構成
```
SpeakerDetailPage/
├── SpeakerHeader.tsx
├── SpeakerTabs.tsx
├── tabs/
│   ├── BasicInfoTab.tsx
│   ├── AffiliationHistoryTab.tsx
│   ├── PositionRoleTab.tsx
│   ├── SpeechHistoryTab.tsx
│   └── StatisticsTab.tsx
├── components/
│   ├── SpeechList.tsx
│   ├── AffiliationTimeline.tsx
│   ├── SpeechCountChart.tsx
│   └── CoSpeakerNetwork.tsx
└── hooks/
    ├── useSpeakerDetail.ts
    ├── useSpeechHistory.ts
    └── useSpeakerStatistics.ts
```

## 11. テスト要件

- 単体テスト: 各コンポーネント、hooks
- 統合テスト: API連携、データ取得
- E2Eテスト: 主要なユーザーフロー
- パフォーマンステスト: 大量データでの表示速度

## 12. セキュリティ要件

- XSS対策: 発言内容の適切なサニタイズ
- SQLインジェクション対策: Prismaの使用
- レート制限: API呼び出しの制限

## 13. 実装優先度

### Phase 1（MVP）
1. 基本情報表示
2. 所属履歴表示
3. 発言履歴（ページネーション付き）
4. 基本的な統計

### Phase 2
1. 詳細な統計・グラフ
2. 検索・フィルタ機能
3. 共演者分析

### Phase 3
1. ワードクラウド
2. AI要約
3. エクスポート機能
4. SNS連携