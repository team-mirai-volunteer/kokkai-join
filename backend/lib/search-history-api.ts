import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	SearchHistory,
	SearchHistoryInsert,
	SearchHistoryListItem,
} from "../types/supabase.types.js";

interface ExecuteSearchParams {
	query: string;
	providers: string[];
	markdown: string;
	files?: { name: string }[];
}

/**
 * 検索実行 & 履歴保存
 *
 * DeepResearch検索結果を受け取り、Supabaseの search_histories テーブルに保存します。
 * 検索結果のサマリー（最初の200文字）を自動生成します。
 *
 * @param supabase - Supabaseクライアント
 * @param params - 検索パラメータ（query, providers, markdown, files）
 * @returns 保存された履歴のID
 * @throws 認証エラーまたはデータベースエラー
 */
export async function executeSearchAndSaveHistory(
	supabase: SupabaseClient,
	params: ExecuteSearchParams,
): Promise<{ historyId: string }> {
	// 1. 検索結果のサマリーを生成（最初の200文字）
	const summary =
		params.markdown.substring(0, 200) +
		(params.markdown.length > 200 ? "..." : "");

	// 2. ファイル名の抽出
	const fileNames = params.files?.map((f) => f.name) || [];

	// 3. 認証ユーザーIDを取得
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error("Authentication required");
	}

	// 4. 履歴をSupabaseに保存
	const insertData: SearchHistoryInsert = {
		user_id: user.id,
		query: params.query,
		providers: params.providers,
		result_summary: summary,
		result_markdown: params.markdown,
		file_names: fileNames,
	};

	const { data, error } = await supabase
		.from("search_histories")
		.insert(insertData)
		.select("id")
		.single();

	if (error) {
		console.error("Failed to save search history:", error);
		throw new Error(`Failed to save search history: ${error.message}`);
	}

	return {
		historyId: data?.id || "",
	};
}

/**
 * 履歴一覧取得（最新100件、ページネーション対応）
 *
 * ユーザーの検索履歴一覧を取得します。
 * RLSポリシーにより、自動的に現在のユーザーの履歴のみが取得されます。
 *
 * @param supabase - Supabaseクライアント
 * @param options - ページネーションオプション（limit, offset）
 * @returns 検索履歴の配列
 * @throws データベースエラー
 */
export async function getSearchHistories(
	supabase: SupabaseClient,
	options?: {
		limit?: number;
		offset?: number;
	},
): Promise<SearchHistoryListItem[]> {
	const limit = options?.limit || 100;
	const offset = options?.offset || 0;

	const { data, error } = await supabase
		.from("search_histories")
		.select("id, query, providers, result_summary, file_names, created_at")
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		throw new Error(`Failed to fetch search histories: ${error.message}`);
	}

	return (data as SearchHistoryListItem[]) || [];
}

/**
 * 履歴詳細取得
 *
 * 指定されたIDの検索履歴詳細を取得します。
 * RLSポリシーにより、自動的に現在のユーザーの履歴のみがアクセス可能です。
 *
 * @param supabase - Supabaseクライアント
 * @param id - 検索履歴ID
 * @returns 検索履歴データ、存在しない場合はnull
 * @throws データベースエラー
 */
export async function getSearchHistoryById(
	supabase: SupabaseClient,
	id: string,
): Promise<SearchHistory | null> {
	const { data, error } = await supabase
		.from("search_histories")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		throw new Error(`Failed to fetch search history: ${error.message}`);
	}

	return data as SearchHistory;
}

/**
 * 履歴削除
 *
 * 指定されたIDの検索履歴を削除します。
 * RLSポリシーにより、自動的に現在のユーザーの履歴のみが削除可能です。
 *
 * @param supabase - Supabaseクライアント
 * @param id - 検索履歴ID
 * @throws データベースエラー
 */
export async function deleteSearchHistory(
	supabase: SupabaseClient,
	id: string,
): Promise<void> {
	const { error } = await supabase
		.from("search_histories")
		.delete()
		.eq("id", id);

	if (error) {
		throw new Error(`Failed to delete search history: ${error.message}`);
	}
}
