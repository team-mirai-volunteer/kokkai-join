import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
        // Get current session to obtain access token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("認証が必要です。ログインしてください。");
        }

        const response = await fetcher(
          `${import.meta.env.VITE_API_ENDPOINT}/v1/deepresearch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              query: params.query.trim(),
              files: params.files,
              providers: params.providers,
            }),
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "認証エラー: セッションが無効です。再度ログインしてください。",
            );
          }
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
