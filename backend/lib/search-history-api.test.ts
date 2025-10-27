import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	deleteSearchHistory,
	executeSearchAndSaveHistory,
	getSearchHistories,
	getSearchHistoryById,
} from "./search-history-api.js";

// Mock Supabase client
const createMockSupabaseClient = () => {
	const mockSelect = vi.fn();
	const mockInsert = vi.fn();
	const mockDelete = vi.fn();
	const mockEq = vi.fn();
	const mockOrder = vi.fn();
	const mockRange = vi.fn();
	const mockSingle = vi.fn();
	const mockFrom = vi.fn();
	const mockGetUser = vi.fn();

	const client = {
		from: mockFrom,
		auth: {
			getUser: mockGetUser,
		},
		_mocks: {
			from: mockFrom,
			select: mockSelect,
			insert: mockInsert,
			delete: mockDelete,
			eq: mockEq,
			order: mockOrder,
			range: mockRange,
			single: mockSingle,
			getUser: mockGetUser,
		},
	} as unknown as SupabaseClient & {
		_mocks: {
			from: ReturnType<typeof vi.fn>;
			select: ReturnType<typeof vi.fn>;
			insert: ReturnType<typeof vi.fn>;
			delete: ReturnType<typeof vi.fn>;
			eq: ReturnType<typeof vi.fn>;
			order: ReturnType<typeof vi.fn>;
			range: ReturnType<typeof vi.fn>;
			single: ReturnType<typeof vi.fn>;
			getUser: ReturnType<typeof vi.fn>;
		};
	};

	return client;
};

describe("Search History API", () => {
	describe("executeSearchAndSaveHistory", () => {
		it("should execute search and save history successfully", async () => {
			const mockClient = createMockSupabaseClient();
			const mockUserId = "user-123";
			const mockHistoryId = "history-456";

			// Mock auth.getUser
			mockClient._mocks.getUser.mockResolvedValue({
				data: { user: { id: mockUserId } },
				error: null,
			});

			// Mock database insert
			mockClient._mocks.single.mockResolvedValue({
				data: { id: mockHistoryId },
				error: null,
			});
			mockClient._mocks.select.mockReturnValue({
				single: mockClient._mocks.single,
			});
			mockClient._mocks.insert.mockReturnValue({
				select: mockClient._mocks.select,
			});
			mockClient._mocks.from.mockReturnValue({
				insert: mockClient._mocks.insert,
			});

			const params = {
				query: "防衛費と子育て支援の関係",
				providers: ["kokkai", "web"],
				markdown: "# 検索結果\n\nこれはテスト結果です。",
				files: [{ name: "test.pdf" }],
			};

			const result = await executeSearchAndSaveHistory(mockClient, params);

			expect(result.historyId).toBe(mockHistoryId);
			expect(mockClient._mocks.getUser).toHaveBeenCalled();
			expect(mockClient._mocks.from).toHaveBeenCalledWith("search_histories");
			expect(mockClient._mocks.insert).toHaveBeenCalledWith({
				user_id: mockUserId,
				query: params.query,
				providers: params.providers,
				result_summary: expect.stringContaining("検索結果"),
				result_markdown: params.markdown,
				file_names: ["test.pdf"],
			});
		});

		it("should throw error when user is not authenticated", async () => {
			const mockClient = createMockSupabaseClient();

			// Mock auth failure
			mockClient._mocks.getUser.mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const params = {
				query: "test query",
				providers: ["kokkai"],
				markdown: "# Result",
				files: [],
			};

			await expect(
				executeSearchAndSaveHistory(mockClient, params),
			).rejects.toThrow("Authentication required");
		});

		it("should handle empty files array", async () => {
			const mockClient = createMockSupabaseClient();
			const mockUserId = "user-123";
			const mockHistoryId = "history-456";

			mockClient._mocks.getUser.mockResolvedValue({
				data: { user: { id: mockUserId } },
				error: null,
			});
			mockClient._mocks.single.mockResolvedValue({
				data: { id: mockHistoryId },
				error: null,
			});
			mockClient._mocks.select.mockReturnValue({
				single: mockClient._mocks.single,
			});
			mockClient._mocks.insert.mockReturnValue({
				select: mockClient._mocks.select,
			});
			mockClient._mocks.from.mockReturnValue({
				insert: mockClient._mocks.insert,
			});

			const params = {
				query: "test query",
				providers: ["kokkai"],
				markdown: "# Result",
				files: [],
			};

			await executeSearchAndSaveHistory(mockClient, params);

			expect(mockClient._mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					file_names: [],
				}),
			);
		});
	});

	describe("getSearchHistories", () => {
		it("should fetch search histories with default pagination", async () => {
			const mockClient = createMockSupabaseClient();
			const mockHistories = [
				{
					id: "1",
					query: "test 1",
					providers: ["kokkai"],
					result_summary: "summary 1",
					file_names: [],
					created_at: "2025-01-01T00:00:00Z",
				},
				{
					id: "2",
					query: "test 2",
					providers: ["web"],
					result_summary: "summary 2",
					file_names: ["file.pdf"],
					created_at: "2025-01-02T00:00:00Z",
				},
			];

			mockClient._mocks.range.mockResolvedValue({
				data: mockHistories,
				error: null,
			});
			mockClient._mocks.order.mockReturnValue({
				range: mockClient._mocks.range,
			});
			mockClient._mocks.select.mockReturnValue({
				order: mockClient._mocks.order,
			});
			mockClient._mocks.from.mockReturnValue({
				select: mockClient._mocks.select,
			});

			const result = await getSearchHistories(mockClient);

			expect(result).toEqual(mockHistories);
			expect(mockClient._mocks.from).toHaveBeenCalledWith("search_histories");
			expect(mockClient._mocks.select).toHaveBeenCalledWith(
				"id, query, providers, result_summary, file_names, created_at",
			);
			expect(mockClient._mocks.order).toHaveBeenCalledWith("created_at", {
				ascending: false,
			});
			expect(mockClient._mocks.range).toHaveBeenCalledWith(0, 99); // default limit 100
		});

		it("should fetch search histories with custom pagination", async () => {
			const mockClient = createMockSupabaseClient();

			mockClient._mocks.range.mockResolvedValue({
				data: [],
				error: null,
			});
			mockClient._mocks.order.mockReturnValue({
				range: mockClient._mocks.range,
			});
			mockClient._mocks.select.mockReturnValue({
				order: mockClient._mocks.order,
			});
			mockClient._mocks.from.mockReturnValue({
				select: mockClient._mocks.select,
			});

			await getSearchHistories(mockClient, { limit: 50, offset: 10 });

			expect(mockClient._mocks.range).toHaveBeenCalledWith(10, 59); // offset 10, limit 50
		});

		it("should throw error when fetch fails", async () => {
			const mockClient = createMockSupabaseClient();

			mockClient._mocks.range.mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});
			mockClient._mocks.order.mockReturnValue({
				range: mockClient._mocks.range,
			});
			mockClient._mocks.select.mockReturnValue({
				order: mockClient._mocks.order,
			});
			mockClient._mocks.from.mockReturnValue({
				select: mockClient._mocks.select,
			});

			await expect(getSearchHistories(mockClient)).rejects.toThrow(
				"Failed to fetch search histories: Database error",
			);
		});
	});

	describe("getSearchHistoryById", () => {
		it("should fetch a single search history by ID", async () => {
			const mockClient = createMockSupabaseClient();
			const mockHistory = {
				id: "history-123",
				user_id: "user-456",
				query: "test query",
				providers: ["kokkai"],
				result_summary: "summary",
				result_markdown: "# Markdown result",
				file_names: [],
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			mockClient._mocks.single.mockResolvedValue({
				data: mockHistory,
				error: null,
			});
			mockClient._mocks.eq.mockReturnValue({
				single: mockClient._mocks.single,
			});
			mockClient._mocks.select.mockReturnValue({
				eq: mockClient._mocks.eq,
			});
			mockClient._mocks.from.mockReturnValue({
				select: mockClient._mocks.select,
			});

			const result = await getSearchHistoryById(mockClient, "history-123");

			expect(result).toEqual(mockHistory);
			expect(mockClient._mocks.from).toHaveBeenCalledWith("search_histories");
			expect(mockClient._mocks.select).toHaveBeenCalledWith("*");
			expect(mockClient._mocks.eq).toHaveBeenCalledWith("id", "history-123");
		});

		it("should throw error when history not found", async () => {
			const mockClient = createMockSupabaseClient();

			mockClient._mocks.single.mockResolvedValue({
				data: null,
				error: { message: "Not found" },
			});
			mockClient._mocks.eq.mockReturnValue({
				single: mockClient._mocks.single,
			});
			mockClient._mocks.select.mockReturnValue({
				eq: mockClient._mocks.eq,
			});
			mockClient._mocks.from.mockReturnValue({
				select: mockClient._mocks.select,
			});

			await expect(
				getSearchHistoryById(mockClient, "nonexistent-id"),
			).rejects.toThrow("Failed to fetch search history: Not found");
		});
	});

	describe("deleteSearchHistory", () => {
		it("should delete a search history by ID", async () => {
			const mockClient = createMockSupabaseClient();

			mockClient._mocks.eq.mockResolvedValue({
				data: null,
				error: null,
			});
			mockClient._mocks.delete.mockReturnValue({
				eq: mockClient._mocks.eq,
			});
			mockClient._mocks.from.mockReturnValue({
				delete: mockClient._mocks.delete,
			});

			await deleteSearchHistory(mockClient, "history-123");

			expect(mockClient._mocks.from).toHaveBeenCalledWith("search_histories");
			expect(mockClient._mocks.delete).toHaveBeenCalled();
			expect(mockClient._mocks.eq).toHaveBeenCalledWith("id", "history-123");
		});

		it("should throw error when delete fails", async () => {
			const mockClient = createMockSupabaseClient();

			mockClient._mocks.eq.mockResolvedValue({
				data: null,
				error: { message: "Delete failed" },
			});
			mockClient._mocks.delete.mockReturnValue({
				eq: mockClient._mocks.eq,
			});
			mockClient._mocks.from.mockReturnValue({
				delete: mockClient._mocks.delete,
			});

			await expect(
				deleteSearchHistory(mockClient, "history-123"),
			).rejects.toThrow("Failed to delete search history: Delete failed");
		});
	});
});
