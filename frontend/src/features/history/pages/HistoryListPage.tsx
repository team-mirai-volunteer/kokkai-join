import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { HistoryList } from "../components/HistoryList";
import "../../../App.css";

/**
 * HistoryListPage - 検索履歴一覧ページ
 *
 * 責務:
 * - 検索履歴の一覧表示
 * - 履歴項目クリックで詳細ページに遷移
 * - 履歴削除機能
 * - エラー表示
 *
 * 設計原則:
 * - 単一責任: 履歴一覧表示のみに集中
 * - 状態管理: useSearchHistoryフックで履歴データを取得
 * - プレゼンテーション分離: HistoryListコンポーネントで表示を委譲
 */
export default function HistoryListPage() {
  const navigate = useNavigate();
  const { histories, loading, error, deleteHistory } = useSearchHistory();

  const handleHistoryClick = useCallback(
    (id: string) => {
      navigate(`/histories/${id}`);
    },
    [navigate]
  );

  const handleHistoryDelete = useCallback(
    async (id: string) => {
      if (window.confirm("この検索履歴を削除してもよろしいですか？")) {
        try {
          await deleteHistory(id);
        } catch (err) {
          alert(
            `削除に失敗しました: ${
              err instanceof Error ? err.message : "不明なエラー"
            }`
          );
        }
      }
    },
    [deleteHistory]
  );

  return (
    <div className="app-container">
      {error && <div className="error-message">{error}</div>}
      <HistoryList
        histories={histories}
        loading={loading}
        onHistoryClick={handleHistoryClick}
        onHistoryDelete={handleHistoryDelete}
      />
    </div>
  );
}
