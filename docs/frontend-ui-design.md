# フロントエンド UI/画面遷移/コンポーネント設計

## 1. 概要

現在、App.tsxにログイン画面とディープリサーチ画面が同一コンポーネントに混在しています。
これを以下の3つの独立した画面に分割し、ルーティングとコンポーネント設計を整理します。

### 画面構成
1. **ログイン画面** - 認証前のユーザー向け
2. **検索履歴画面** - 過去の検索結果一覧（ログイン後のデフォルト画面）
3. **検索結果詳細画面** - 個別の検索結果表示

**注**: 新規検索機能はヘッダーに常時表示され、どの画面からでもアクセス可能

### UIフレームワーク

**採用技術**: shadcn/ui + Tailwind CSS v4 + Radix UI

- **shadcn/ui**: コピー&ペースト可能なコンポーネント集
- **Tailwind CSS v4**: ユーティリティファーストCSSフレームワーク
- **Radix UI**: アクセシブルなUIプリミティブ
- **lucide-react**: アイコンライブラリ
- **class-variance-authority (cva)**: バリアントベースのスタイル管理
- **tailwind-merge + clsx**: クラス名の競合解決

**採用理由**:
- mirai-gikaiプロジェクトとの一貫性
- カスタマイズ性が高い（コードを直接編集可能）
- TypeScriptネイティブサポート
- アクセシビリティ対応済み
- Vite/Reactとの相性が良い

## 2. 画面遷移フロー

```
┌─────────────────┐
│  ログイン画面    │
│  /login         │
└────────┬────────┘
         │ 認証成功
         ↓
┌──────────────────────────────────────────┐
│  メインレイアウト（認証後）               │
│  ┌────────────────────────────────────┐ │
│  │ ヘッダー                            │ │
│  │ - 検索フォーム（常時表示）          │ │
│  │ - ユーザー情報/ログアウト           │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ コンテンツエリア                    │ │
│  │                                    │ │
│  │  デフォルト: 検索履歴一覧 (/history)│ │
│  │  クリック時: 検索結果詳細           │ │
│  │  検索実行時: 新しい検索結果         │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘

画面遷移:
1. ログイン成功 → /history（検索履歴一覧）
2. 履歴クリック → /history/:id（検索結果詳細）
3. ヘッダーで検索実行 → その場で結果表示（モーダルまたはメインエリア）
```

## 3. URL設計

| URL            | 画面             | 認証 | 説明                                           |
|----------------|------------------|------|------------------------------------------------|
| `/login`       | ログイン画面     | 不要 | メール/パスワード認証                          |
| `/`            | 検索履歴一覧     | 必須 | デフォルトランディング、過去の検索結果一覧     |
| `/history/:id` | 検索結果詳細     | 必須 | 個別の検索結果表示                             |

**注**:
- ログイン後は自動的に `/` にリダイレクト
- 新規検索はヘッダーから実行（URLは変わらない、検索結果はその場で表示）
- 検索後、結果を履歴に保存し、一覧に自動追加

## 4. コンポーネントアーキテクチャ

### 4.1 ディレクトリ構造

**設計原則**:
1. **コロケーション (Colocation)**: 関連するファイルは近くに配置
2. **高凝集・低結合**: 機能ごとにまとめ、機能間の依存を最小化
3. **テスト容易性**: テストファイルはコンポーネントの隣に配置
4. **明確な責務**: features/ (機能固有) と shared/ (共有) を明確に分離
5. **スケーラビリティ**: 機能追加時に既存コードへの影響を最小化

**構造パターン**: Feature-based + Colocation

```
frontend/src/
├── App.tsx                      # ルートコンポーネント（ルーティング）
├── App.css                      # グローバルスタイル
├── main.tsx                     # エントリーポイント
│
├── features/                    # 機能ごとにコロケーション
│   │
│   ├── auth/                   # 認証機能
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── LoginForm.test.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── LoginPage.test.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── AuthContext.test.tsx
│   │   └── hooks/
│   │       └── useAuth.ts     # AuthContextから抽出
│   │
│   ├── search/                 # 検索機能
│   │   ├── components/
│   │   │   ├── SearchForm.tsx
│   │   │   ├── SearchForm.test.tsx
│   │   │   ├── SearchResult.tsx
│   │   │   ├── SearchResult.test.tsx
│   │   │   ├── ProviderSelector.tsx
│   │   │   ├── ProviderSelector.test.tsx
│   │   │   ├── FileUploadArea.tsx
│   │   │   └── FileUploadArea.test.tsx
│   │   ├── hooks/
│   │   │   ├── useDeepSearch.ts
│   │   │   ├── useDeepSearch.test.ts
│   │   │   ├── useFileUpload.ts
│   │   │   ├── useFileUpload.test.ts
│   │   │   └── useProviderSelection.ts
│   │   ├── types/
│   │   │   ├── searchResult.ts
│   │   │   └── provider.ts
│   │   └── index.ts            # Public API（エクスポート制御）
│   │
│   └── history/                # 履歴機能
│       ├── components/
│       │   ├── HistoryList.tsx
│       │   ├── HistoryList.test.tsx
│       │   ├── HistoryCard.tsx
│       │   └── HistoryCard.test.tsx
│       ├── pages/
│       │   ├── HistoryPage.tsx
│       │   ├── HistoryPage.test.tsx
│       │   ├── HistoryDetailPage.tsx
│       │   └── HistoryDetailPage.test.tsx
│       ├── hooks/
│       │   ├── useHistory.ts
│       │   └── useHistory.test.ts
│       ├── types/
│       │   └── history.ts
│       └── index.ts            # Public API
│
├── shared/                      # 複数機能で共有されるコード
│   ├── components/
│   │   ├── ui/                 # shadcn/uiコンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layouts/
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── AuthLayout.test.tsx
│   │   │   ├── GuestLayout.tsx
│   │   │   └── GuestLayout.test.tsx
│   │   └── Header.tsx          # 複数機能を統合するヘッダー
│   │       └── Header.test.tsx
│   ├── hooks/
│   │   ├── useStorageCache.ts
│   │   └── useStorageCache.test.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   └── storage.test.ts
│   └── lib/
│       └── utils.ts            # cn()など
│
└── reducers/                    # グローバル状態管理（必要なら）
    ├── uiStateReducer.ts
    └── uiStateReducer.test.ts
```

**この構造の利点**:

✅ **コロケーション**: 履歴機能の変更が必要な場合
```
features/history/  ← このディレクトリ内だけで完結
├── components/HistoryList.tsx
├── hooks/useHistory.ts
├── types/history.ts
└── pages/HistoryPage.tsx
```

✅ **高凝集**: 関連するコードが1か所にまとまっている
```typescript
// features/history/index.ts - Public API制御
export { HistoryPage, HistoryDetailPage } from './pages';
export { HistoryList, HistoryCard } from './components';
export { useHistory } from './hooks';
export type { SearchHistory } from './types';

// 他の機能からは index.ts 経由でのみアクセス可能
import { useHistory } from '@/features/history';
```

✅ **低結合**: 機能間の依存関係が明確
```typescript
// ❌ 悪い例（旧構造）
import { HistoryList } from '@/components/HistoryList';
import { useHistory } from '@/hooks/useHistory';
import type { SearchHistory } from '@/types/history';
// → 3つの異なるディレクトリに依存

// ✅ 良い例（新構造）
import { HistoryList, useHistory, SearchHistory } from '@/features/history';
// → 1つのfeatureにのみ依存
```

✅ **テスト容易性**: テストファイルが隣にある
```
features/history/components/
├── HistoryCard.tsx
└── HistoryCard.test.tsx  ← 同じディレクトリにある
```

✅ **スケーラビリティ**: 新機能追加が容易
```
features/
├── auth/
├── search/
├── history/
└── settings/    ← 新機能を追加しても既存コードに影響なし
```

### 4.2 ルーティング実装

**技術選定**: React Router v6

```tsx
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { AuthLayout, GuestLayout } from '@/shared/components/layouts';
import { LoginPage } from '@/features/auth';
import { HistoryPage, HistoryDetailPage } from '@/features/history';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 未認証ルート */}
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* 認証済みルート */}
          <Route element={<AuthLayout />}>
            <Route path="/" element={<HistoryPage />} />
            <Route path="/history/:id" element={<HistoryDetailPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 4.3 レイアウトコンポーネント

#### AuthLayout（認証済みユーザー用）

```tsx
// shared/components/layouts/AuthLayout.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Header } from '@/shared/components';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">認証確認中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Header />
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
```

#### GuestLayout（未認証ユーザー用）

```tsx
// shared/components/layouts/GuestLayout.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';

export default function GuestLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">認証確認中...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
```

## 5. 画面詳細設計

### 5.1 ログイン画面 (LoginPage)

**URL**: `/login`
**場所**: `features/auth/pages/LoginPage.tsx`

**構成**:
- LoginFormコンポーネント（既存）をそのまま使用
- 認証成功後は `/` へリダイレクト

```tsx
// features/auth/pages/LoginPage.tsx
import { LoginForm } from '../components';

export default function LoginPage() {
  return (
    <div className="login-page">
      <LoginForm />
    </div>
  );
}
```

### 5.2 検索履歴画面 (HistoryPage) - デフォルト画面

**URL**: `/` (ログイン後のデフォルト画面)
**場所**: `features/history/pages/HistoryPage.tsx`

**構成**:
- HistoryListコンポーネント（履歴一覧）
- 各履歴項目をHistoryCardで表示
- クリックで詳細画面へ遷移

**機能**:
- 検索履歴の一覧表示
- 日時順ソート（新しい順）
- 検索クエリのプレビュー
- 削除機能
- ページネーション（将来拡張）

**新規検索**:
- ヘッダーのSearchFormから実行
- 検索結果を自動的に履歴に保存

**データ保存**:
- **Phase 1 (MVP)**: LocalStorageに保存
- **Phase 2**: Supabaseに保存（ユーザー間で同期）

```tsx
// features/history/pages/HistoryPage.tsx
import { useNavigate } from 'react-router-dom';
import { HistoryList } from '../components';
import { useHistory } from '../hooks';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { histories, deleteHistory, loading } = useHistory();

  const handleHistoryClick = (id: string) => {
    navigate(`/history/${id}`);
  };

  return (
    <div className="history-page">
      <h1>検索履歴</h1>
      <HistoryList
        histories={histories}
        onHistoryClick={handleHistoryClick}
        onDelete={deleteHistory}
        loading={loading}
      />
    </div>
  );
}
```

### 5.3 検索結果詳細画面 (HistoryDetailPage)

**URL**: `/history/:id`
**場所**: `features/history/pages/HistoryDetailPage.tsx`

**構成**:
- 検索クエリ表示
- 検索実行日時
- 使用したプロバイダー
- SearchResultコンポーネントで結果表示
- 「再検索」ボタン（同じ条件で再検索）

```tsx
// features/history/pages/HistoryDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SearchResult } from '@/features/search';
import { useHistory } from '../hooks';

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getHistoryById } = useHistory();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (id) {
      const item = getHistoryById(id);
      if (!item) {
        navigate('/history');
      } else {
        setHistory(item);
      }
    }
  }, [id, getHistoryById, navigate]);

  if (!history) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="history-detail-page">
      <div className="history-header">
        <h1>{history.query}</h1>
        <p className="timestamp">{new Date(history.timestamp).toLocaleString('ja-JP')}</p>
        <div className="providers">
          {history.providers.map(p => <span key={p} className="provider-badge">{p}</span>)}
        </div>
        <button onClick={() => navigate('/search', { state: { query: history.query } })}>
          同じ条件で再検索
        </button>
      </div>
      <SearchResult result={history.result} loading={false} />
    </div>
  );
}
```

## 6. 新規コンポーネント設計

### 6.1 Header（ヘッダー）

**場所**: `shared/components/Header.tsx`

**責務**:
- アプリケーション名/ロゴ
- 検索フォーム（SearchFormコンポーネント）
- ユーザー情報表示（メールアドレス）
- ログアウトボタン

**注**: Headerは複数機能を統合するため shared/ に配置

```tsx
// shared/components/Header.tsx
import { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { useDeepSearch, SearchForm } from '@/features/search';
import { useHistory } from '@/features/history';

export default function Header() {
  const { user, signOut } = useAuth();
  const [result, setResult] = useState<string>('');
  const { search, loading, error } = useDeepSearch();
  const { addHistory } = useHistory();

  const handleSearch = useCallback(async (query: string, providers: string[], files?: File[]) => {
    const markdown = await search({ query, providers, files });
    setResult(markdown);

    // 検索結果を履歴に保存
    await addHistory({
      query,
      providers,
      result: markdown,
      timestamp: new Date().toISOString(),
    });
  }, [search, addHistory]);

  return (
    <header className="app-header">
      <div className="header-left">
        <h1>みらい会議 DeepResearch</h1>
      </div>
      <div className="header-center">
        <SearchForm onSubmit={handleSearch} loading={loading} />
      </div>
      <div className="header-right">
        <span className="user-email">{user?.email}</span>
        <button onClick={signOut} className="logout-button">
          ログアウト
        </button>
      </div>
    </header>
  );
}
```

**注**: 検索実行後の結果表示方法は実装時に決定（モーダル/メインエリアへの表示など）

### 6.2 SearchForm（検索フォーム）

**場所**: `features/search/components/SearchForm.tsx`

**責務**:
- クエリ入力
- プロバイダー選択
- ファイルアップロード
- 検索実行

```tsx
// features/search/components/SearchForm.tsx
import { useState } from 'react';
import { useProviderSelection } from '../hooks/useProviderSelection';
import { useFileUpload } from '../hooks/useFileUpload';
import { ProviderSelector } from './ProviderSelector';
import { FileUploadArea } from './FileUploadArea';
import type { ProviderType, FileData } from '../types';

interface SearchFormProps {
  onSubmit: (query: string, providers: ProviderType[], files?: FileData[]) => Promise<void>;
  loading: boolean;
}

export default function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const { selectedProviders, handleProviderToggle } = useProviderSelection();
  const { files, addFiles, removeFile, error: fileError } = useFileUpload();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(query, selectedProviders, files);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索キーワードを入力してください..."
          disabled={loading}
          className="query-input"
        />
        <ProviderSelector
          selectedProviders={selectedProviders}
          onToggle={handleProviderToggle}
          isOpen={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim() || selectedProviders.length === 0}
          className="submit-button"
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </div>
      <FileUploadArea
        files={files}
        onFilesAdd={addFiles}
        onFileRemove={removeFile}
        error={fileError}
      />
    </form>
  );
}
```

### 6.3 SearchResult（検索結果表示）

**場所**: `features/search/components/SearchResult.tsx`

**責務**:
- マークダウン結果のレンダリング
- ローディング状態
- プレースホルダー

```tsx
// features/search/components/SearchResult.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SearchResultProps {
  result: string;
  loading: boolean;
}

export default function SearchResult({ result, loading }: SearchResultProps) {
  if (loading) {
    return <div className="loading">処理中...</div>;
  }

  if (!result) {
    return <div className="placeholder">検索結果がここに表示されます</div>;
  }

  return (
    <div className="search-result">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
    </div>
  );
}
```

### 6.4 HistoryList（履歴一覧）

**場所**: `features/history/components/HistoryList.tsx`

**責務**:
- 履歴項目の一覧表示
- 空状態の表示

```tsx
// features/history/components/HistoryList.tsx
import { HistoryCard } from './HistoryCard';
import type { SearchHistory } from '../types';

interface HistoryListProps {
  histories: SearchHistory[];
  onHistoryClick: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function HistoryList({
  histories,
  onHistoryClick,
  onDelete,
  loading
}: HistoryListProps) {
  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (histories.length === 0) {
    return <div className="empty-state">検索履歴がありません</div>;
  }

  return (
    <div className="history-list">
      {histories.map((history) => (
        <HistoryCard
          key={history.id}
          history={history}
          onClick={() => onHistoryClick(history.id)}
          onDelete={() => onDelete(history.id)}
        />
      ))}
    </div>
  );
}
```

### 6.5 HistoryCard（履歴カード）

**場所**: `features/history/components/HistoryCard.tsx`

**責務**:
- 個別履歴項目の表示
- クエリプレビュー
- タイムスタンプ
- 削除ボタン

```tsx
// features/history/components/HistoryCard.tsx
import type { SearchHistory } from '../types';

interface HistoryCardProps {
  history: SearchHistory;
  onClick: () => void;
  onDelete: () => void;
}

export default function HistoryCard({ history, onClick, onDelete }: HistoryCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="history-card" onClick={onClick}>
      <div className="card-header">
        <h3 className="query">{history.query}</h3>
        <button onClick={handleDelete} className="delete-button">
          🗑️
        </button>
      </div>
      <p className="timestamp">
        {new Date(history.timestamp).toLocaleString('ja-JP')}
      </p>
      <div className="providers">
        {history.providers.map((p) => (
          <span key={p} className="provider-badge">{p}</span>
        ))}
      </div>
    </div>
  );
}
```

## 7. 型定義

### 7.1 検索履歴型

**場所**: `features/history/types/history.ts`

```typescript
// features/history/types/history.ts
export interface SearchHistory {
  id: string;                    // UUID
  query: string;                 // 検索クエリ
  providers: ProviderType[];     // 使用したプロバイダー
  result: string;                // マークダウン結果
  timestamp: string;             // ISO 8601形式
  files?: {                      // アップロードされたファイル（オプション）
    name: string;
    size: number;
  }[];
}

export interface HistoryStorage {
  histories: SearchHistory[];
  lastUpdated: string;
}
```

## 8. カスタムフック設計

### 8.1 useHistory

**場所**: `features/history/hooks/useHistory.ts`

**責務**: 検索履歴の管理

```typescript
// features/history/hooks/useHistory.ts
import { useState, useCallback, useEffect } from 'react';
import { storage } from '@/shared/utils/storage';
import type { SearchHistory } from '../types';

const HISTORY_KEY = 'deepresearch-history';
const MAX_HISTORY_ITEMS = 100;

export function useHistory() {
  const [histories, setHistories] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // 履歴の読み込み
  useEffect(() => {
    const loadHistories = () => {
      try {
        const stored = storage.get<SearchHistory[]>(HISTORY_KEY);
        setHistories(stored || []);
      } catch (error) {
        console.error('Failed to load histories:', error);
        setHistories([]);
      } finally {
        setLoading(false);
      }
    };
    loadHistories();
  }, []);

  // 履歴の追加
  const addHistory = useCallback((item: Omit<SearchHistory, 'id'>) => {
    const newHistory: SearchHistory = {
      ...item,
      id: crypto.randomUUID(),
    };

    setHistories((prev) => {
      const updated = [newHistory, ...prev].slice(0, MAX_HISTORY_ITEMS);
      storage.set(HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  // 履歴の削除
  const deleteHistory = useCallback((id: string) => {
    setHistories((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      storage.set(HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  // IDで履歴を取得
  const getHistoryById = useCallback((id: string) => {
    return histories.find((h) => h.id === id);
  }, [histories]);

  // 全履歴をクリア
  const clearAllHistory = useCallback(() => {
    setHistories([]);
    storage.remove(HISTORY_KEY);
  }, []);

  return {
    histories,
    loading,
    addHistory,
    deleteHistory,
    getHistoryById,
    clearAllHistory,
  };
}
```

## 9. スタイリング方針

### 9.1 Tailwind CSS v4 + shadcn/ui

**基本アプローチ**:
- Tailwind CSSのユーティリティクラスを使用
- カスタムCSSは最小限に抑える
- shadcn/uiコンポーネントをベースにカスタマイズ

### 9.2 必要なパッケージ

```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.542.0",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4"
  }
}
```

### 9.3 セットアップ

#### postcss.config.mjs
```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

#### src/lib/utils.ts
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 9.4 Tailwind CSSによるレイアウト例

```tsx
// AuthLayout.tsx
<div className="flex flex-col h-screen">
  <Header />
  <main className="flex-1 overflow-y-auto p-6">
    <Outlet />
  </main>
</div>

// Header.tsx
<header className="h-16 flex items-center justify-between px-6 border-b bg-background">
  <h1 className="text-xl font-semibold">みらい会議 DeepResearch</h1>
  <div className="flex-1 px-8">
    <SearchForm onSubmit={handleSearch} loading={loading} />
  </div>
  <div className="flex items-center gap-4">
    <span className="text-sm text-muted-foreground">{user?.email}</span>
    <Button variant="outline" onClick={signOut}>ログアウト</Button>
  </div>
</header>
```

### 9.5 レスポンシブ対応

Tailwindのブレークポイントを使用:

```tsx
// Header - モバイル対応
<header className="flex flex-col md:flex-row items-center gap-4 px-4 md:px-6 py-4 border-b">
  <h1 className="text-lg md:text-xl font-semibold">みらい会議 DeepResearch</h1>
  <div className="flex-1 w-full md:w-auto">
    <SearchForm onSubmit={handleSearch} loading={loading} />
  </div>
  <div className="flex items-center gap-4">
    <span className="text-sm text-muted-foreground">{user?.email}</span>
    <Button variant="outline" onClick={signOut}>ログアウト</Button>
  </div>
</header>
```

## 10. 実装フェーズ

### Phase 0: UIフレームワークセットアップ

#### 1. Tailwind CSS v4のインストール

```bash
cd frontend
bun add -D tailwindcss@next @tailwindcss/postcss@next
bun add tailwind-merge clsx class-variance-authority
bun add lucide-react
```

#### 2. PostCSS設定

```bash
# postcss.config.mjsを作成
echo 'const config = { plugins: ["@tailwindcss/postcss"] }; export default config;' > postcss.config.mjs
```

#### 3. グローバルCSSの更新

```css
/* src/index.css */
@import "tailwindcss";
```

#### 4. ユーティリティ関数の追加

```bash
mkdir -p src/lib
```

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### 5. shadcn/uiコンポーネントの追加

必要なコンポーネントを手動で追加（または shadcn CLI使用）:
- Button
- Card
- Input
- Select
- Badge
- ScrollArea
- Tooltip
- Dropdown Menu

```bash
# shadcn/ui CLIのインストール（オプション）
bunx shadcn@latest init

# 必要なコンポーネントを追加
bunx shadcn@latest add button
bunx shadcn@latest add card
bunx shadcn@latest add input
bunx shadcn@latest add badge
bunx shadcn@latest add scroll-area
bunx shadcn@latest add tooltip
bunx shadcn@latest add dropdown-menu
```

**または手動でコピー**:
mirai-gikaiプロジェクトから `src/components/ui/` をコピー

### Phase 1: 基本構造（MVP）

1. **React Router導入**
   ```bash
   bun add react-router-dom
   ```

2. **既存CSSの移行**
   - App.cssのスタイルをTailwindクラスに変換
   - LoginForm.cssをTailwindクラスに変換
   - FileUploadArea.cssをTailwindクラスに変換

3. **レイアウトコンポーネント実装**
   - AuthLayout（認証済みユーザー用）
   - GuestLayout（未認証ユーザー用）
   - Header（SearchForm統合、shadcn/ui Button使用）

4. **画面コンポーネント分割**
   - LoginPage
   - HistoryPage（デフォルト画面）
   - HistoryDetailPage

5. **useHistory（LocalStorage版）実装**

6. **基本的なナビゲーション**

### Phase 2: UIコンポーネント移行

1. **LoginFormの改善**
   - shadcn/ui InputとButtonを使用
   - バリデーションエラー表示の改善

2. **SearchFormの作成**
   - shadcn/ui Input, Select, Buttonを使用
   - ファイルアップロードエリアの改善

3. **HistoryListの作成**
   - shadcn/ui Cardを使用
   - バッジでプロバイダー表示

4. **SearchResultの改善**
   - shadcn/ui ScrollAreaを使用
   - コードブロックのシンタックスハイライト

### Phase 3: 機能拡張

1. Supabaseへの履歴保存
2. 検索結果の詳細表示強化
3. フィルター・ソート機能
4. ページネーション

### Phase 4: UX改善

1. アニメーション追加（Tailwind CSS animate）
2. キーボードショートカット
3. 検索結果のエクスポート機能
4. ダークモード対応（Tailwind CSS dark mode）
5. トースト通知（shadcn/ui Toast）

## 11. テスト方針

### 11.1 画面遷移テスト

```typescript
// App.test.tsx
describe('App Routing', () => {
  it('should redirect unauthenticated users to login', () => {
    // 未認証ユーザーは /login にリダイレクト
  });

  it('should show search page for authenticated users', () => {
    // 認証済みユーザーは /search が表示される
  });

  it('should navigate between search and history pages', () => {
    // 検索画面と履歴画面の遷移
  });
});
```

### 11.2 履歴機能テスト

```typescript
// useHistory.test.ts
describe('useHistory', () => {
  it('should add new history item', () => {
    // 履歴追加機能
  });

  it('should delete history item', () => {
    // 履歴削除機能
  });

  it('should limit history to MAX_HISTORY_ITEMS', () => {
    // 最大件数制限
  });
});
```

## 12. 実装タスクリスト

**実装の順序**:
1. **Phase 1: React Router導入とルーティング化**（既存の Type-based 構造のまま）
2. **Phase 2: ディレクトリ構造変更**（Feature-based へ移行）
3. **Phase 3: 履歴機能の実装**（TDDサイクル）

**方針**:
- **段階的な変更**: 一度に大きな変更をせず、各フェーズで確実に動作確認
- **Tidy First原則**: 構造変更 → 機能追加を明確に分離
- **既存機能の保護**: 各フェーズで全テストをパスさせ続ける
- **CSS手書き**: UIフレームワークは使用せず、CSS手書きで実装

### Phase 1: React Router 導入とルーティング化

**目的**: ルーティング構造を導入（Type-based 構造のまま）

```bash
cd frontend
bun add react-router-dom
```

#### 1.1 LoginPage の作成

- [ ] `src/pages/LoginPage.tsx` を作成
  ```tsx
  import LoginForm from '../components/LoginForm';
  import './LoginPage.css';

  export default function LoginPage() {
    return (
      <div className="login-page">
        <LoginForm />
      </div>
    );
  }
  ```

- [ ] `src/pages/LoginPage.css` を作成
  ```css
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  ```

#### 1.2 HistoryPage（プレースホルダー）の作成

- [ ] `src/pages/HistoryPage.tsx` を作成
  ```tsx
  import './HistoryPage.css';

  export default function HistoryPage() {
    return (
      <div className="history-page">
        <h1>history</h1>
        <p className="placeholder">履歴機能は後で実装します</p>
      </div>
    );
  }
  ```

- [ ] `src/pages/HistoryPage.css` を作成
  ```css
  .history-page {
    padding: 24px;
  }

  .history-page h1 {
    font-size: 2rem;
    font-weight: bold;
  }

  .history-page .placeholder {
    margin-top: 16px;
    color: #666;
  }
  ```

#### 1.3 レイアウトコンポーネントの作成

- [ ] `src/layouts/AuthLayout.tsx` を作成
  ```tsx
  import { Navigate, Outlet } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  import './AuthLayout.css';

  export default function AuthLayout() {
    const { user, loading } = useAuth();

    if (loading) {
      return <div className="loading">認証確認中...</div>;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="auth-layout">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    );
  }
  ```

- [ ] `src/layouts/AuthLayout.css` を作成
  ```css
  .auth-layout {
    min-height: 100vh;
  }

  .auth-layout .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }

  .auth-layout .loading {
    padding: 24px;
  }
  ```

- [ ] `src/layouts/GuestLayout.tsx` を作成
  ```tsx
  import { Navigate, Outlet } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';

  export default function GuestLayout() {
    const { user, loading } = useAuth();

    if (loading) {
      return <div className="loading">認証確認中...</div>;
    }

    if (user) {
      return <Navigate to="/" replace />;
    }

    return <Outlet />;
  }
  ```

#### 1.4 App.tsx のルーティング化

- [ ] `App.tsx` を書き換え
  ```tsx
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import { AuthProvider } from './contexts/AuthContext';
  import AuthLayout from './layouts/AuthLayout';
  import GuestLayout from './layouts/GuestLayout';
  import LoginPage from './pages/LoginPage';
  import HistoryPage from './pages/HistoryPage';

  function App() {
    return (
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* 未認証ルート */}
            <Route element={<GuestLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 認証済みルート */}
            <Route element={<AuthLayout />}>
              <Route path="/" element={<HistoryPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    );
  }

  export default App;
  ```

#### 1.5 テスト更新

- [ ] App.test.tsx を更新（ルーティングに対応）
- [ ] 全テストがパスすることを確認

#### 1.6 コミット作成

- [ ] 全テストがパスすることを確認
- [ ] TypeScriptエラーなし、Lintエラーなし確認
- [ ] ブラウザで動作確認（ログイン → "history"画面表示）
- [ ] コミット作成
  ```bash
  git add .
  git commit -m "feat: add React Router and basic routing

  - Add LoginPage, HistoryPage (placeholder)
  - Add AuthLayout, GuestLayout with CSS
  - Convert App.tsx to routing structure
  - Login redirects to / (history page)
  - All existing tests pass
  "
  ```

### Phase 2: ディレクトリ構造変更（Feature-based への移行）

**目的**: Type-based → Feature-based へ移行（機能変更なし、構造変更のみ）

#### 2.1 features/ と shared/ ディレクトリの作成

- [ ] `src/features/` ディレクトリを作成
- [ ] `src/shared/` ディレクトリを作成

#### 2.2 認証機能の移行

- [ ] 以下のファイルを `src/features/auth/` 配下に移動
  ```
  src/contexts/AuthContext.tsx → features/auth/contexts/AuthContext.tsx
  src/components/LoginForm.tsx → features/auth/components/LoginForm.tsx
  src/pages/LoginPage.tsx → features/auth/pages/LoginPage.tsx
  ```

- [ ] `features/auth/index.ts` を作成
  ```typescript
  export { AuthProvider, useAuth } from './contexts/AuthContext';
  export { default as LoginPage } from './pages/LoginPage';
  export { default as LoginForm } from './components/LoginForm';
  ```

#### 2.3 検索機能の移行

- [ ] 以下のファイルを `src/features/search/` 配下に移動
  ```
  src/hooks/useDeepSearch.ts → features/search/hooks/useDeepSearch.ts
  src/hooks/useDeepSearch.test.ts → features/search/hooks/useDeepSearch.test.ts
  src/hooks/useFileUpload.ts → features/search/hooks/useFileUpload.ts
  src/hooks/useProviderSelection.ts → features/search/hooks/useProviderSelection.ts
  src/types/searchResult.ts → features/search/types/searchResult.ts
  src/types/provider.ts → features/search/types/provider.ts
  src/components/ProviderSelector.tsx → features/search/components/ProviderSelector.tsx
  src/components/FileUploadArea.tsx → features/search/components/FileUploadArea.tsx
  ```

- [ ] `features/search/index.ts` を作成
  ```typescript
  export { useDeepSearch } from './hooks/useDeepSearch';
  export { useFileUpload } from './hooks/useFileUpload';
  export { useProviderSelection } from './hooks/useProviderSelection';
  export { default as ProviderSelector } from './components/ProviderSelector';
  export { default as FileUploadArea } from './components/FileUploadArea';
  export type { ProviderType } from './types/provider';
  ```

#### 2.4 履歴機能の骨組み

- [ ] `features/history/pages/HistoryPage.tsx` を移動（src/pages/ から）
- [ ] `features/history/index.ts` を作成
  ```typescript
  export { default as HistoryPage } from './pages/HistoryPage';
  ```

#### 2.5 共通ユーティリティの移行

- [ ] `src/utils/storage.ts` → `src/shared/utils/storage.ts`
- [ ] `src/reducers/uiStateReducer.ts` → `src/shared/reducers/uiStateReducer.ts`（使用されていれば）

#### 2.6 レイアウトの移行

- [ ] `src/layouts/AuthLayout.tsx` → `src/shared/components/layouts/AuthLayout.tsx`
- [ ] `src/layouts/AuthLayout.css` → `src/shared/components/layouts/AuthLayout.css`
- [ ] `src/layouts/GuestLayout.tsx` → `src/shared/components/layouts/GuestLayout.tsx`

#### 2.7 ページCSSの移行

- [ ] `src/pages/LoginPage.css` → `features/auth/pages/LoginPage.css`
- [ ] `src/pages/HistoryPage.css` → `features/history/pages/HistoryPage.css`

#### 2.8 import パスの修正

- [ ] App.tsx の import を `@/features/*` 形式に修正
- [ ] 全ファイルの import パスを修正
  ```tsx
  // Before
  import { useAuth } from '../contexts/AuthContext';

  // After
  import { useAuth } from '@/features/auth';
  ```

#### 2.9 旧ディレクトリの削除

- [ ] 空になったディレクトリを削除
  ```
  src/contexts/
  src/hooks/
  src/types/
  src/components/
  src/pages/
  src/layouts/
  src/utils/
  ```

#### 2.10 テスト確認

- [ ] 全テストがパスすることを確認
- [ ] TypeScriptエラーなし確認
- [ ] ブラウザで動作確認

#### 2.11 コミット作成

- [ ] コミット作成
  ```bash
  git add .
  git commit -m "refactor: migrate to feature-based directory structure

  - Move auth files to features/auth with CSS
  - Move search files to features/search
  - Move history to features/history with CSS
  - Move layouts to shared/components/layouts with CSS
  - Move shared utilities to shared/
  - Update all import paths to @/features/* format
  - All existing tests pass
  "
  ```

## 12. バックエンド設計（履歴機能）

### 12.1 データベーススキーマ設計

**テーブル**: `search_histories`

```sql
-- 検索履歴テーブル
CREATE TABLE search_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  providers TEXT[] NOT NULL, -- ['kokkai', 'web', 'gov']
  result_summary TEXT, -- 検索結果のサマリー（最初の200文字程度）
  result_markdown TEXT, -- 検索結果全文（Markdown形式）
  file_names TEXT[], -- アップロードされたファイル名の配列
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_search_histories_user_id ON search_histories(user_id);
CREATE INDEX idx_search_histories_created_at ON search_histories(created_at DESC);
CREATE INDEX idx_search_histories_user_created ON search_histories(user_id, created_at DESC);

-- updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_histories_updated_at
  BEFORE UPDATE ON search_histories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**データ型の説明**:
- `id`: UUID型のプライマリキー（自動生成）
- `user_id`: auth.usersテーブルへの外部キー（ユーザー削除時はカスケード削除）
- `query`: 検索クエリ文字列
- `providers`: 検索対象プロバイダーの配列（PostgreSQL配列型）
- `result_summary`: 検索結果の要約（一覧表示用）
- `result_markdown`: 検索結果の全文（詳細表示用）
- `file_names`: アップロードファイル名の配列（検索時の参照ファイル記録用）
- `created_at`: 作成日時（自動設定）
- `updated_at`: 更新日時（トリガーで自動更新）

### 12.2 Row Level Security (RLS) ポリシー

**セキュリティ要件**: ユーザーは自分の履歴のみアクセス可能

```sql
-- RLSを有効化
ALTER TABLE search_histories ENABLE ROW LEVEL SECURITY;

-- SELECT ポリシー: 自分の履歴のみ閲覧可能
CREATE POLICY "Users can view own search histories"
  ON search_histories
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT ポリシー: 自分の履歴のみ作成可能
CREATE POLICY "Users can create own search histories"
  ON search_histories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE ポリシー: 自分の履歴のみ更新可能
CREATE POLICY "Users can update own search histories"
  ON search_histories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE ポリシー: 自分の履歴のみ削除可能
CREATE POLICY "Users can delete own search histories"
  ON search_histories
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 12.3 バックエンドAPI設計

**実装場所**: `backend/lib/deepresearch-api.ts`

#### 12.3.1 履歴保存API

**検索実行と同時に履歴を保存する設計**:

```typescript
// backend/lib/deepresearch-api.ts
import type { SupabaseClient } from '@supabase/supabase-js';

interface SearchHistoryRecord {
  user_id: string;
  query: string;
  providers: string[];
  result_summary: string;
  result_markdown: string;
  file_names: string[];
}

/**
 * 検索実行 & 履歴保存
 */
export async function executeSearchAndSaveHistory(
  supabase: SupabaseClient,
  params: {
    query: string;
    providers: string[];
    files?: { name: string; content: string; mimeType: string }[];
  }
): Promise<{ markdown: string; historyId: string }> {
  // 1. DeepResearch APIで検索実行
  const markdown = await deepResearch(params);

  // 2. 検索結果のサマリーを生成（最初の200文字）
  const summary = markdown.substring(0, 200) + (markdown.length > 200 ? '...' : '');

  // 3. ファイル名の抽出
  const fileNames = params.files?.map(f => f.name) || [];

  // 4. 認証ユーザーIDを取得
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // 5. 履歴をSupabaseに保存
  const { data, error } = await supabase
    .from('search_histories')
    .insert({
      user_id: user.id,
      query: params.query,
      providers: params.providers,
      result_summary: summary,
      result_markdown: markdown,
      file_names: fileNames,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save search history:', error);
    // 履歴保存失敗は検索結果には影響させない
  }

  return {
    markdown,
    historyId: data?.id || '',
  };
}
```

#### 12.3.2 履歴取得API

```typescript
/**
 * 履歴一覧取得（最新100件、ページネーション対応）
 */
export async function getSearchHistories(
  supabase: SupabaseClient,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<SearchHistory[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const { data, error } = await supabase
    .from('search_histories')
    .select('id, query, providers, result_summary, file_names, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch search histories: ${error.message}`);
  }

  return data || [];
}

/**
 * 履歴詳細取得
 */
export async function getSearchHistoryById(
  supabase: SupabaseClient,
  id: string
): Promise<SearchHistory | null> {
  const { data, error } = await supabase
    .from('search_histories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch search history: ${error.message}`);
  }

  return data;
}

/**
 * 履歴削除
 */
export async function deleteSearchHistory(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('search_histories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete search history: ${error.message}`);
  }
}
```

### 12.4 型定義

**共通型定義**: `types/supabase.types.ts`

```typescript
export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  providers: string[];
  result_summary: string;
  result_markdown: string;
  file_names: string[];
  created_at: string;
  updated_at: string;
}

export type SearchHistoryListItem = Pick<
  SearchHistory,
  'id' | 'query' | 'providers' | 'result_summary' | 'file_names' | 'created_at'
>;
```

### 12.5 フロントエンド連携フロー

#### 検索実行時のフロー

```
┌─────────────┐
│ ユーザー     │
└──────┬──────┘
       │ 検索実行
       ↓
┌──────────────────────────────┐
│ Frontend (Header/SearchForm) │
└──────┬───────────────────────┘
       │ POST /api/search
       ↓
┌─────────────────────────────────────┐
│ Backend API                         │
│ executeSearchAndSaveHistory()       │
│  1. DeepResearch API呼び出し        │
│  2. 検索結果取得                     │
│  3. Supabaseに履歴保存              │
└──────┬──────────────────────────────┘
       │ { markdown, historyId }
       ↓
┌──────────────────────────────┐
│ Frontend                     │
│  - 検索結果を画面に表示       │
│  - historyIdを保持            │
└──────────────────────────────┘
```

#### 履歴一覧取得フロー

```
┌─────────────┐
│ ユーザー     │
└──────┬──────┘
       │ 履歴ページ表示
       ↓
┌──────────────────────────────┐
│ Frontend (HistoryPage)       │
│ useHistory() hook            │
└──────┬───────────────────────┘
       │ Supabase Client直接利用
       ↓
┌─────────────────────────────┐
│ Supabase (RLS適用)          │
│ SELECT * FROM               │
│   search_histories          │
│ WHERE user_id = auth.uid()  │
│ ORDER BY created_at DESC    │
│ LIMIT 100                   │
└──────┬──────────────────────┘
       │ SearchHistory[]
       ↓
┌──────────────────────────────┐
│ Frontend                     │
│  - HistoryList表示           │
│  - HistoryCard x N個         │
└──────────────────────────────┘
```

### 12.6 Supabase移行手順

**Phase 3では一旦LocalStorageで実装し、Phase 4でSupabaseに移行**:

**Phase 3 (LocalStorageベース)**:
```typescript
// features/history/hooks/useHistory.ts
export function useHistory() {
  // LocalStorageを使用
  const [histories, setHistories] = useState<SearchHistory[]>(() => {
    const saved = localStorage.getItem('search-histories');
    return saved ? JSON.parse(saved) : [];
  });

  // ...
}
```

**Phase 4 (Supabase移行)**:
```typescript
// features/history/hooks/useHistory.ts
import { supabase } from '@/lib/supabaseClient';

export function useHistory() {
  const [histories, setHistories] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabaseから履歴を取得
  useEffect(() => {
    async function fetchHistories() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('search_histories')
          .select('id, query, providers, result_summary, file_names, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setHistories(data || []);
      } catch (error) {
        console.error('Failed to fetch histories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistories();
  }, []);

  // リアルタイム購読（オプション）
  useEffect(() => {
    const subscription = supabase
      .channel('search_histories_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'search_histories' },
        (payload) => {
          // 履歴変更時に再取得
          fetchHistories();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ...
}
```

### 12.7 セキュリティ考慮事項

1. **認証必須**: 全ての履歴操作は認証済みユーザーのみ
2. **RLSによる権限制御**: データベースレベルで自分の履歴のみアクセス可能
3. **SQLインジェクション対策**: Supabase Clientを使用することで自動的に対策
4. **XSS対策**: Markdown表示時にサニタイズ（react-markdownが対応）
5. **CSRF対策**: Supabaseの認証トークンベースの認証で対応
6. **データサイズ制限**:
   - `result_markdown`は最大1MB程度に制限
   - 履歴件数は100件に制限（自動削除）

### 12.8 パフォーマンス最適化

1. **インデックス**: `user_id`と`created_at`の複合インデックス
2. **ページネーション**: 一覧取得時は100件ずつ取得
3. **部分取得**: 一覧表示では`result_summary`のみ取得、詳細表示で全文取得
4. **キャッシュ**: フロントエンドでReact Queryを使用したキャッシング（将来）
5. **リアルタイム更新**: Supabase Realtimeで履歴変更を購読（オプション）

### Phase 3: 履歴機能の実装（TDDサイクル）

**目的**: 履歴機能を本格実装する（まずはLocalStorageベース）

この時点で、Feature-based 構造への移行が完了しているので、
新しい構造で履歴機能を TDD で実装します。

**注**: Phase 3ではLocalStorageを使用し、Phase 4でSupabaseに移行します。

#### 3.1 useHistory フック（TDDサイクル）

**🔴 RED: テストを先に書く**
- [ ] `features/history/hooks/useHistory.test.ts` を作成
  ```typescript
  describe('useHistory', () => {
    it('should initialize with empty histories', () => {});
    it('should add new history item', () => {});
    it('should delete history item by id', () => {});
    it('should get history by id', () => {});
    it('should limit history to 100 items', () => {});
    it('should persist to localStorage', () => {});
    it('should restore from localStorage on mount', () => {});
  });
  ```
- [ ] テスト実行 → 全て失敗（🔴 RED）

**🟢 GREEN: 最小限の実装**
- [ ] `features/history/types/history.ts` を作成
- [ ] `features/history/hooks/useHistory.ts` を作成
- [ ] テスト実行 → 全て成功（🟢 GREEN）

**🔵 REFACTOR: リファクタリング**
- [ ] コードの重複を排除
- [ ] テスト実行 → 成功を維持

#### 3.2 HistoryCard コンポーネント（TDDサイクル）

**🔴 RED: テストを先に書く**
- [ ] `features/history/components/HistoryCard.test.tsx` を作成
- [ ] テスト実行 → 失敗（🔴 RED）

**🟢 GREEN: 実装**
- [ ] `features/history/components/HistoryCard.tsx` を作成
- [ ] テスト実行 → 成功（🟢 GREEN）

**🔵 REFACTOR: スタイル調整**
- [ ] `features/history/components/HistoryCard.css` でスタイリング
- [ ] テスト実行 → 成功を維持

#### 3.3 HistoryList コンポーネント（TDDサイクル）

**🔴 RED: テストを先に書く**
- [ ] `features/history/components/HistoryList.test.tsx` を作成
- [ ] テスト実行 → 失敗（🔴 RED）

**🟢 GREEN: 実装**
- [ ] `features/history/components/HistoryList.tsx` を作成
- [ ] テスト実行 → 成功（🟢 GREEN）

**🔵 REFACTOR: スタイル調整**
- [ ] `features/history/components/HistoryList.css` でスタイリング
- [ ] テスト実行 → 成功を維持

#### 3.4 HistoryPage の完成（TDDサイクル）

**🔴 RED: テストを先に書く**
- [ ] `features/history/pages/HistoryPage.test.tsx` を作成
- [ ] テスト実行 → 失敗（🔴 RED）

**🟢 GREEN: プレースホルダーを本実装に置き換え**
- [ ] HistoryPage を本実装に書き換え
- [ ] useHistory, HistoryList を使用
- [ ] テスト実行 → 成功（🟢 GREEN）

**🔵 REFACTOR: スタイル調整**
- [ ] CSS で調整
- [ ] テスト実行 → 成功を維持

#### 3.5 features/history のエクスポート更新

- [ ] `features/history/index.ts` を更新
  ```typescript
  export { default as HistoryPage } from './pages/HistoryPage';
  export { useHistory } from './hooks/useHistory';
  export { default as HistoryList } from './components/HistoryList';
  export { default as HistoryCard } from './components/HistoryCard';
  export type { SearchHistory } from './types/history';
  ```

#### 3.6 コミット作成

- [ ] 全テストがパスすることを確認
- [ ] TypeScriptエラーなし、Lintエラーなし確認
- [ ] ブラウザで動作確認
  - [ ] ログイン → 履歴一覧表示
  - [ ] 履歴が空の状態を確認
  - [ ] （検索機能はまだヘッダーに統合されていないので、後で確認）
- [ ] コミット作成
  ```bash
  git add .
  git commit -m "feat: implement history feature

  - Add useHistory hook with localStorage persistence
  - Add HistoryList and HistoryCard components with CSS
  - Replace HistoryPage placeholder with full implementation
  - All tests pass (TDD approach)
  "
  ```

### 各フェーズ完了後の確認事項

**各フェーズ完了後、必ず以下を確認**:

1. ✅ **全てのテストが緑（成功）**
   - `bun test` を実行
   - 既存機能が壊れていないことを確認

2. ✅ **TypeScriptエラーなし**
   - `bun run type-check` を実行
   - import パスの修正漏れがないか確認

3. ✅ **Lintエラーなし**
   - `bun run lint` を実行

4. ✅ **ブラウザで動作確認**
   - 実際に動かして確認

5. ✅ **コミット作成**
   - 各フェーズごとにコミット
   - コミットメッセージは変更内容を明確に

### 今後の実装（Phase 3 の後）

**Phase 3 完了後、以下を順次実装**:

1. **Header + SearchForm の統合**
   - Header コンポーネント作成
   - 既存の App.tsx の検索機能を Header に移動
   - ヘッダーから検索実行 → 履歴に保存

2. **HistoryDetailPage の実装**
   - 個別の検索結果詳細画面
   - `/history/:id` ルート

3. **検索結果の履歴保存連携**
   - Header の検索実行時に useHistory で保存
   - HistoryPage から履歴一覧を確認

4. **Supabase への履歴保存移行**（オプション）
   - LocalStorage → Supabase へ移行
   - ユーザー間で履歴を同期

## 13. まとめ

### 今回の構造変更の範囲

**Phase 1: React Router導入**:
1. **React Router**: クライアントサイドルーティング導入
2. **レイアウト**: AuthLayout, GuestLayout の作成（CSS手書き）
3. **ページ**: LoginPage, HistoryPage（プレースホルダー）作成
4. **スタイリング**: 各コンポーネントのCSSファイルを手書きで作成

**Phase 2: ディレクトリ構造変更**:
1. **ディレクトリ構造**: Type-based → Feature-based + Colocation
2. **パスエイリアス**: `@/features/*` 形式の導入
3. **ファイル移動**: 既存ファイルとCSSを機能ごとに整理
4. **import更新**: 全てのimportパスを新構造に対応

**Phase 3: 履歴機能実装**:
1. **useHistory**: LocalStorageベースの履歴管理フック
2. **HistoryCard**: 個別履歴表示コンポーネント（CSS手書き）
3. **HistoryList**: 履歴一覧表示コンポーネント（CSS手書き）
4. **HistoryPage**: プレースホルダーから本実装へ置き換え

**今回やらないこと（将来の実装）**:
1. **Header + SearchForm 統合**: ヘッダー中心のレイアウト
2. **HistoryDetailPage**: 個別履歴詳細画面
3. **検索結果の履歴保存連携**: Header からの検索実行時の履歴保存
4. **Supabase への履歴保存移行**: LocalStorage → Supabase

### メリット

#### アーキテクチャ
- **高凝集・低結合**: Feature-based構造により機能ごとに凝集、機能間の結合度を最小化
- **コロケーション**: 関連ファイル（TSX + CSS + Test）が近くにあり、変更時の影響範囲が明確
- **テスト容易性**: テストファイルが隣にあり、テストの独立性が高い
- **スケーラビリティ**: 新機能追加が容易、既存コードへの影響が最小
- **保守性向上**: 機能単位での変更・削除が容易

#### スタイリング
- **CSS手書き**: UIフレームワークに依存せず、シンプルで理解しやすい
- **BEM命名規則**: コンポーネントごとに独立したCSSクラス名
- **CSS Modules対応可**: 将来的にCSS Modulesへの移行も容易
- **カスタマイズ性**: フレームワークの制約なく自由にスタイリング可能
- **学習コスト低**: CSSの基礎知識のみで実装・保守が可能

#### 開発プロセス
- **段階的変更**: Phase 1→2→3と段階的に実装、各段階でテストをパス
- **Tidy First原則**: 構造変更と機能追加を明確に分離
- **TDD**: Phase 3で履歴機能をTDDサイクルで実装
- **既存機能保護**: 全フェーズで既存テストを維持
