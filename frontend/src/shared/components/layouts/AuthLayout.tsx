import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { AppHeader } from "../AppHeader";
import "./AuthLayout.css";

/**
 * AuthLayout - 認証済みユーザー用のレイアウトコンポーネント
 *
 * 責務:
 * - 認証状態を確認し、未認証ユーザーをログイン画面にリダイレクト
 * - 認証確認中はローディング状態を表示
 * - 認証済みユーザーには共通ヘッダー（AppHeader）と子ルート（Outlet）を表示
 *
 * 設計原則:
 * - 高凝集: 認証レイアウトに関する責務のみを持つ
 * - 低結合: useAuthフックを通じて認証状態を取得（直接Supabaseに依存しない）
 * - 共通UI: AppHeaderで全認証ページに共通のヘッダーを提供
 */
export default function AuthLayout() {
  const { user, loading } = useAuth();

  // ガード節1: 認証確認中
  if (loading) {
    return <div className="loading">認証確認中...</div>;
  }

  // ガード節2: 未認証ユーザーをリダイレクト
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // メインケース: 認証済みユーザーに共通ヘッダーと子ルートを表示
  return (
    <div className="auth-layout">
      <AppHeader />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
