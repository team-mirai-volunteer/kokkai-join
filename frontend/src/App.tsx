import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "./shared/components/layouts/AuthLayout";
import GuestLayout from "./shared/components/layouts/GuestLayout";
import LoginPage from "./features/auth/pages/LoginPage";
import HistoryPage from "./features/history/pages/HistoryPage";
import { AuthProvider } from "./features/auth/contexts/AuthContext";

/**
 * App - ルートコンポーネント（Phase 1: ルーティング構造導入）
 *
 * 責務:
 * - アプリケーション全体のルーティング構造を定義
 * - 認証状態に基づいたルート保護（AuthLayout, GuestLayout）
 * - AuthProviderでアプリケーション全体に認証状態を提供
 *
 * 設計原則:
 * - 高凝集: ルーティング定義のみに集中
 * - 低結合: 各ページコンポーネントは独立して動作
 * - 責務の分離: 認証ロジックはAuthLayout/GuestLayoutに委譲
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
