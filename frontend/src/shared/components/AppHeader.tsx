import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";

/**
 * AppHeader - アプリケーション共通ヘッダー
 *
 * 責務:
 * - アプリケーションタイトルの表示
 * - ページナビゲーション（検索・履歴）
 * - 履歴詳細ページでの戻るボタン表示
 * - ユーザー情報の表示
 * - ログアウト機能
 *
 * 設計原則:
 * - 認証済みページで共通利用される
 * - URLベースでアクティブなナビゲーションボタンをハイライト
 * - 詳細ページでは通常のナビゲーションを戻るボタンに置き換え
 */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSearchPage = location.pathname === "/";
  const isHistoryPage = location.pathname === "/histories";
  const isDetailPage =
    location.pathname.startsWith("/histories/") &&
    location.pathname !== "/histories";

  return (
    <div className="auth-header">
      <h1 style={{ margin: 0, fontSize: "1.5rem" }}>みらい議会 DeepResearch</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {isDetailPage ? (
          <button
            type="button"
            onClick={() => navigate("/histories")}
            className="submit-button"
            style={{ padding: "0.5rem 1rem" }}
          >
            ← 履歴一覧に戻る
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              className={isSearchPage ? "submit-button" : "logout-button"}
              style={{ padding: "0.5rem 1rem" }}
            >
              検索
            </button>
            <button
              type="button"
              onClick={() => navigate("/histories")}
              className={isHistoryPage ? "submit-button" : "logout-button"}
              style={{ padding: "0.5rem 1rem" }}
            >
              履歴
            </button>
          </div>
        )}
        <span className="user-email">{user?.email}</span>
        <button type="button" onClick={signOut} className="logout-button">
          ログアウト
        </button>
      </div>
    </div>
  );
}
