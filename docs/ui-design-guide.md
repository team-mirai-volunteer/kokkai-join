# UI デザインガイド

このドキュメントでは、Kokkai-JoinプロジェクトのUI設計指針、デザインシステム、およびMUIテーマの実装について説明します。

## デザインコンセプト

### 基本方針
- **親しみやすさ**: 一般市民が使いやすいインターフェース
- **信頼性**: 公的データを扱うにふさわしい品格
- **明瞭性**: 複雑な情報を分かりやすく整理
- **一貫性**: GitHubライクな統一されたデザイン体験

### デザイン参考
成熟したWebアプリケーションをベースとした親しみやすく機能的なデザイン
- 洗練されたタイポグラフィシステム
- 読みやすさを重視した情報階層
- 適度なコントラストと十分な余白

## カラーパレット

### プライマリーカラー
```css
/* 信頼感のあるブルー系 */
--primary-50: #f0f7ff
--primary-100: #c7e1ff  
--primary-200: #9ec8ff
--primary-300: #75abff
--primary-400: #4c8eff
--primary-500: #0969da  /* メインプライマリー */
--primary-600: #0550ae
--primary-700: #033d8b
--primary-800: #0a3069
--primary-900: #002047
```

### グレースケール
```css
/* 洗練されたニュートラルカラー */
--gray-50: #f8f9fa
--gray-100: #f1f3f4
--gray-200: #e1e4e8
--gray-300: #d0d7de
--gray-400: #8c959f
--gray-500: #6e7781
--gray-600: #57606a
--gray-700: #424a53
--gray-800: #32383f
--gray-900: #24292f
```

### セマンティックカラー
```css
/* 成功 */
--success-main: #1a7f37
--success-light: #2da44e
--success-bg: #d1f7d6

/* エラー */
--error-main: #cf222e
--error-light: #ff6b6b
--error-bg: #ffeef0

/* 警告 */
--warning-main: #fb8500
--warning-light: #ffb347
--warning-bg: #fff5b4

/* 情報 */
--info-main: #0969da
--info-light: #54aeff
--info-bg: #e7f3ff
```

## タイポグラフィ

### フォントファミリー
```css
/* モダンなシステムフォント */
--font-family-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'
--font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace
--font-family-japanese: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', 'Yu Gothic Medium', 'Yu Gothic', Meiryo, sans-serif
```

### タイポグラフィスケール

#### 見出し (Headlines)
```typescript
h1: {
  fontSize: '32px',
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: '-0.02em'
}

h2: {
  fontSize: '24px', 
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: '-0.01em'
}

h3: {
  fontSize: '20px',
  fontWeight: 600, 
  lineHeight: 1.25
}

h4: {
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: 1.25
}

h5: {
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.25
}

h6: {
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1.25,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}
```

#### 本文 (Body Text)
```typescript
body1: {
  fontSize: '14px',
  lineHeight: 1.5,
  letterSpacing: '0'
}

body2: {
  fontSize: '12px',
  lineHeight: 1.4,
  letterSpacing: '0'  
}

subtitle1: {
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: 1.5
}

subtitle2: {
  fontSize: '14px', 
  fontWeight: 500,
  lineHeight: 1.4
}
```

#### その他
```typescript
caption: {
  fontSize: '11px',
  lineHeight: 1.4,
  letterSpacing: '0.01em',
  color: 'var(--gray-600)'
}

overline: {
  fontSize: '10px',
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: '0.1em',
  textTransform: 'uppercase'
}
```

## スペーシング

### 基本単位
```css
/* 8px基準のスペーシングシステム */
--spacing-xs: 4px   /* 0.5 unit */
--spacing-sm: 8px   /* 1 unit */  
--spacing-md: 16px  /* 2 units */
--spacing-lg: 24px  /* 3 units */
--spacing-xl: 32px  /* 4 units */
--spacing-2xl: 48px /* 6 units */
--spacing-3xl: 64px /* 8 units */
```

### レイアウトスペーシング
```css
/* コンテナとセクション */
--container-padding: 16px
--section-spacing: 32px
--content-max-width: 1200px

/* コンポーネント間 */
--component-gap-sm: 8px
--component-gap-md: 16px  
--component-gap-lg: 24px
```

## コンポーネントデザイン

### ボタン

#### プライマリーボタン
```css
background: var(--primary-500)
color: white
border-radius: 6px
padding: 8px 16px
font-weight: 500
font-size: 14px
transition: all 0.2s ease

hover: {
  background: var(--primary-600)
  transform: translateY(-1px)
  box-shadow: 0 4px 8px rgba(9, 105, 218, 0.25)
}
```

#### セカンダリーボタン  
```css
background: transparent
color: var(--primary-500)
border: 1px solid var(--gray-300)
border-radius: 6px
padding: 8px 16px

hover: {
  background: var(--gray-50)
  border-color: var(--gray-400)
}
```

### カード
```css
background: white
border: 1px solid var(--gray-200)
border-radius: 8px
padding: 16px
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06)

hover: {
  border-color: var(--gray-300)
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
}
```

### フォーム要素
```css
input, textarea, select: {
  border: 1px solid var(--gray-300)
  border-radius: 6px
  padding: 8px 12px
  font-size: 14px
  background: white
  
  focus: {
    border-color: var(--primary-500)
    outline: 2px solid var(--primary-100)
    outline-offset: 0
  }
}
```

## レイアウトパターン

### ヘッダー
```css
height: 64px
background: var(--gray-900)
color: white
border-bottom: 1px solid var(--gray-700)
padding: 0 16px
```

### コンテナ
```css
max-width: 1200px
margin: 0 auto
padding: 0 16px

@media (min-width: 768px) {
  padding: 0 24px
}

@media (min-width: 1024px) {
  padding: 0 32px  
}
```

### グリッドシステム
```css
/* 12カラムグリッド */
.grid-container {
  display: grid
  grid-template-columns: repeat(12, 1fr)
  gap: 16px
}

/* レスポンシブブレークポイント */
--breakpoint-sm: 576px
--breakpoint-md: 768px  
--breakpoint-lg: 992px
--breakpoint-xl: 1200px
```

## アイコンシステム

### アイコンサイズ
```css
--icon-xs: 12px
--icon-sm: 16px  
--icon-md: 20px
--icon-lg: 24px
--icon-xl: 32px
```

### アイコン使用例
- **検索**: MUI Search アイコン  
- **ユーザー**: MUI Person アイコン
- **設定**: MUI Settings アイコン
- **議事録**: MUI Description アイコン
- **日付**: MUI CalendarToday アイコン

## アニメーション

### トランジション
```css
/* 基本トランジション */
--transition-fast: 0.15s ease-in-out
--transition-base: 0.2s ease-in-out  
--transition-slow: 0.3s ease-in-out

/* 使用例 */
transition: all var(--transition-base)
```

### ホバー効果
```css
/* カードホバー */
transform: translateY(-2px)
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1)

/* ボタンホバー */
transform: translateY(-1px)
box-shadow: 0 4px 8px rgba(9, 105, 218, 0.25)
```

## レスポンシブデザイン

### ブレークポイント戦略
```typescript
const breakpoints = {
  xs: 0,     // モバイル
  sm: 576,   // 大きなモバイル
  md: 768,   // タブレット
  lg: 992,   // デスクトップ
  xl: 1200,  // 大画面
  xxl: 1400  // 超大画面
}
```

### モバイルファースト
```css
/* モバイル(xs): デフォルト */
font-size: 14px
padding: 16px

/* タブレット(md): 768px以上 */
@media (min-width: 768px) {
  font-size: 16px
  padding: 24px
}

/* デスクトップ(lg): 992px以上 */  
@media (min-width: 992px) {
  font-size: 18px
  padding: 32px
}
```

## アクセシビリティ

### カラーコントラスト
- **通常テキスト**: 4.5:1以上のコントラスト比
- **大きなテキスト**: 3:1以上のコントラスト比  
- **リンク**: 下線または十分なカラーコントラスト

### フォーカス表示
```css
/* フォーカス可能要素 */
:focus-visible {
  outline: 2px solid var(--primary-500)
  outline-offset: 2px
  border-radius: 4px
}
```

### スクリーンリーダー対応
```typescript
// ARIA属性の適切な使用
<button aria-label="会議録を検索">
  <SearchIcon />
</button>

// 見出し階層の維持
<h1>メインタイトル</h1>
  <h2>セクションタイトル</h2>
    <h3>サブセクション</h3>
```

## 日本語デザイン考慮事項

### フォント選択
- **システムフォント優先**: OS標準フォントを使用
- **日本語対応**: Hiragino Sans, Yu Gothic等
- **英数字**: 欧文フォントとの適切なフォールバック

### 行間と文字間隔
```css
/* 日本語テキスト */
line-height: 1.6-1.8  /* 欧文より広め */
letter-spacing: 0.02em /* わずかに広げる */

/* 英数字混在 */
font-feature-settings: 'kern' 1, 'liga' 1
```

### 禁則処理
```css
word-break: keep-all        /* CJK文字の単語境界を維持 */
overflow-wrap: break-word   /* 長い英単語は改行 */
line-break: strict         /* 厳密な禁則処理 */
```

## ダークモード対応

### カラーパレット（ダークモード）
```css
/* ダークモード用カラー */
--dark-bg-primary: #0d1117
--dark-bg-secondary: #161b22  
--dark-bg-tertiary: #21262d
--dark-text-primary: #e6edf3
--dark-text-secondary: #7d8590
--dark-border: #30363d
```

### 実装例
```typescript
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0d1117',
      paper: '#161b22'
    },
    text: {
      primary: '#e6edf3',
      secondary: '#7d8590'  
    }
  }
})
```

## 実装ガイドライン

### MUIテーマカスタマイズ
1. **theme.ts**でベーステーマを定義
2. **コンポーネントレベル**でのカスタマイズ
3. **sx prop**による個別調整

### コンポーネント作成規則
```typescript
// 良い例: 一貫性のあるprops設計
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'  
  loading?: boolean
  fullWidth?: boolean
}

// 悪い例: 過度なprops
interface BadButtonProps {
  color?: string
  backgroundColor?: string  
  hoverColor?: string
  // ... 多すぎる個別設定
}
```

### パフォーマンス考慮
- **sx prop**の適切な使用（再レンダリング考慮）
- **styled-components**との使い分け
- **テーマの効率的なアクセス**

このUIデザインガイドに従うことで、親しみやすく機能的なUIを構築し、一貫したユーザー体験を提供できます。