import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileUploadArea } from "./components/FileUploadArea";
import { useFileUpload } from "./hooks/useFileUpload";
import { useProviderSelection } from "./hooks/useProviderSelection";
import { useStorageCache } from "./hooks/useStorageCache";
import { PROVIDER_LABELS, SELECTABLE_PROVIDERS } from "./types/provider";
import "./App.css";
import { storage } from "./utils/storage";

interface SearchResult {
  query: string;
  result: string;
}

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: cachedData, setData: setCachedData } =
    useStorageCache<SearchResult>({
      key: "deepresearch-cache",
      storage: storage,
    });

  const { files, addFiles, removeFile, error: fileError } = useFileUpload();

  const { selectedProviders, handleProviderToggle } =
    useProviderSelection(storage);

  const result = cachedData?.result || "";

  const cachedQuery = cachedData?.query || "";
  useEffect(() => {
    if (cachedQuery) setQuery(cachedQuery);
  }, [cachedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const encodedFiles =
        files.length > 0
          ? files.map((file) => ({
              name: file.name,
              content: file.content,
              mimeType: file.type,
            }))
          : undefined;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}/v1/deepresearch?x-vercel-protection-bypass=${import.meta.env.VITE_API_TOKEN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
            files: encodedFiles,
            providers: selectedProviders,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const markdown = await response.text();

      setCachedData({
        query: query.trim(),
        result: markdown,
      });
    } catch (err) {
      setError(
        `エラーが発生しました: ${
          err instanceof Error ? err.message : "不明なエラー"
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
          <div className="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索キーワードを入力してください..."
              disabled={loading}
              className="query-input"
            />
            <div className="provider-dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="dropdown-button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={loading}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                検索対象
                <span className="provider-count">
                  ({selectedProviders.length})
                </span>
                <span
                  className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
                >
                  ▼
                </span>
              </button>
              {isDropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  {SELECTABLE_PROVIDERS.map((providerId) => (
                    <div key={providerId} className="dropdown-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(providerId)}
                          onChange={() => handleProviderToggle(providerId)}
                          disabled={loading}
                        />
                        <span>{PROVIDER_LABELS[providerId]}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={
                loading || !query.trim() || selectedProviders.length === 0
              }
              className="submit-button"
            >
              {loading ? "検索中..." : "検索"}
            </button>
          </div>
        </form>

        <FileUploadArea
          files={files}
          onFilesAdd={addFiles}
          onFileRemove={removeFile}
          error={fileError}
        />

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
