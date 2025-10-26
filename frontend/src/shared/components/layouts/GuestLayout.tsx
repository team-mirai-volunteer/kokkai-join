import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext";

/**
 * GuestLayout - 未認証ユーザー用のレイアウトコンポーネント
 *
 * 責務:
 * - 認証状態を確認し、認証済みユーザーをホーム画面にリダイレクト
 * - 認証確認中はローディング状態を表示
 * - 未認証ユーザーには子ルート（Outlet）を表示
 *
 * 設計原則:
 * - 高凝集: ゲストレイアウトに関する責務のみを持つ
 * - 低結合: useAuthフックを通じて認証状態を取得（直接Supabaseに依存しない）
 */
export default function GuestLayout() {
  const { user, loading } = useAuth();

  // ガード節1: 認証確認中
  if (loading) {
    return <div className="loading">認証確認中...</div>;
  }

  // ガード節2: 認証済みユーザーをリダイレクト
  if (user) {
    return <Navigate to="/" replace />;
  }

  // メインケース: 未認証ユーザーに子ルートを表示
  return <Outlet />;
}
