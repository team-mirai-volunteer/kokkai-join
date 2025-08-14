# Next.js 15 アーキテクチャ設計書

このドキュメントでは、Kokkai-JoinプロジェクトにおけるNext.js 15 + React 19を使用した推奨アーキテクチャについて説明します。

## 技術スタック

- **Next.js**: 15.4.6
- **React**: 19.1.0  
- **TypeScript**: 5.x
- **UI Library**: MUI (Material-UI) 7.x
- **State Management**: Zustand (推奨)
- **Validation**: Zod
- **Package Manager**: Bun

## 推奨ディレクトリ構成

```
frontend/src/
├── app/                          # App Router (ルーティング層)
│   ├── (auth)/                   # Route Groups - 認証関連
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── register/
│   │       ├── page.tsx
│   │       └── loading.tsx
│   ├── (dashboard)/              # Route Groups - メインアプリ
│   │   ├── search/
│   │   │   ├── page.tsx
│   │   │   ├── results/
│   │   │   │   └── page.tsx
│   │   │   └── components/       # ページ専用コンポーネント
│   │   └── meeting/
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── components/
│   ├── api/                      # API Routes (必要最小限)
│   │   └── webhooks/
│   ├── components/               # アプリ全体共通コンポーネント
│   ├── globals.css
│   ├── layout.tsx               # Root Layout
│   ├── page.tsx                 # Home Page
│   ├── loading.tsx              # Global Loading UI
│   ├── error.tsx                # Global Error UI
│   ├── not-found.tsx           # 404 UI
│   ├── theme.ts                 # MUI Theme
│   └── registry.tsx             # MUI Registry
├── components/                   # 再利用可能コンポーネント
│   ├── ui/                      # 基本UIコンポーネント
│   │   ├── buttons/
│   │   │   ├── SearchButton.tsx
│   │   │   └── index.ts
│   │   ├── forms/
│   │   ├── cards/
│   │   └── navigation/
│   ├── features/                # 機能別コンポーネント
│   │   ├── search/
│   │   │   ├── SearchForm.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   └── index.ts
│   │   ├── meeting/
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── MeetingDetail.tsx
│   │   │   └── index.ts
│   │   └── user/
│   │       ├── UserProfile.tsx
│   │       └── index.ts
│   └── layouts/                 # レイアウトコンポーネント
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── lib/                         # ユーティリティ・設定・ビジネスロジック
│   ├── actions/                 # Server Actions
│   │   ├── search-actions.ts
│   │   ├── meeting-actions.ts
│   │   ├── user-actions.ts
│   │   └── index.ts
│   ├── api/                     # API クライアント
│   │   ├── kokkaii-client.ts
│   │   ├── base-client.ts
│   │   └── index.ts
│   ├── auth/                    # 認証関連
│   │   ├── config.ts
│   │   └── providers.ts
│   ├── db/                      # データベース接続・スキーマ
│   │   ├── connection.ts
│   │   ├── models/
│   │   └── migrations/
│   ├── utils/                   # ユーティリティ関数
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── validations/             # バリデーションスキーマ
│   │   ├── search-schema.ts
│   │   ├── user-schema.ts
│   │   └── index.ts
│   ├── types/                   # 型定義
│   │   ├── api.ts
│   │   ├── database.ts
│   │   └── index.ts
│   └── emotion-cache.ts         # MUI Emotion設定
├── stores/                      # クライアントサイド状態管理
│   ├── search-store.ts
│   ├── user-store.ts
│   └── index.ts
├── hooks/                       # カスタムフック
│   ├── use-search.ts
│   ├── use-local-storage.ts
│   └── index.ts
└── middleware.ts                # Next.js Middleware
```

## 各層の役割とベストプラクティス

### 1. App Router層 (`src/app/`)

**役割**: ルーティング、レイアウト、ページ構成、初期データフェッチ

#### Next.js 15の特徴
- **Server Component**がデフォルト（React 19の新機能を活用）
- **Turbopack**による高速な開発体験
- 改善された**Server Actions**の安定性
- **React 19のuse()フック**によるPromiseハンドリング

```typescript
// app/search/page.tsx (Server Component)
import { Suspense } from 'react'
import { SearchForm } from '@/components/features/search/SearchForm'
import { searchMeetings } from '@/lib/actions/search-actions'
import { SearchResultsSkeleton } from '@/components/ui/skeletons'

interface SearchPageProps {
  searchParams: { q?: string; page?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q
  const page = Number(searchParams.page) || 1

  return (
    <div>
      <h1>会議録検索</h1>
      <SearchForm />
      {query && (
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} page={page} />
        </Suspense>
      )}
    </div>
  )
}

// Server Componentとして分離
async function SearchResults({ query, page }: { query: string; page: number }) {
  const results = await searchMeetings(query, page)
  return <SearchResultsList results={results} />
}
```

#### Route Groups の活用
```typescript
// app/(auth)/layout.tsx - 認証レイアウト
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-container">
      <div className="auth-form">
        {children}
      </div>
    </div>
  )
}

// app/(dashboard)/layout.tsx - メインアプリレイアウト  
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
```

### 2. Server Actions層 (`src/lib/actions/`)

**役割**: サーバーサイドでの処理、データ操作、フォーム処理

#### Next.js 15でのServer Actions
- **React 19**との統合による安定性向上
- **useFormStatus**、**useFormState**フックとの連携
- より良いエラーハンドリング

```typescript
// lib/actions/search-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { kokkaiiAPI } from '@/lib/api/kokkaii-client'
import { searchSchema } from '@/lib/validations/search-schema'
import type { SearchResult } from '@/lib/types/api'

// フォーム送信用のServer Action
export async function searchAction(prevState: any, formData: FormData) {
  const rawData = {
    query: formData.get('query') as string,
    house: formData.get('house') as string,
    dateFrom: formData.get('dateFrom') as string,
    dateTo: formData.get('dateTo') as string,
  }

  // バリデーション
  const validation = searchSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      error: 'Invalid input',
      fields: validation.error.flatten().fieldErrors
    }
  }

  try {
    const results = await searchMeetings(validation.data.query, {
      house: validation.data.house,
      dateFrom: validation.data.dateFrom,
      dateTo: validation.data.dateTo,
    })

    // 成功時はリダイレクト
    const params = new URLSearchParams({
      q: validation.data.query,
      ...(validation.data.house && { house: validation.data.house }),
      ...(validation.data.dateFrom && { from: validation.data.dateFrom }),
      ...(validation.data.dateTo && { to: validation.data.dateTo }),
    })
    
    redirect(`/search/results?${params.toString()}`)
  } catch (error) {
    return {
      error: '検索に失敗しました。しばらく時間をおいて再度お試しください。'
    }
  }
}

// データ取得用の関数
export async function searchMeetings(
  query: string, 
  options?: {
    house?: string
    dateFrom?: string
    dateTo?: string
    page?: number
  }
): Promise<SearchResult[]> {
  const { house, dateFrom, dateTo, page = 1 } = options || {}
  
  try {
    const results = await kokkaiiAPI.searchMeetings({
      any: query,
      nameOfHouse: house,
      from: dateFrom,
      until: dateTo,
      startRecord: ((page - 1) * 30) + 1,
      maximumRecords: 30
    })
    
    // キャッシュの再検証
    revalidatePath('/search')
    
    return results
  } catch (error) {
    console.error('Search failed:', error)
    throw new Error('検索処理でエラーが発生しました')
  }
}

// 会議録詳細の取得
export async function getMeetingDetail(issueId: string) {
  return await kokkaiiAPI.getMeetingDetail(issueId)
}
```

### 3. Components層 (`src/components/`)

#### Server ComponentとClient Componentの使い分け

**Server Component** (デフォルト):
- 静的コンテンツの表示
- データの表示
- レイアウトコンポーネント

**Client Component** (`'use client'`が必要):
- ユーザーインタラクション
- 状態管理
- ブラウザAPIの使用

```typescript
// components/features/search/SearchForm.tsx (Client Component)
'use client'

import { useFormState, useFormStatus } from 'react'
import { useRouter } from 'next/navigation'
import { TextField, Button, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { Search } from '@mui/icons-material'
import { searchAction } from '@/lib/actions/search-actions'

export function SearchForm() {
  const [state, formAction] = useFormState(searchAction, null)
  
  return (
    <Box component="form" action={formAction} sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          name="query"
          label="検索キーワード"
          variant="outlined"
          size="small"
          sx={{ minWidth: 300 }}
          error={!!state?.fields?.query}
          helperText={state?.fields?.query?.[0]}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>院</InputLabel>
          <Select name="house" defaultValue="">
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="衆議院">衆議院</MenuItem>
            <MenuItem value="参議院">参議院</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          name="dateFrom"
          label="開始日"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        
        <TextField
          name="dateTo"  
          label="終了日"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        
        <SubmitButton />
      </Box>
      
      {state?.error && (
        <Box sx={{ mt: 2, color: 'error.main' }}>
          {state.error}
        </Box>
      )}
    </Box>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<Search />}
      disabled={pending}
      sx={{ minWidth: 120 }}
    >
      {pending ? '検索中...' : '検索'}
    </Button>
  )
}
```

```typescript
// components/features/search/SearchResults.tsx (Server Component)
import { Card, CardContent, Typography, Box, Chip } from '@mui/material'
import type { SearchResult } from '@/lib/types/api'

interface SearchResultsProps {
  results: SearchResult[]
  totalCount: number
}

export function SearchResults({ results, totalCount }: SearchResultsProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        検索結果: {totalCount.toLocaleString()}件
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {results.map((result) => (
          <SearchResultCard key={result.speechID} result={result} />
        ))}
      </Box>
    </Box>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h3">
            {result.nameOfMeeting}
          </Typography>
          <Chip 
            label={result.nameOfHouse} 
            size="small" 
            color="primary"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {result.date} | {result.speaker}
        </Typography>
        
        <Typography variant="body1" sx={{ mt: 1 }}>
          {result.speech.substring(0, 200)}...
        </Typography>
      </CardContent>
    </Card>
  )
}
```

### 4. API Client層 (`src/lib/api/`)

**役割**: 外部APIとの通信、レスポンスの型安全性、エラーハンドリング

```typescript
// lib/api/kokkaii-client.ts
import { z } from 'zod'

// レスポンスの型定義
const SpeechRecordSchema = z.object({
  speechID: z.string(),
  issueID: z.string(),
  session: z.string(),
  nameOfHouse: z.string(),
  nameOfMeeting: z.string(),
  date: z.string(),
  speaker: z.string(),
  speakerYomi: z.string().optional(),
  speech: z.string(),
  speechURL: z.string(),
  meetingURL: z.string(),
})

const SearchResponseSchema = z.object({
  numberOfRecords: z.number(),
  numberOfReturn: z.number(),
  startRecord: z.number(),
  nextRecordPosition: z.number().optional(),
  speechRecord: z.array(SpeechRecordSchema).default([])
})

export type SpeechRecord = z.infer<typeof SpeechRecordSchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>

export class KokkaiiAPIClient {
  private readonly baseURL = 'https://kokkai.ndl.go.jp/api'
  private readonly defaultParams = {
    recordPacking: 'json' as const,
  }

  async searchMeetings(params: {
    any?: string
    nameOfHouse?: string
    nameOfMeeting?: string
    speaker?: string
    from?: string
    until?: string
    startRecord?: number
    maximumRecords?: number
  }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams({
      ...this.defaultParams,
      ...Object.fromEntries(
        Object.entries(params).filter(([_, value]) => 
          value !== undefined && value !== ''
        )
      )
    })

    try {
      const response = await fetch(
        `${this.baseURL}/speech?${searchParams.toString()}`,
        {
          next: { 
            revalidate: 3600, // 1時間キャッシュ
            tags: ['kokkaii-search']
          }
        }
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return SearchResponseSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('API response validation failed:', error.issues)
        throw new Error('APIレスポンスの形式が不正です')
      }
      
      if (error instanceof Error) {
        console.error('API request failed:', error.message)
        throw error
      }
      
      throw new Error('不明なエラーが発生しました')
    }
  }

  async getMeetingDetail(issueId: string) {
    const params = new URLSearchParams({
      ...this.defaultParams,
      issueID: issueId,
      maximumRecords: '10'
    })

    const response = await fetch(
      `${this.baseURL}/meeting?${params.toString()}`,
      {
        next: { 
          revalidate: 86400, // 24時間キャッシュ
          tags: ['kokkaii-meeting', `meeting-${issueId}`]
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch meeting detail: ${response.status}`)
    }

    return await response.json()
  }
}

export const kokkaiiAPI = new KokkaiiAPIClient()
```

### 5. バリデーション層 (`src/lib/validations/`)

```typescript
// lib/validations/search-schema.ts
import { z } from 'zod'

export const searchSchema = z.object({
  query: z.string()
    .min(1, '検索キーワードを入力してください')
    .max(100, '検索キーワードは100文字以内で入力してください'),
  house: z.enum(['衆議院', '参議院', '両院', '']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo)
  }
  return true
}, {
  message: '開始日は終了日より前の日付を指定してください',
  path: ['dateFrom']
})

export type SearchFormData = z.infer<typeof searchSchema>
```

### 6. 状態管理層 (`src/stores/`)

**Zustand**を使用した軽量な状態管理:

```typescript
// stores/search-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SearchFilters {
  house?: string
  dateFrom?: string  
  dateTo?: string
  speaker?: string
}

interface SearchState {
  filters: SearchFilters
  recentSearches: string[]
  setFilters: (filters: Partial<SearchFilters>) => void
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      filters: {},
      recentSearches: [],
      
      setFilters: (filters) =>
        set(
          (state) => ({
            filters: { ...state.filters, ...filters }
          }),
          false,
          'setFilters'
        ),
      
      addRecentSearch: (query) =>
        set(
          (state) => ({
            recentSearches: [
              query,
              ...state.recentSearches.filter(q => q !== query)
            ].slice(0, 10) // 最新10件まで保持
          }),
          false,
          'addRecentSearch'
        ),
      
      clearRecentSearches: () =>
        set({ recentSearches: [] }, false, 'clearRecentSearches')
    }),
    {
      name: 'search-store', // devtools上での表示名
    }
  )
)
```

## Next.js 15の新機能活用

### 1. React 19との統合
- **use()フック**によるPromiseハンドリング
- **useFormStatus**、**useFormState**の活用
- **Server Actions**の安定性向上

### 2. Turbopack
- 開発時の高速ビルド
- Hot Reloadの改善

### 3. 改善されたキャッシュ戦略
```typescript
// より詳細なキャッシュ制御
const response = await fetch(url, {
  next: {
    revalidate: 3600, // 1時間でrevalidate
    tags: ['search-results', `query-${query}`] // タグベースの無効化
  }
})
```

### 4. パフォーマンス最適化
- **Server Component**による初回表示の高速化
- **Streaming**によるプログレッシブな画面表示
- **Partial Pre-rendering (PPR)**の活用（実験的機能）

## ベストプラクティス

### 1. コンポーネント設計
- **Single Responsibility Principle**: 1つのコンポーネントは1つの責務
- **Server First**: デフォルトはServer Component
- **Props Drilling回避**: Context APIやZustandの適切な使用

### 2. エラーハンドリング
```typescript
// app/error.tsx - エラーバウンダリ
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <button onClick={reset}>再試行</button>
    </div>
  )
}
```

### 3. 型安全性
- **strict TypeScript**の使用
- **Zod**によるランタイムバリデーション
- **tRPC**やGraphQLの検討（大規模な場合）

### 4. セキュリティ
- **Server Actions**での入力検証
- **CSRF**対策（Next.js標準で対応済み）
- **環境変数**の適切な管理

この構成により、Next.js 15の新機能を最大限活用し、保守性と拡張性を兼ね備えたモダンなWebアプリケーションを構築できます。