import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProgressEvent, ProgressState } from "../types/progress";
import type { ProviderType } from "../types/provider";

/**
 * セクション統合ステップのデフォルト情報
 */
const SYNTHESIS_STEP_INFO = {
  step: 5,
  totalSteps: 5,
  stepName: "セクション統合",
} as const;

export interface SearchParams {
  query: string;
  providers: ProviderType[];
  files?: {
    name: string;
    content: string;
    mimeType: string;
  }[];
}

export interface UseStreamingSearchReturn {
  loading: boolean;
  error: string | null;
  progress: ProgressState | null;
  search: (params: SearchParams) => Promise<string>;
}

export interface UseStreamingSearchOptions {
  fetcher?: typeof fetch;
}

const defaultFetcher: typeof fetch = (input, init) => fetch(input, init);

/**
 * useStreamingSearch - ストリーミング検索フック
 *
 * 責務:
 * - SSE (Server-Sent Events) を使用したリアルタイム進捗更新
 * - 進捗状態の管理と更新
 * - エラーハンドリング
 * - 認証トークンの管理
 *
 * 設計原則:
 * - React Hooksパターンに従う
 * - 状態管理とAPI呼び出しを分離
 * - テスト可能性のためfetcherを注入可能に
 */
export function useStreamingSearch(
  options: UseStreamingSearchOptions = {},
): UseStreamingSearchReturn {
  const { fetcher = defaultFetcher } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  const search = useCallback(
    async (params: SearchParams): Promise<string> => {
      setLoading(true);
      setError(null);
      setProgress(null);

      try {
        // Get current session to obtain access token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("認証が必要です。ログインしてください。");
        }

        const response = await fetcher(
          `${import.meta.env.VITE_API_ENDPOINT}/v1/deepresearch/stream`,
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

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult = "";
        let synthesisText = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete message in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            // Parse SSE format: "event: progress\ndata: {...}"
            const dataMatch = line.match(/data: (.+)/);
            if (!dataMatch) continue;

            const event: ProgressEvent = JSON.parse(dataMatch[1]);

            if (event.type === "progress") {
              // Update progress state
              setProgress((prevProgress) => ({
                step: event.step,
                totalSteps: event.totalSteps,
                stepName: event.stepName,
                message: event.message,
                sectionProgress: event.sectionProgress,
                synthesisText: prevProgress?.synthesisText,
              }));
            } else if (event.type === "synthesis_chunk") {
              // Accumulate synthesis chunks
              synthesisText += event.chunk;
              setProgress((prevProgress) => ({
                step: prevProgress?.step ?? SYNTHESIS_STEP_INFO.step,
                totalSteps:
                  prevProgress?.totalSteps ?? SYNTHESIS_STEP_INFO.totalSteps,
                stepName:
                  prevProgress?.stepName ?? SYNTHESIS_STEP_INFO.stepName,
                message: prevProgress?.message,
                sectionProgress: prevProgress?.sectionProgress,
                synthesisText,
              }));
            } else if (event.type === "complete") {
              // Save final result
              console.log(
                "[SSE] Received complete event, data length:",
                event.data.length,
              );
              finalResult = event.data;
            } else if (event.type === "error") {
              // Handle error event
              throw new Error(event.message);
            }
          }
        }

        if (
          finalResult === undefined ||
          finalResult === null ||
          finalResult === ""
        ) {
          throw new Error("No result received from server");
        }

        return finalResult;
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
    progress,
    search,
  };
}
