import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../../auth/contexts/AuthContext";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { HistoryList } from "../components/HistoryList";
import { SearchForm, type SearchParams } from "../../search/components/SearchForm";
import { useDeepSearch } from "../../search/hooks/useDeepSearch";
import "../../../App.css";

type Tab = "search" | "history";

/**
 * HistoryPage - 検索・履歴統合ページ
 *
 * 責務:
 * - 検索機能の提供
 * - 検索結果の表示
 * - 検索履歴の一覧表示
 * - 履歴項目クリックで詳細ページに遷移
 * - 履歴削除機能
 *
 * 設計原則:
 * - 高凝集: 検索と履歴管理に関する状態とロジックをこのページ内に集約
 * - 低結合: useSearchHistory, useDeepSearchフックを通じてデータを取得
 */
export default function HistoryPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [searchResult, setSearchResult] = useState<string>("");
  const [lastQuery, setLastQuery] = useState<string>("");

  const { histories, loading: historyLoading, error: historyError, deleteHistory, refetchHistories } = useSearchHistory();
  const { search, loading: searchLoading, error: searchError } = useDeepSearch();

  const handleSearch = useCallback(
    async (params: SearchParams) => {
      try {
        setLastQuery(params.query);
        const markdown = await search(params);
        setSearchResult(markdown);

        // Backend automatically saves to history, just refresh the list
        await refetchHistories();
      } catch (err) {
        console.error("Search failed:", err);
        // Error is already handled by useDeepSearch
      }
    },
    [search, refetchHistories]
  );

  const handleHistoryClick = useCallback(
    (id: string) => {
      navigate(`/history/${id}`);
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

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <div className="app-container">
      <div className="input-section">
        <div className="auth-header">
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>みらい議会 DeepResearch</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className={activeTab === "search" ? "submit-button" : "logout-button"}
                style={{ padding: "0.5rem 1rem" }}
              >
                検索
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={activeTab === "history" ? "submit-button" : "logout-button"}
                style={{ padding: "0.5rem 1rem" }}
              >
                履歴
              </button>
            </div>
            <span className="user-email">{user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="logout-button"
            >
              ログアウト
            </button>
          </div>
        </div>

        {activeTab === "search" && (
          <SearchForm
            onSubmit={handleSearch}
            loading={searchLoading}
            error={searchError}
          />
        )}

        {activeTab === "history" && historyError && (
          <div className="error-message">{historyError}</div>
        )}
      </div>

      <div className="output-section">
        {activeTab === "search" && (
          <div className="markdown-output">
            {searchLoading ? (
              <div className="loading">処理中...</div>
            ) : searchResult ? (
              <>
                <h2>{lastQuery}</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {searchResult}
                </ReactMarkdown>
              </>
            ) : (
              <div className="placeholder">検索結果がここに表示されます</div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <HistoryList
            histories={histories}
            loading={historyLoading}
            onHistoryClick={handleHistoryClick}
            onHistoryDelete={handleHistoryDelete}
          />
        )}
      </div>
    </div>
  );
}
