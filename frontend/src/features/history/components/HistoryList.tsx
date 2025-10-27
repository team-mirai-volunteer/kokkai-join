import type { SearchHistoryListItem } from "../../../../../types/supabase.types";
import "./HistoryList.css";

interface HistoryListProps {
  histories: SearchHistoryListItem[];
  loading: boolean;
  onHistoryClick: (id: string) => void;
  onHistoryDelete: (id: string) => void;
}

/**
 * HistoryList - 検索履歴一覧コンポーネント
 *
 * 検索履歴の一覧を表示し、各履歴項目のクリックや削除操作を処理します。
 *
 * @param histories - 表示する検索履歴の配列
 * @param loading - ローディング状態
 * @param onHistoryClick - 履歴項目クリック時のコールバック
 * @param onHistoryDelete - 履歴削除時のコールバック
 */
export function HistoryList({
  histories,
  loading,
  onHistoryClick,
  onHistoryDelete,
}: HistoryListProps) {
  if (loading) {
    return (
      <div className="history-list-container">
        <div className="history-list-loading">読み込み中...</div>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="history-list-container">
        <div className="history-list-empty">検索履歴がありません</div>
      </div>
    );
  }

  return (
    <div className="history-list-container">
      <div className="history-list">
        {histories.map((history) => (
          <HistoryListItem
            key={history.id}
            history={history}
            onClick={() => onHistoryClick(history.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onHistoryDelete(history.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface HistoryListItemProps {
  history: SearchHistoryListItem;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

/**
 * HistoryListItem - 検索履歴項目コンポーネント
 *
 * 個々の検索履歴項目を表示します。
 *
 * @param history - 検索履歴データ
 * @param onClick - 項目クリック時のコールバック
 * @param onDelete - 削除ボタンクリック時のコールバック
 */
function HistoryListItem({ history, onClick, onDelete }: HistoryListItemProps) {
  const formattedDate = new Date(history.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: This is a complex card component with nested interactive elements, not a simple button
    <div
      className="history-list-item"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="history-item-header">
        <h3 className="history-item-query">{history.query}</h3>
        <button
          type="button"
          onClick={onDelete}
          className="history-item-delete-button"
          aria-label="削除"
        >
          🗑️
        </button>
      </div>

      <div className="history-item-meta">
        <span className="history-item-date">{formattedDate}</span>
      </div>

      {history.result_summary && (
        <p className="history-item-summary">{history.result_summary}</p>
      )}

      <div className="history-item-badges">
        {history.providers.map((provider) => (
          <span key={provider} className="history-item-provider-badge">
            {provider}
          </span>
        ))}
        {history.file_names.length > 0 && (
          <span className="history-item-files-badge">
            📎 {history.file_names.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
