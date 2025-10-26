import { useCallback, useEffect, useReducer, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileUploadArea } from "../components/FileUploadArea";
import { ProviderSelector } from "../components/ProviderSelector";
import { useAuth } from "../contexts/AuthContext";
import { useDeepSearch } from "../hooks/useDeepSearch";
import { useFileUpload } from "../hooks/useFileUpload";
import { useProviderSelection } from "../hooks/useProviderSelection";
import { useStorageCache } from "../hooks/useStorageCache";
import { initialUIState, uiStateReducer } from "../reducers/uiStateReducer";
import type { SearchResult } from "../types/searchResult";
import { storage } from "../utils/storage";
import "../App.css"; // Use existing App.css styles

/**
 * HistoryPage - 検索画面（Phase 1: 既存機能を移行）
 *
 * 責務:
 * - Phase 1では既存のApp.tsxの検索機能をここに移動
 * - Phase 3で履歴機能の本格実装に置き換える予定
 *
 * 設計原則:
 * - 高凝集: 検索機能に関する状態とロジックをこのページ内に集約
 * - 低結合: カスタムフックを通じて外部機能を利用（useDeepSearch, useFileUpload等）
 */
export default function HistoryPage() {
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [uiState, dispatch] = useReducer(uiStateReducer, initialUIState);

  const { data: cachedData, setData: setCachedData } =
    useStorageCache<SearchResult>({
      key: "deepresearch-cache",
      storage: storage,
    });

  const { files, addFiles, removeFile, error: fileError } = useFileUpload();

  const { selectedProviders, handleProviderToggle } =
    useProviderSelection(storage);

  const { search } = useDeepSearch();

  const result = cachedData?.result || "";

  const cachedQuery = cachedData?.query || "";
  useEffect(() => {
    if (cachedQuery) setQuery(cachedQuery);
  }, [cachedQuery]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      dispatch({ type: "SEARCH_START" });

      try {
        const encodedFiles =
          files.length > 0
            ? files.map((file) => ({
                name: file.name,
                content: file.content,
                mimeType: file.type,
              }))
            : undefined;

        const markdown = await search({
          query: query.trim(),
          providers: selectedProviders,
          files: encodedFiles,
        });

        setCachedData({
          query: query.trim(),
          result: markdown,
        });

        dispatch({ type: "SEARCH_SUCCESS" });
      } catch (err) {
        const errorMessage = `エラーが発生しました: ${
          err instanceof Error ? err.message : "不明なエラー"
        }`;
        dispatch({ type: "SEARCH_ERROR", payload: errorMessage });
      }
    },
    [files, query, selectedProviders, search, setCachedData],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <div className="app-container">
      <div className="input-section">
        <div className="auth-header">
          <span className="user-email">{user?.email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="logout-button"
          >
            ログアウト
          </button>
        </div>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索キーワードを入力してください..."
              disabled={uiState.loading}
              className="query-input"
            />
            <ProviderSelector
              selectedProviders={selectedProviders}
              onToggle={handleProviderToggle}
              isOpen={uiState.isDropdownOpen}
              onOpenChange={(open) =>
                dispatch({ type: "TOGGLE_DROPDOWN", payload: open })
              }
              disabled={uiState.loading}
            />
            <button
              type="submit"
              disabled={
                uiState.loading ||
                !query.trim() ||
                selectedProviders.length === 0
              }
              className="submit-button"
            >
              {uiState.loading ? "検索中..." : "検索"}
            </button>
          </div>
        </form>

        <FileUploadArea
          files={files}
          onFilesAdd={addFiles}
          onFileRemove={removeFile}
          error={fileError}
        />

        {uiState.error && <div className="error-message">{uiState.error}</div>}
      </div>

      <div className="output-section">
        <div className="markdown-output">
          {uiState.loading ? (
            <div className="loading">処理中...</div>
          ) : result ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          ) : (
            <div className="placeholder">検索結果がここに表示されます</div>
          )}
        </div>
      </div>
    </div>
  );
}
