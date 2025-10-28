import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderType } from "../types/provider";
import type { ProgressEvent } from "../types/progress";
import { useStreamingSearch } from "./useStreamingSearch";

// Mock Supabase client
vi.mock("@/lib/supabaseClient", () => ({
	supabase: {
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: {
					session: {
						user: { id: "test-user-id", email: "test@example.com" },
						access_token: "test-token",
					},
				},
				error: null,
			}),
		},
	},
}));

// Helper function to create a mock SSE response
function createMockSSEResponse(events: ProgressEvent[]) {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			for (const event of events) {
				const data = `event: progress\ndata: ${JSON.stringify(event)}\n\n`;
				controller.enqueue(encoder.encode(data));
			}
			controller.close();
		},
	});

	return {
		ok: true,
		body: stream,
	} as Response;
}

describe("useStreamingSearch", () => {
	const mockFetcher = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with idle state", () => {
		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBe(null);
		expect(result.current.progress).toBe(null);
	});

	it("should handle successful streaming search", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "progress",
				step: 2,
				totalSteps: 4,
				stepName: "セクション別検索",
			},
			{
				type: "complete",
				data: "# 検索結果\n\nこれが最終結果です。",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		let searchResult: string | undefined;
		await act(async () => {
			searchResult = await result.current.search({
				query: "test query",
				providers: ["kokkai-db"] as ProviderType[],
			});
		});

		expect(searchResult).toBe("# 検索結果\n\nこれが最終結果です。");
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBe(null);
	});

	it("should update progress state during streaming", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
				message: "クエリを分析しています...",
			},
			{
				type: "progress",
				step: 2,
				totalSteps: 4,
				stepName: "セクション別検索",
				sectionProgress: { completed: 3, total: 9 },
			},
			{
				type: "complete",
				data: "# 結果",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			result.current.search({
				query: "test query",
				providers: ["kokkai-db"] as ProviderType[],
			});
		});

		// Wait for progress updates
		await waitFor(() => {
			expect(result.current.progress).not.toBe(null);
		});

		// Progress should be updated (will be the last progress event before complete)
		expect(result.current.progress?.stepName).toBe("セクション別検索");
	});

	it("should handle streaming error event", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "error",
				step: 1,
				stepName: "クエリプランニング",
				message: "Planning failed",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await expect(
				result.current.search({
					query: "test query",
					providers: ["kokkai-db"] as ProviderType[],
				}),
			).rejects.toThrow("Planning failed");
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toContain("Planning failed");
	});

	it("should handle HTTP error", async () => {
		mockFetcher.mockResolvedValueOnce({
			ok: false,
			status: 500,
		});

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await expect(
				result.current.search({
					query: "test query",
					providers: ["kokkai-db"] as ProviderType[],
				}),
			).rejects.toThrow("HTTP error! status: 500");
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toContain("HTTP error! status: 500");
	});

	it("should handle authentication error", async () => {
		// Mock no session
		const { supabase } = await import("@/lib/supabaseClient");
		vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
			data: { session: null },
			error: null,
		});

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await expect(
				result.current.search({
					query: "test query",
					providers: ["kokkai-db"] as ProviderType[],
				}),
			).rejects.toThrow("認証が必要です");
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toContain("認証が必要です");
	});

	it("should send correct request to streaming endpoint", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "complete",
				data: "result",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await result.current.search({
				query: "test query",
				providers: ["kokkai-db", "openai-web"] as ProviderType[],
			});
		});

		expect(mockFetcher).toHaveBeenCalledWith(
			expect.stringContaining("/v1/deepresearch/stream"),
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: expect.stringContaining('"query":"test query"'),
			}),
		);
	});

	it("should handle search with files", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 3,
				totalSteps: 5,
				stepName: "PDF抽出",
				message: "1個のファイルを処理中...",
			},
			{
				type: "complete",
				data: "# Result with files",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await result.current.search({
				query: "test query",
				providers: ["kokkai-db"] as ProviderType[],
				files: [
					{
						name: "test.pdf",
						content: "base64content",
						mimeType: "application/pdf",
					},
				],
			});
		});

		expect(result.current.loading).toBe(false);
		expect(mockFetcher).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining("test.pdf"),
			}),
		);
	});

	it("should trim query before sending", async () => {
		const progressEvents: ProgressEvent[] = [
			{
				type: "complete",
				data: "result",
			},
		];

		mockFetcher.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		await act(async () => {
			await result.current.search({
				query: "  test query  ",
				providers: ["kokkai-db"] as ProviderType[],
			});
		});

		expect(mockFetcher).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('"query":"test query"'),
			}),
		);
	});

	it("should clear previous progress on new search", async () => {
		const firstEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "complete",
				data: "first result",
			},
		];

		const secondEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "complete",
				data: "second result",
			},
		];

		mockFetcher
			.mockResolvedValueOnce(createMockSSEResponse(firstEvents))
			.mockResolvedValueOnce(createMockSSEResponse(secondEvents));

		const { result } = renderHook(() =>
			useStreamingSearch({ fetcher: mockFetcher }),
		);

		// First search
		await act(async () => {
			await result.current.search({
				query: "first",
				providers: ["kokkai-db"] as ProviderType[],
			});
		});

		// Second search should clear previous progress
		await act(async () => {
			await result.current.search({
				query: "second",
				providers: ["kokkai-db"] as ProviderType[],
			});
		});

		expect(result.current.loading).toBe(false);
	});
});
