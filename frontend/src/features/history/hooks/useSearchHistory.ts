import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SearchHistoryListItem } from "@/types/supabase.types";

interface UseSearchHistoryReturn {
  histories: SearchHistoryListItem[];
  loading: boolean;
  error: string | null;
  deleteHistory: (id: string) => Promise<void>;
  refetchHistories: () => Promise<void>;
}

/**
 * useSearchHistory - 検索履歴管理フック
 *
 * バックエンドAPI経由で検索履歴を取得・削除するカスタムフック。
 * 認証トークンを使用してバックエンドAPIにアクセスします。
 *
 * @returns 履歴データ、ローディング状態、エラー、削除関数、再取得関数
 *
 * @example
 * ```tsx
 * const { histories, loading, error, deleteHistory } = useSearchHistory();
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return (
 *   <div>
 *     {histories.map(history => (
 *       <div key={history.id}>
 *         <h3>{history.query}</h3>
 *         <button onClick={() => deleteHistory(history.id)}>削除</button>
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useSearchHistory(): UseSearchHistoryReturn {
  const [histories, setHistories] = useState<SearchHistoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 認証トークンを取得する
   */
  const getAuthToken = useCallback(async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }
    return session.access_token;
  }, []);

  /**
   * 検索履歴を取得する関数
   *
   * バックエンドAPI (/api/v1/history) から、
   * 現在のユーザーの履歴を作成日時の降順で最大100件取得します。
   */
  const fetchHistories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const apiUrl = import.meta.env.VITE_API_ENDPOINT;

      const response = await fetch(`${apiUrl}/v1/history?limit=100&offset=0`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      setHistories(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setHistories([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  /**
   * 検索履歴を削除する関数
   *
   * バックエンドAPI (/api/v1/history/:id) を使用して、
   * 指定されたIDの履歴を削除し、履歴一覧を再取得します。
   *
   * @param id - 削除する履歴のID
   * @throws 削除に失敗した場合
   */
  const deleteHistory = useCallback(
    async (id: string) => {
      const token = await getAuthToken();
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/api/v1/history/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to delete history: ${response.status}`,
        );
      }

      // 削除後、履歴を再取得
      await fetchHistories();
    },
    [fetchHistories, getAuthToken],
  );

  /**
   * 履歴を再取得する関数
   *
   * 新しい履歴が追加された後などに、最新の履歴一覧を取得するために使用します。
   */
  const refetchHistories = useCallback(async () => {
    await fetchHistories();
  }, [fetchHistories]);

  // 初回マウント時に履歴を取得
  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  return {
    histories,
    loading,
    error,
    deleteHistory,
    refetchHistories,
  };
}
