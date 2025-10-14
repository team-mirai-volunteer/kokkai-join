import { useCallback, useState } from "react";
import type { ProviderType } from "../types/provider";

export interface SearchParams {
  query: string;
  providers: ProviderType[];
  files?: {
    name: string;
    content: string;
    mimeType: string;
  }[];
}

export interface UseDeepSearchReturn {
  loading: boolean;
  error: string | null;
  search: (params: SearchParams) => Promise<string>;
}

export interface UseDeepSearchOptions {
  fetcher?: typeof fetch;
}

const defaultFetcher: typeof fetch = (input, init) => fetch(input, init);

export function useDeepSearch(
  options: UseDeepSearchOptions = {},
): UseDeepSearchReturn {
  const { fetcher = defaultFetcher } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (params: SearchParams): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetcher(
          `${import.meta.env.VITE_API_ENDPOINT}/v1/deepresearch?x-vercel-protection-bypass=${import.meta.env.VITE_API_TOKEN}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: params.query.trim(),
              files: params.files,
              providers: params.providers,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const markdown = await response.text();
        return markdown;
      } catch (err) {
        const errorMessage = `エラーが発生しました: ${
          err instanceof Error ? err.message : "不明なエラー"
        }`;
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetcher],
  );

  return {
    loading,
    error,
    search,
  };
}
