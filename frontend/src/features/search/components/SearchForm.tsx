import { useState, type FormEvent } from "react";
import { FileUploadArea } from "./FileUploadArea";
import { ProviderSelector } from "./ProviderSelector";
import { useFileUpload } from "../hooks/useFileUpload";
import { useProviderSelection } from "../hooks/useProviderSelection";
import { storage } from "../../../shared/utils/storage";
import type { ProviderType } from "../types/provider";
import "../../../App.css";

export interface SearchParams {
  query: string;
  providers: ProviderType[];
  files?: {
    name: string;
    content: string;
    mimeType: string;
  }[];
}

export interface SearchFormProps {
  onSubmit: (params: SearchParams) => Promise<void>;
  loading: boolean;
  error?: string | null;
}

/**
 * SearchForm - 検索フォームコンポーネント
 *
 * 責務:
 * - 検索クエリの入力
 * - プロバイダーの選択
 * - ファイルのアップロード
 * - 検索の実行
 */
export function SearchForm({ onSubmit, loading, error }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { files, addFiles, removeFile, error: fileError } = useFileUpload();
  const { selectedProviders, handleProviderToggle } = useProviderSelection(storage);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const encodedFiles =
      files.length > 0
        ? files.map((file) => ({
            name: file.name,
            content: file.content,
            mimeType: file.type,
          }))
        : undefined;

    await onSubmit({
      query: query.trim(),
      providers: selectedProviders,
      files: encodedFiles,
    });
  };

  const isSubmitDisabled =
    loading || !query.trim() || selectedProviders.length === 0;

  return (
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
          <ProviderSelector
            selectedProviders={selectedProviders}
            onToggle={handleProviderToggle}
            isOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={isSubmitDisabled}
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
  );
}
