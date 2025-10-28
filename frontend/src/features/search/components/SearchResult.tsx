import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SearchResultProps {
  result: string;
  loading: boolean;
}

/**
 * SearchResult - 検索結果表示コンポーネント
 *
 * 責務:
 * - 検索結果のMarkdownレンダリング
 * - ローディング状態の表示
 * - 未検索時のプレースホルダー表示
 *
 * 設計原則:
 * - プレゼンテーション専用（状態管理なし）
 * - 親コンポーネントから結果とローディング状態を受け取る
 */
export function SearchResult({ result, loading }: SearchResultProps) {
  if (loading) {
    return null;
  }

  if (!result) {
    return (
      <div className="markdown-output">
        <div className="placeholder">検索結果がここに表示されます</div>
      </div>
    );
  }

  return (
    <div className="markdown-output">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
    </div>
  );
}
