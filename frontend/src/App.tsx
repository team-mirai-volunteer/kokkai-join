import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocalStorageCache } from "./hooks/useLocalStorageCache";
import "./App.css";

interface SearchResult {
  query: string;
  result: string;
}

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // カスタムフックでlocalStorageを管理
  const {
    data: cachedData,
    setData: setCachedData,
  } = useLocalStorageCache<SearchResult>({
    key: "deepresearch_cache",
  });

  const result = cachedData?.result || "";
  const cachedQuery = cachedData?.query || "";

  if (cachedQuery && !query) {
    setQuery(cachedQuery);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("キーワードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}/v1/deepresearch?x-vercel-protection-bypass=${import.meta.env.VITE_API_TOKEN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const markdown = await response.text();

      // 結果をキャッシュに保存
      setCachedData({
        query: query.trim(),
        result: markdown,
      });
    } catch (err) {
      setError(
        `エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="input-section">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索キーワードを入力してください..."
              disabled={loading}
              className="query-input"
            />
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? "検索中..." : "検索"}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="output-section">
        <div className="markdown-output">
          {loading ? (
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

export default App;
