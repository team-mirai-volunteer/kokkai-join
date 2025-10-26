# Supabase Auth統合設計書

## 📋 エグゼクティブサマリー

**プロジェクト名**: kokkai-join 認証機能実装
**目的**: Supabase Authを使用して、フロントエンド（React SPA）とバックエンド（Hono API）に安全なログイン・ログアウト機能を実装する
**作成日**: 2025-10-26

---

## 1. 要件定義

### 1.1 MUST要件
- ✅ **ログイン機能**: メールアドレスとパスワードによるユーザー認証
- ✅ **ログアウト機能**: セッションの安全な終了
- ✅ **サインアップ機能**: 新規ユーザー登録
- ✅ **パスワードリセット**: パスワード忘れた場合のリセット機能
- ✅ **セッション管理**: トークンの自動リフレッシュとセッション永続化
- ✅ **ローカル開発環境**: Supabase CLIを使用したローカルSupabase環境

### 1.2 推奨機能（将来的な拡張）
- OAuth認証（Google, GitHub等）
- メール確認（Email Verification）
- 多要素認証（MFA）
- プロファイル管理

---

## 2. 現状分析

### 2.1 フロントエンド (frontend/)
- **フレームワーク**: Vite + React 19.1.1（SPAアーキテクチャ）
- **状態管理**: `useReducer` + custom hooks（Redux不使用）
- **API通信**: 環境変数ベースのエンドポイント設定
- **認証**: 現在はトークンベースの簡易認証（query parameter）

### 2.2 バックエンド (backend/)
- **フレームワーク**: Hono 4.9.9
- **データベース**: PostgreSQL + pgvector
- **既存API**: `/api/v1/deepresearch`（POST）
- **認証**: なし（現在は環境変数のトークンチェックのみ）

### 2.3 技術的ギャップ
1. ユーザー管理システムが存在しない
2. セッション管理機構が未実装
3. バックエンドでの認証ミドルウェアが未実装

---

## 3. 技術スタック

### 3.1 認証プラットフォーム
**Supabase (OSS + Self-Hosted for Local Dev)** を採用

**理由**:
- OSSなのでローカル開発環境でも使用可能
- Supabase CLIによるローカルインスタンス管理
- PostgreSQLとの統合が容易
- セキュリティベストプラクティスが組み込み済み
- Row Level Security (RLS)によるデータアクセス制御
- マイグレーション管理が容易

**開発フロー**:
- ローカル開発: Supabase CLI（Docker経由）
- 本番環境: Supabase Cloud（オプション）またはセルフホスティング

### 3.2 追加ツール・ライブラリ

#### 開発ツール
```bash
# Supabase CLI（ローカルSupabase環境管理）
npm install -g supabase

# または、プロジェクトローカルにインストール
npm install -D supabase
```

#### フロントエンド
```json
{
  "@supabase/supabase-js": "^2.47.0",
  "@supabase/ssr": "^0.5.2"
}
```

#### バックエンド
```json
{
  "@supabase/supabase-js": "^2.47.0"
}
```

### 3.3 ローカル開発環境構成

**Supabase CLI** がDocker経由で以下のサービスを起動:

| サービス | ポート | 説明 |
|---------|--------|------|
| Kong (API Gateway) | 54321 | APIゲートウェイ |
| PostgreSQL | 54322 | データベース |
| GoTrue (Auth) | - | 認証サービス（Kong経由） |
| Realtime | - | リアルタイム機能（Kong経由） |
| Storage | - | ファイルストレージ（Kong経由） |
| Studio | 54323 | 管理UI |
| Inbucket | 54324 | メールテスト用SMTP |

**参考**: mirai-gikaiプロジェクトの設定を基にカスタマイズ

---

## 4. アーキテクチャ設計

### 4.1 認証フロー

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   React     │          │  Supabase    │          │    Hono     │
│   Frontend  │          │     Auth     │          │   Backend   │
└─────────────┘          └──────────────┘          └─────────────┘
      │                         │                         │
      │  1. signInWithPassword  │                         │
      ├────────────────────────>│                         │
      │                         │                         │
      │  2. Session + JWT       │                         │
      │<────────────────────────┤                         │
      │                         │                         │
      │  3. API Request (JWT in Authorization header)     │
      ├───────────────────────────────────────────────────>│
      │                         │                         │
      │                         │  4. Verify JWT          │
      │                         │<────────────────────────┤
      │                         │                         │
      │                         │  5. JWT Valid           │
      │                         │─────────────────────────>│
      │                         │                         │
      │  6. API Response        │                         │
      │<───────────────────────────────────────────────────┤
```

### 4.2 データフロー

1. **ログイン**:
   - ユーザーがメール・パスワードを入力
   - React → Supabase Auth API へ認証リクエスト
   - Supabase が JWT（access_token）を発行
   - React が localStorage にセッション保存

2. **認証済みAPIリクエスト**:
   - React が Hono API にリクエスト（Authorization header に JWT）
   - Hono ミドルウェアが JWT を検証
   - 検証成功 → リクエスト処理
   - 検証失敗 → 401 Unauthorized

3. **ログアウト**:
   - React が `signOut()` を呼び出し
   - localStorage からセッション削除
   - Supabase がサーバー側セッションを無効化

---

## 5. データモデル

### 5.1 Supabase Auth テーブル（自動生成）

Supabaseが自動で以下のテーブルを `auth` スキーマに作成:

**auth.users**
```sql
-- Supabaseが自動生成
id: UUID (Primary Key)
email: TEXT
encrypted_password: TEXT
email_confirmed_at: TIMESTAMP
created_at: TIMESTAMP
updated_at: TIMESTAMP
last_sign_in_at: TIMESTAMP
raw_app_meta_data: JSONB
raw_user_meta_data: JSONB
```

### 5.2 アプリケーションユーザープロファイル（オプション）

既存の `public` スキーマに追加:

```sql
-- ユーザープロファイルテーブル（拡張情報用）
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) を有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルのみ読み書き可能
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

## 6. API設計

### 6.1 認証エンドポイント（Supabase提供）

すべて Supabase Auth API が提供（`https://<project-ref>.supabase.co/auth/v1`）:

| メソッド | エンドポイント               | 説明                         |
|----------|------------------------------|------------------------------|
| POST     | `/token?grant_type=password` | メール・パスワードでログイン |
| POST     | `/signup`                    | 新規ユーザー登録             |
| POST     | `/logout`                    | ログアウト                   |
| POST     | `/recover`                   | パスワードリセット           |
| GET      | `/user`                      | 現在のユーザー情報取得       |

### 6.2 既存バックエンドAPI の変更

**現状**: `POST /api/v1/deepresearch`

**変更後**: 認証ミドルウェアを追加

```typescript
// Before
app.post('/api/v1/deepresearch', async (c) => { ... })

// After
app.post('/api/v1/deepresearch', authMiddleware, async (c) => { ... })
```

**レスポンス変更**:
- 401 Unauthorized: トークンなし/無効
- 403 Forbidden: 権限不足

---

## 7. フロントエンド実装設計

### 7.1 ディレクトリ構成（追加分）

```
frontend/src/
├── lib/
│   └── supabaseClient.ts          # Supabaseクライアント初期化
├── hooks/
│   ├── useAuth.ts                 # 認証カスタムフック
│   └── useAuthenticatedApi.ts     # 認証付きAPIコール
├── components/
│   ├── LoginForm.tsx              # ログインフォーム
│   ├── ProtectedRoute.tsx         # 認証必須ルート（将来）
│   └── UserMenu.tsx               # ユーザーメニュー（ログアウト等）
├── types/
│   └── auth.ts                    # 認証関連型定義
└── contexts/
    └── AuthContext.tsx            # 認証状態管理コンテキスト
```

### 7.2 主要コンポーネント設計

#### 7.2.1 Supabase クライアント (`lib/supabaseClient.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

#### 7.2.2 認証コンテキスト (`contexts/AuthContext.tsx`)

```typescript
interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // セッション変更リスナー
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### 7.2.3 ログインフォーム (`components/LoginForm.tsx`)

```typescript
export const LoginForm = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
    } catch (err) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
      {error && <p>{error}</p>}
    </form>
  )
}
```

#### 7.2.4 認証付きAPIコール (`hooks/useAuthenticatedApi.ts`)

```typescript
export const useAuthenticatedApi = () => {
  const { session } = useAuth()

  const callApi = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!session?.access_token) {
      throw new Error('認証されていません')
    }

    const response = await fetch(`${API_ENDPOINT}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // トークン期限切れ時の処理
        throw new Error('セッションが期限切れです。再ログインしてください。')
      }
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  return { callApi }
}
```

### 7.3 環境変数設定

**.env.development** (ローカルSupabase使用)
```env
# ローカルSupabase設定（supabase statusで確認）
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# バックエンドAPI
VITE_API_ENDPOINT=http://localhost:8000/api
```

**.env.example**
```env
# Supabase設定
# ローカル開発: supabase statusで確認した値を設定
# 本番環境: Supabase Cloudのプロジェクト設定から取得
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# API Endpoint
VITE_API_ENDPOINT=http://localhost:8000/api
```

**.env.production** (Supabase Cloud使用)
```env
# Supabase Cloud設定
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Production API
VITE_API_ENDPOINT=https://deepresearch-gules.vercel.app/api
```

**注意**:
- ローカル開発時のSupabase認証情報は固定値（Supabase CLIのデモ用キー）
- 本番環境では実際のSupabase Cloudのキーを使用

---

## 8. バックエンド実装設計

### 8.1 ディレクトリ構成（追加分）

```
backend/
├── lib/
│   └── supabaseAdmin.ts           # Supabase Admin クライアント
├── middlewares/
│   └── auth.ts                    # JWT検証ミドルウェア
└── types/
    └── auth.ts                    # 認証関連型定義
```

### 8.2 主要コンポーネント設計

#### 8.2.1 Supabase Admin クライアント (`lib/supabaseAdmin.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

#### 8.2.2 認証ミドルウェア (`middlewares/auth.ts`)

```typescript
import { Context, Next } from 'hono'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header missing' }, 401)
  }

  const token = authHeader.substring(7) // "Bearer " を除く

  try {
    // Supabaseでトークンを検証
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    // ユーザー情報をコンテキストに保存
    c.set('user', user)

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
}
```

#### 8.2.3 既存APIへの適用 (`api/v1/deepresearch.ts`)

```typescript
import { authMiddleware } from '../../middlewares/auth.js'

// Before
app.post('/v1/deepresearch', vValidator('json', searchRequestSchema), async (c) => {
  // ... existing logic
})

// After
app.post('/v1/deepresearch', authMiddleware, vValidator('json', searchRequestSchema), async (c) => {
  const user = c.get('user') // 認証済みユーザー情報にアクセス可能

  // ユーザーごとのログ記録や権限チェック等
  console.log(`User ${user.id} (${user.email}) made a request`)

  // ... existing logic
})
```

### 8.3 環境変数設定

**.env** (ローカル開発)
```env
# Existing variables
DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db
OPENAI_API_KEY=<your-api-key>
EMBEDDING_PROVIDER=novita
...

# Supabase設定（ローカル）
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**.env.example**
```env
# Database
DATABASE_URL=postgresql://kokkai_user:kokkai_pass@localhost:5432/kokkai_db

# OpenAI
OPENAI_API_KEY=<your-api-key>

# Embedding
EMBEDDING_PROVIDER=novita
EMBEDDING_API_KEY=<your-embedding-api-key>
EMBEDDING_MODEL=baai/bge-m3
EMBEDDING_BASE_URL=https://api.novita.ai/openai

# Supabase（ローカル開発用）
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Server
PORT=8000
```

**.env.production**
```env
# Supabase Cloud設定
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # 🚨 NEVER expose this in frontend!

# 他の本番環境変数...
```

**注意**:
- ローカル開発時のService Role Keyは固定値（Supabase CLIのデモ用キー）
- 本番環境では**絶対にフロントエンドに公開しない**

---

## 9. セキュリティ考慮事項

### 9.1 JWT トークン管理
- ✅ **Access Token**: 短命（1時間）、localStorage保存
- ✅ **Refresh Token**: 長命（30日）、Supabaseが自動リフレッシュ
- ✅ **httpOnly Cookie使用なし**: SPA特性上、localStorageを使用（XSS対策はCSP実装）

### 9.2 環境変数の秘匿性

| 変数名                      | フロントエンド | バックエンド | 公開可否              |
|-----------------------------|----------------|--------------|-----------------------|
| `VITE_SUPABASE_ANON_KEY`    | ✅             | ❌           | ✅ 公開OK（制限付き） |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌             | ✅           | ❌ 絶対秘匿           |

### 9.3 Row Level Security (RLS)
```sql
-- 例: ユーザーは自分の検索履歴のみ閲覧可能
CREATE POLICY "Users can read own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);
```

### 9.4 CORS設定
```typescript
// backend/server.ts
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://your-production-domain.com'],
  credentials: true,
}))
```

---

## 10. 実装計画（フェーズ分け）

### Phase 0: ローカルSupabase環境セットアップ 🆕
1. Supabase CLIインストール（`npm install -g supabase`）
2. プロジェクトルートで `supabase init` 実行
3. `supabase/config.toml` 設定（mirai-gikaiベース）
   - ポート設定（API: 54321, DB: 54322, Studio: 54323）
   - Auth設定（enable_signup: true, enable_confirmations: false）
4. 初回マイグレーション作成
5. `supabase start` でローカル環境起動
6. 環境変数設定（`.env.development`, `.env.example`）

**所要時間**: 1時間

**検証方法**:
- `supabase status` でサービス起動確認
- `http://localhost:54323` でStudio UIアクセス

---

### Phase 1: Supabase型定義とクライアント基礎

#### 1.1 型定義の自動生成
```bash
supabase gen types typescript --local > types/supabase.types.ts
```

#### 1.2 Supabaseクライアント作成
- `lib/supabaseClient.ts` (frontend)
- `lib/supabaseAdmin.ts` (backend)

**所要時間**: 30分

---

### Phase 2: フロントエンド基礎実装
1. `@supabase/supabase-js` インストール
2. `supabaseClient.ts` 作成
3. `AuthContext.tsx` 実装
4. `useAuth.ts` hook 作成
5. 環境変数設定

**所要時間**: 2時間

**検証方法**: `signIn()` の console.log でセッション取得確認

---

### Phase 3: ログインUI実装
1. `LoginForm.tsx` コンポーネント作成
2. `App.tsx` にログイン状態による条件分岐追加
3. エラーハンドリング実装

**所要時間**: 2時間

**検証方法**: 手動ログインテスト

---

### Phase 4: バックエンド認証ミドルウェア
1. `@supabase/supabase-js` インストール
2. `supabaseAdmin.ts` 作成
3. `auth.ts` ミドルウェア実装
4. `/api/v1/deepresearch` に適用
5. 環境変数設定

**所要時間**: 2時間

**検証方法**: Postman/curl で JWT トークン付きリクエストテスト

---

### Phase 5: フロントエンド・バックエンド統合
1. `useAuthenticatedApi.ts` hook 実装
2. 既存APIコールを認証付きに変更
3. エラーハンドリング（401時の再ログインプロンプト）

**所要時間**: 2時間

**検証方法**: E2Eフローテスト（ログイン → API呼び出し → ログアウト）

---

### Phase 6: テスト実装
1. フロントエンドユニットテスト（`useAuth`, `AuthContext`）
2. バックエンドミドルウェアテスト
3. 統合テスト

**所要時間**: 3時間

---

### Phase 7: Signup機能実装 🆕
1. `SignupForm.tsx` コンポーネント作成
2. `useAuth.ts` に `signUp()` メソッド追加
3. パスワード強度バリデーション
4. エラーハンドリング（重複メール等）
5. サインアップ成功時の自動ログイン

**所要時間**: 2時間

**検証方法**: 新規ユーザー登録からログインまでのフローテスト

---

### Phase 8: パスワードリセット機能実装 🆕
1. `ForgotPasswordForm.tsx` コンポーネント作成
2. `ResetPasswordForm.tsx` コンポーネント作成
3. `useAuth.ts` に `resetPasswordForEmail()` と `updatePassword()` 追加
4. メールリンクからのリダイレクト処理
5. Inbucket（ローカル）でのメールテスト

**所要時間**: 2時間

**検証方法**:
- パスワードリセットメール送信
- Inbucket (http://localhost:54324) でメール確認
- リセットリンクからパスワード更新

---

### Phase 9: セッション管理とトークンリフレッシュ 🆕
1. セッション永続化設定（localStorage）
2. 自動トークンリフレッシュ設定
3. セッション有効期限チェック
4. ページリロード時のセッション復元

**所要時間**: 1時間

**検証方法**:
- ブラウザリロードでログイン状態維持
- トークン有効期限切れ時の自動リフレッシュ

---

### Phase 10: UI/UX改善
1. ログアウトボタン追加
2. ユーザープロファイル表示
3. ローディング状態表示
4. エラートースト通知
5. 日本語エラーメッセージ

**所要時間**: 2時間

---

**合計所要時間**: 約18-20時間（2-3営業日）

---

## 11. テスト計画

### 11.1 フロントエンドテスト

#### ユニットテスト (`vitest`)
```typescript
// frontend/src/hooks/useAuth.test.ts
describe('useAuth', () => {
  it('should sign in with valid credentials', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('test@example.com', 'password')
    })
    expect(result.current.session).not.toBeNull()
  })

  it('should sign out successfully', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signOut()
    })
    expect(result.current.session).toBeNull()
  })
})
```

#### 統合テスト
```typescript
// frontend/src/App.test.tsx
describe('App Integration', () => {
  it('should show login form when not authenticated', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('メールアドレス')).toBeInTheDocument()
  })

  it('should show main content after login', async () => {
    // モックセッション設定
    // アサーション
  })
})
```

### 11.2 バックエンドテスト

#### ミドルウェアテスト (`vitest`)
```typescript
// backend/middlewares/auth.test.ts
describe('authMiddleware', () => {
  it('should reject requests without Authorization header', async () => {
    const c = createMockContext({ headers: {} })
    const next = vi.fn()

    const response = await authMiddleware(c, next)

    expect(response.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should allow requests with valid JWT', async () => {
    const validToken = 'valid-jwt-token'
    const c = createMockContext({
      headers: { Authorization: `Bearer ${validToken}` }
    })
    const next = vi.fn()

    await authMiddleware(c, next)

    expect(next).toHaveBeenCalled()
    expect(c.get('user')).toBeDefined()
  })
})
```

#### E2Eテスト
```typescript
// backend/api/v1/deepresearch.test.ts
describe('POST /api/v1/deepresearch with auth', () => {
  it('should return 401 without token', async () => {
    const res = await app.request('/api/v1/deepresearch', {
      method: 'POST',
      body: JSON.stringify({ query: 'test' }),
    })
    expect(res.status).toBe(401)
  })

  it('should process request with valid token', async () => {
    const token = await getValidToken() // helper function
    const res = await app.request('/api/v1/deepresearch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: 'test' }),
    })
    expect(res.status).toBe(200)
  })
})
```

---

## 12. デプロイメント考慮事項

### 12.1 Vercel デプロイメント

**環境変数設定** (Vercel Dashboard):
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

**フロントエンド環境変数** (Build settings):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_ENDPOINT=https://deepresearch-gules.vercel.app/api
```

### 12.2 CORS設定確認
```typescript
// backend/server.ts
app.use('/api/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
```

---

## 13. ロールバック戦略

### 13.1 機能フラグ
```typescript
// フロントエンド
const FEATURE_AUTH_ENABLED = import.meta.env.VITE_FEATURE_AUTH === 'true'

if (FEATURE_AUTH_ENABLED) {
  // 認証フロー
} else {
  // 既存のトークンベース認証
}
```

### 13.2 データベースマイグレーション
```sql
-- ロールバック用
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP TABLE IF EXISTS public.user_profiles;
```

---

## 14. 実装決定事項（未解決の質問事項への回答）

以下の質問について、ユーザーからの回答を反映しています：

### ✅ 回答済み事項

1. **ユーザー登録（サインアップ）機能**
   - ✅ **実装する**（MUST要件に追加）

2. **パスワードリセット機能**
   - ✅ **実装する**（MUST要件に追加）

3. **セッション管理とトークンリフレッシュ**
   - ✅ **実装する**（MUST要件に追加）

4. **ローカル開発環境**
   - ✅ **Supabase CLIを使用**（mirai-gikaiプロジェクトの設定を参考）

5. **メール確認**
   - ✅ **無効化**（`enable_confirmations = false`）
   - ローカル開発ではInbucket使用

6. **パスワードポリシー**
   - ✅ **最小文字数**: 6文字（Supabaseデフォルト）
   - 将来的に8文字以上に変更推奨

7. **セッション有効期限**
   - ✅ **デフォルト設定を使用**:
     - Access Token: 3600秒（1時間）
     - Refresh Token: 自動リフレッシュ有効

### 🔄 今後確認が必要な事項

1. **既存ユーザーの移行**
   - 現在トークンベース認証のユーザーがいる場合、移行方法の検討

2. **既存APIのアクセス制御**
   - `/api/v1/deepresearch` を認証必須にするか
   - 段階的に移行するか（機能フラグ使用）

3. **OAuth認証**
   - Google、GitHub等の外部プロバイダー統合の優先度

---

## 15. ローカルSupabase開発ガイド 🆕

### 15.1 Supabase CLIの基本コマンド

```bash
# ローカルSupabaseを起動
supabase start

# ステータス確認
supabase status

# ローカルSupabaseを停止
supabase stop

# ローカルDBをリセット（マイグレーション再実行）
supabase db reset

# TypeScript型定義を生成
supabase gen types typescript --local > types/supabase.types.ts

# 新しいマイグレーションファイルを作成
supabase migration new <migration_name>

# Studio UIを開く
open http://localhost:54323
```

### 15.2 ディレクトリ構成（Supabase関連）

```
プロジェクトルート/
├── supabase/
│   ├── config.toml           # Supabase CLI設定
│   ├── migrations/           # データベースマイグレーション
│   │   └── YYYYMMDD_*.sql
│   ├── seed.sql             # 初期データ（オプション）
│   └── .gitignore
├── types/
│   └── supabase.types.ts    # 自動生成された型定義
└── .env.development          # ローカル環境変数
```

### 15.3 開発ワークフロー

1. **起動**
   ```bash
   supabase start
   ```

2. **型定義生成**（スキーマ変更時）
   ```bash
   supabase gen types typescript --local > types/supabase.types.ts
   ```

3. **開発**
   - フロントエンド: `http://localhost:5173`
   - バックエンド: `http://localhost:8000`
   - Supabase Studio: `http://localhost:54323`
   - Inbucket (メール): `http://localhost:54324`

4. **マイグレーション作成**
   ```bash
   supabase migration new add_user_profiles_table
   # supabase/migrations/ に新しいファイルが作成される
   ```

5. **リセット**（問題発生時）
   ```bash
   supabase db reset
   ```

### 15.4 メールテスト（Inbucket）

ローカル開発では、メールはInbucketに送信されます：

- URL: `http://localhost:54324`
- パスワードリセット、サインアップ確認メール等を確認可能

---

## 16. 参考リソース

### 16.1 公式ドキュメント
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Hono Middleware Documentation](https://hono.dev/guides/middleware)

### 16.2 参考プロジェクト
- [mirai-gikai](https://github.com/skanehira/mirai-gikai) - Supabase CLIを使用したローカル開発の参考実装

### 16.3 関連ファイル
- `/frontend/package.json` - フロントエンド依存関係
- `/backend/package.json` - バックエンド依存関係
- `/backend/docs/ARCHITECTURE.md` - バックエンドアーキテクチャ
- `/docs/design.md` - プロジェクト全体設計

---

## 17. 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2025-10-26 | 1.0 | 初版作成 | Claude Code |
| 2025-10-26 | 2.0 | ローカルSupabase環境追加、signup/パスワードリセット/セッション管理を必須機能に追加 | Claude Code |

---

## 18. 承認

実装開始前に以下の承認を得る必要があります：

- [x] アーキテクチャ設計の承認
- [ ] セキュリティレビュー
- [x] 未解決の質問事項への回答（→ 実装決定事項として反映済み）
- [ ] 実装フェーズの承認
