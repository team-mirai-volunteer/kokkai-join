import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "./shared/components/layouts/AuthLayout";
import GuestLayout from "./shared/components/layouts/GuestLayout";
import LoginPage from "./features/auth/pages/LoginPage";
import SearchPage from "./features/search/pages/SearchPage";
import HistoryListPage from "./features/history/pages/HistoryListPage";
import HistoryDetailPage from "./features/history/pages/HistoryDetailPage";
import { AuthProvider } from "./features/auth/contexts/AuthContext";

/**
 * App - ルートコンポーネント
 *
 * 責務:
 * - アプリケーション全体のルーティング構造を定義
 * - 認証状態に基づいたルート保護（AuthLayout, GuestLayout）
 * - AuthProviderでアプリケーション全体に認証状態を提供
 *
 * ルーティング構造:
 * - / : 検索ページ (SearchPage)
 * - /histories : 履歴一覧ページ (HistoryListPage)
 * - /histories/:id : 履歴詳細ページ (HistoryDetailPage)
 * - /login : ログインページ (LoginPage)
 *
 * 設計原則:
 * - 単一責任: 各ページが明確な役割を持つ
 * - RESTful: URLとリソースが対応
 * - 低結合: 各ページコンポーネントは独立して動作
 */
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
            <Route path="/" element={<SearchPage />} />
            <Route path="/histories" element={<HistoryListPage />} />
            <Route path="/histories/:id" element={<HistoryDetailPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
