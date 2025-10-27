import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../../../lib/supabaseClient";
import type { SearchHistory } from "../../../../../types/supabase.types";
import "../../../App.css";

/**
 * HistoryDetailPage - 検索履歴詳細ページ
 *
 * 責務:
 * - 特定の検索履歴の詳細（マークダウン結果）を表示
 * - バックボタンで履歴一覧に戻る
 */
export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<SearchHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) {
        setError("履歴IDが指定されていません");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("認証されていません");
        }

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/v1/history/${id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "不明なエラーが発生しました";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-message">{error}</div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="submit-button"
          style={{ marginTop: "1rem" }}
        >
          履歴一覧に戻る
        </button>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="app-container">
        <div className="error-message">履歴が見つかりませんでした</div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="submit-button"
          style={{ marginTop: "1rem" }}
        >
          履歴一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="input-section">
        <div className="history-detail-header">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="submit-button"
            style={{ marginBottom: "1rem" }}
          >
            ← 履歴一覧に戻る
          </button>
          <h2>{history.query}</h2>
          <div className="history-detail-meta">
            <span>検索日時: {new Date(history.created_at).toLocaleString("ja-JP")}</span>
            {history.providers.length > 0 && (
              <span style={{ marginLeft: "1rem" }}>
                プロバイダー: {history.providers.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="output-section">
        <div className="markdown-output">
          {history.result_markdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {history.result_markdown}
            </ReactMarkdown>
          ) : (
            <div className="placeholder">検索結果がありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
