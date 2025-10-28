import { useCallback, useState } from "react";
import { useSearchHistory } from "@/features/history/hooks/useSearchHistory";
import { ProgressDisplay } from "../components/ProgressDisplay";
import { SearchForm, type SearchParams } from "../components/SearchForm";
import { SearchResult } from "../components/SearchResult";
import { useStreamingSearch } from "../hooks/useStreamingSearch";
import "@/shared/styles/global.css";

/**
 * SearchPage - 検索専用ページ
 *
 * 責務:
 * - 検索フォームの提供
 * - 検索実行の制御
 * - リアルタイム進捗表示
 * - 検索結果の表示
 * - 検索成功後の履歴リフレッシュ
 *
 * 設計原則:
 * - 単一責任: 検索機能のみに集中
 * - 状態管理: 検索結果、クエリ、進捗の状態を管理
 * - フック活用: useStreamingSearch, useSearchHistoryで外部ロジックを分離
 */
export default function SearchPage() {
  const [searchResult, setSearchResult] = useState<string>("");
  const { search, loading, error, progress } = useStreamingSearch();
  const { refetchHistories } = useSearchHistory();

  const handleSearch = useCallback(
    async (params: SearchParams) => {
      try {
        const markdown = await search(params);
        setSearchResult(markdown);

        // Backend automatically saves to history, just refresh the list
        await refetchHistories();
      } catch (err) {
        console.error("Search failed:", err);
        // Error is already handled by useStreamingSearch
      }
    },
    [search, refetchHistories],
  );

  // セクション統合中で synthesisText がある場合は、それを表示用の結果とする
  const displayResult = progress?.synthesisText || searchResult;

  // セクション統合中で synthesisText がある場合は、進捗表示を隠す
  const shouldShowProgress = loading && progress && !progress.synthesisText;

  return (
    <div className="app-container">
      <SearchForm onSubmit={handleSearch} loading={loading} error={error} />
      <div className="output-section">
        {/* Show progress during loading (except when showing synthesis preview) */}
        {shouldShowProgress && <ProgressDisplay progress={progress} />}
        <SearchResult result={displayResult} loading={loading} />
      </div>
    </div>
  );
}
