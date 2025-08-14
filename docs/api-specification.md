# 国会会議録検索API 技術仕様書

## 1. API概要

国立国会図書館が提供する国会会議録検索システムの検索用API。HTTPのGETメソッドでアクセスし、XML形式またはJSON形式でデータを返戻。

## 2. APIエンドポイント詳細

### 2.1 会議単位簡易出力API
- **URL**: https://kokkai.ndl.go.jp/api/meeting_list
- **最大取得件数**: 100件（デフォルト30件）
- **特徴**: 会議録の基本情報のみ、発言本文は含まない
- **用途**: 検索結果一覧表示、効率的な大量データ取得

### 2.2 会議単位出力API  
- **URL**: https://kokkai.ndl.go.jp/api/meeting
- **最大取得件数**: 10件（デフォルト3件）
- **特徴**: 会議録の全発言本文を含む完全なデータ
- **用途**: 会議録の詳細表示、全文解析

### 2.3 発言単位出力API
- **URL**: https://kokkai.ndl.go.jp/api/speech  
- **最大取得件数**: 100件（デフォルト30件）
- **特徴**: 検索条件にヒットした発言のみを返戻
- **用途**: 特定キーワードでの発言検索、発言レベルでの分析

## 3. 検索パラメータ仕様

### 3.1 基本検索パラメータ
| パラメータ名 | 説明 | 値の範囲・形式 | 検索方式 |
|-------------|------|---------------|----------|
| `any` | 発言内容の検索語 | 文字列、スペース区切りでAND検索 | 部分一致 |
| `nameOfHouse` | 院名 | "衆議院", "参議院", "両院", "両院協議会" | 完全一致 |
| `nameOfMeeting` | 会議名 | 文字列、スペース区切りでOR検索 | 部分一致 |
| `speaker` | 発言者名 | 文字列、スペース区切りでOR検索 | 部分一致 |
| `from` | 開会日付（開始） | YYYY-MM-DD形式 | 範囲検索 |
| `until` | 開会日付（終了） | YYYY-MM-DD形式 | 範囲検索 |

### 3.2 詳細検索パラメータ
| パラメータ名 | 説明 | 値の範囲・形式 |
|-------------|------|---------------|
| `sessionFrom/To` | 国会回次 | 3桁までの自然数 |
| `issueFrom/To` | 号数 | 3桁までの整数 |
| `speakerPosition` | 発言者肩書き | 文字列（部分一致） |
| `speakerGroup` | 発言者所属会派 | 文字列（部分一致） |
| `speakerRole` | 発言者役割 | "証人", "参考人", "公述人" |
| `speechNumber` | 発言番号 | 0以上の整数 |
| `speechID` | 発言ID | 会議録ID_発言番号形式 |
| `issueID` | 会議録ID | 21桁の英数字 |

### 3.3 システムパラメータ
| パラメータ名 | 説明 | 値の範囲・形式 |
|-------------|------|---------------|
| `startRecord` | 開始位置 | 1～検索件数（デフォルト1） |
| `maximumRecords` | 取得件数 | meeting_list/speech: 1-100, meeting: 1-10 |
| `recordPacking` | レスポンス形式 | "xml"（デフォルト）, "json" |

### 3.4 追加パラメータ
| パラメータ名 | 説明 | 値の範囲・形式 |
|-------------|------|---------------|
| `supplementAndAppendix` | 追録・附録指定 | "true", "false"（デフォルト） |
| `contentsAndIndex` | 目次・索引指定 | "true", "false"（デフォルト） |
| `searchRange` | 議事冒頭・本文指定 | "冒頭", "本文", "冒頭・本文"（デフォルト） |
| `closing` | 閉会中指定 | "true", "false"（デフォルト） |

## 4. レスポンス構造

### 4.1 基本レスポンス情報
- `numberOfRecords`: 総検索結果件数
- `numberOfReturn`: 今回返戻件数  
- `startRecord`: 開始位置
- `nextRecordPosition`: 次ページ開始位置（存在する場合）

### 4.2 会議録データ構造
- `issueID`: 会議録ID
- `imageKind`: イメージ種別（会議録・目次・索引・附録・追録）
- `searchObject`: 検索対象箇所（議事冒頭・本文）
- `session`: 国会回次
- `nameOfHouse`: 院名
- `nameOfMeeting`: 会議名
- `issue`: 号数
- `date`: 開催日付
- `closing`: 閉会中フラグ
- `meetingURL`: 会議録テキスト表示URL
- `pdfURL`: PDF表示URL

### 4.3 発言データ構造
- `speechID`: 発言ID
- `speechOrder`: 発言番号
- `speaker`: 発言者名
- `speakerYomi`: 発言者よみ
- `speakerGroup`: 発言者所属会派
- `speakerPosition`: 発言者肩書き
- `speakerRole`: 発言者役割
- `speech`: 発言内容（meeting/speechのみ）
- `startPage`: 発言が掲載されている開始ページ
- `createTime`: レコード登録日時
- `updateTime`: レコード更新日時
- `speechURL`: 発言URL

## 5. レスポンス形式例

### 5.1 JSON形式（会議単位簡易出力）
```json
{
  "numberOfRecords": 1234,
  "numberOfReturn": 30,
  "startRecord": 1,
  "nextRecordPosition": 31,
  "meetingRecord": [
    {
      "issueID": "100105254X00119470520",
      "imageKind": "会議録",
      "searchObject": "本文",
      "session": "1",
      "nameOfHouse": "衆議院",
      "nameOfMeeting": "本会議",
      "issue": "20",
      "date": "1947-05-20",
      "closing": "false",
      "speechRecord": [
        {
          "speechID": "100105254X00119470520_001",
          "speechOrder": "1",
          "speaker": "議長",
          "speechURL": "https://kokkai.ndl.go.jp/txt/100105254X00119470520/1"
        }
      ],
      "meetingURL": "https://kokkai.ndl.go.jp/txt/100105254X00119470520",
      "pdfURL": "https://kokkai.ndl.go.jp/pdf/100105254X00119470520"
    }
  ]
}
```

### 5.2 JSON形式（発言単位出力）
```json
{
  "numberOfRecords": 567,
  "numberOfReturn": 30,
  "startRecord": 1,
  "nextRecordPosition": 31,
  "speechRecord": [
    {
      "speechID": "100105254X00119470520_003",
      "issueID": "100105254X00119470520",
      "imageKind": "会議録",
      "searchObject": "本文",
      "session": "1",
      "nameOfHouse": "衆議院",
      "nameOfMeeting": "本会議",
      "issue": "20",
      "date": "1947-05-20",
      "closing": "false",
      "speechOrder": "3",
      "speaker": "田中角栄",
      "speakerYomi": "たなかかくえい",
      "speakerGroup": "自由民主党",
      "speakerPosition": "内閣総理大臣",
      "speakerRole": null,
      "speech": "ただいま議題となりました...（発言内容）",
      "startPage": "15",
      "speechURL": "https://kokkai.ndl.go.jp/txt/100105254X00119470520/3",
      "meetingURL": "https://kokkai.ndl.go.jp/txt/100105254X00119470520",
      "pdfURL": "https://kokkai.ndl.go.jp/pdf/100105254X00119470520"
    }
  ]
}
```

## 6. エラーハンドリング

### 6.1 主要エラーコード
| エラーコード | メッセージ |
|------------|-----------|
| 19001 | 現在、混み合っております。もうしばらくしてから再度アクセスしてください。 |
| 19004 | startRecordには 1から検索件数までの値を指定してください。 |
| 19005 | maximumRecordsには1～100の値を指定してください。 |
| 19006 | maximumRecordsには1～10の値を指定してください。 |
| 19007 | 検索条件を指定してください。 |
| 19011 | 検索条件の入力に誤りがあります。 |
| 19012 | from:開会日付をYYYY-MM-DD形式で入力してください。 |
| 19013 | until:開会日付をYYYY-MM-DD形式で入力してください。 |
| 19014 | fromはuntil以下、もしくはuntilはfrom以上の日付で入力してください。 |
| 19018 | from:存在しない日付です。検索条件を見直し、再度検索してください。 |
| 19019 | until:存在しない日付です。検索条件を見直し、再度検索してください。 |
| 19020 | 入力可能文字数を超過しています。検索条件を見直してください。 |

### 6.2 エラーレスポンス形式（JSON）
```json
{
  "message": "検索条件の入力に誤りがあります。",
  "details": [
    "from:開会日付をYYYY-MM-DD形式で入力してください。",
    "maximumRecordsには1～100の値を指定してください。"
  ]
}
```

## 7. 利用制限・マナー

### 7.1 技術的制限
- 検索条件全体で2000バイト以内
- UTF-8エンコーディング必須
- 機械的アクセス時は多重リクエスト禁止
- データ取得後数秒の間隔を空ける

### 7.2 法的制約
- 国立国会図書館ウェブサイトコンテンツ利用規約に準拠
- 個々の発言の著作権は発言者に帰属
- システム安定運用への配慮が必要

### 7.3 推奨される利用方法
1. **段階的データ取得**: まず`meeting_list`で概要を取得し、必要に応じて`meeting`や`speech`で詳細を取得
2. **適切なページング**: `startRecord`と`maximumRecords`を使用した効率的な分割取得
3. **キャッシュ活用**: 同じ検索条件での重複リクエストを避ける
4. **エラーハンドリング**: 適切なリトライ機構とユーザーへのフィードバック

## 8. 実装時の考慮事項

### 8.1 パフォーマンス最適化
- 検索結果一覧では`meeting_list`を使用（軽量）
- 詳細表示時のみ`meeting`や`speech`を使用
- 適切なローディング表示とプログレス表示

### 8.2 ユーザビリティ
- 検索条件の保存と復元機能
- 検索履歴の管理
- 分かりやすいエラーメッセージ表示

### 8.3 セキュリティ
- API呼び出し頻度の制御
- ユーザー入力の適切なバリデーション
- XSSやインジェクション攻撃の防止