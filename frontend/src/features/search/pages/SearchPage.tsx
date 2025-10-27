import { useCallback, useState } from "react";
import { SearchForm, type SearchParams } from "../components/SearchForm";
import { SearchResult } from "../components/SearchResult";
import { useDeepSearch } from "../hooks/useDeepSearch";
import { useSearchHistory } from "../../history/hooks/useSearchHistory";
import "../../../App.css";

/**
 * SearchPage - 検索専用ページ
 *
 * 責務:
 * - 検索フォームの提供
 * - 検索実行の制御
 * - 検索結果の表示
 * - 検索成功後の履歴リフレッシュ
 *
 * 設計原則:
 * - 単一責任: 検索機能のみに集中
 * - 状態管理: 検索結果とクエリの状態を管理
 * - フック活用: useDeepSearch, useSearchHistoryで外部ロジックを分離
 */
export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<string>("");
  const [lastQuery, setLastQuery] = useState<string>("");
  const { search, loading, error } = useDeepSearch();
  const { refetchHistories } = useSearchHistory();

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

  return (
    <div className="app-container">
      <SearchForm onSubmit={handleSearch} loading={loading} error={error} />
      <div className="output-section">
        <SearchResult result={searchResult} query={lastQuery} loading={loading} />
      </div>
    </div>
  );
}
