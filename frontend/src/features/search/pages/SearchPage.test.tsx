import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "./SearchPage";
import type { ProgressEvent } from "../types/progress";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	writable: true,
	configurable: true,
});

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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase auth
vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "test-token",
            user: { id: "test-user-id" },
          },
        },
        error: null,
      }),
    },
  },
}));

// Mock useSearchHistory hook - use a function that can be overridden
const mockRefetchHistories = vi.fn();
vi.mock("../../history/hooks/useSearchHistory", () => ({
  useSearchHistory: () => ({
    histories: [],
    loading: false,
    error: null,
    deleteHistory: vi.fn(),
    refetchHistories: mockRefetchHistories,
  }),
}));

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Default mock for history API
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it("should render search form", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText(/検索キーワードを入力/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
  });

  it("should display placeholder when no search results", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("検索結果がここに表示されます"),
    ).toBeInTheDocument();
  });

	it("should display search results after search", async () => {
		const user = userEvent.setup();
		const mockResult = "# 検索結果\n\n防衛費に関する情報です。";

		// Mock streaming search API
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "complete",
				data: mockResult,
			},
		];

		mockFetch.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		render(
			<MemoryRouter>
				<SearchPage />
			</MemoryRouter>,
		);

		const input = screen.getByPlaceholderText(/検索キーワードを入力/);
		await user.type(input, "防衛費");

		const submitButton = screen.getByRole("button", { name: "検索" });
		await user.click(submitButton);

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "検索結果" }),
			).toBeInTheDocument();
			expect(screen.getByText("防衛費に関する情報です。")).toBeInTheDocument();
		});
	});

	it("should display loading state during search", async () => {
		const user = userEvent.setup();

		// Mock slow streaming search API
		const progressEvents: ProgressEvent[] = [
			{
				type: "progress",
				step: 1,
				totalSteps: 4,
				stepName: "クエリプランニング",
			},
			{
				type: "complete",
				data: "# Result",
			},
		];

		mockFetch.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve(createMockSSEResponse(progressEvents)), 100),
				),
		);

		render(
			<MemoryRouter>
				<SearchPage />
			</MemoryRouter>,
		);

		const input = screen.getByPlaceholderText(/検索キーワードを入力/);
		await user.type(input, "test");

		const submitButton = screen.getByRole("button", { name: "検索" });
		await user.click(submitButton);

		// Check loading button text instead of placeholder
		expect(screen.getByRole("button", { name: "検索中..." })).toBeInTheDocument();
	});

	it("should display error message when search fails", async () => {
		const user = userEvent.setup();

		// Mock failed search API
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
		});

		render(
			<MemoryRouter>
				<SearchPage />
			</MemoryRouter>,
		);

		const input = screen.getByPlaceholderText(/検索キーワードを入力/);
		await user.type(input, "test");

		const submitButton = screen.getByRole("button", { name: "検索" });
		await user.click(submitButton);

		// Wait for loading to finish
		await waitFor(() => {
			expect(screen.queryByText("検索中...")).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
		});
	});

	it("should call streaming endpoint after successful search", async () => {
		const user = userEvent.setup();

		// Mock streaming search API
		const progressEvents: ProgressEvent[] = [
			{
				type: "complete",
				data: "# Result",
			},
		];

		mockFetch.mockResolvedValueOnce(createMockSSEResponse(progressEvents));

		render(
			<MemoryRouter>
				<SearchPage />
			</MemoryRouter>,
		);

		const input = screen.getByPlaceholderText(/検索キーワードを入力/);
		await user.type(input, "test");

		const submitButton = screen.getByRole("button", { name: "検索" });
		await user.click(submitButton);

		await waitFor(() => {
			// Search API should be called with streaming endpoint
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/v1/deepresearch/stream"),
				expect.any(Object),
			);
		});
	});

	it("should display progress information during search", async () => {
		const user = userEvent.setup();

		// Mock streaming search with progress events
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
				data: "# Result",
			},
		];

		// Create a stream
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				for (let i = 0; i < progressEvents.length; i++) {
					const event = progressEvents[i];
					const data = `event: progress\ndata: ${JSON.stringify(event)}\n\n`;
					controller.enqueue(encoder.encode(data));
					// Add delay before complete event to allow progress display to render
					if (i < progressEvents.length - 1 || event.type !== "complete") {
						await new Promise((resolve) => setTimeout(resolve, 100));
					}
				}
				controller.close();
			},
		});

		mockFetch.mockResolvedValueOnce({
			ok: true,
			body: stream,
		} as Response);

		render(
			<MemoryRouter>
				<SearchPage />
			</MemoryRouter>,
		);

		const input = screen.getByPlaceholderText(/検索キーワードを入力/);
		await user.type(input, "test");

		const submitButton = screen.getByRole("button", { name: "検索" });
		await user.click(submitButton);

		// Check for progress display
		await waitFor(
			() => {
				expect(screen.getByRole("progressbar")).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});
});
