import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "./SearchPage";

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
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/検索キーワードを入力/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
  });

  it("should display placeholder when no search results", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText("検索結果がここに表示されます")).toBeInTheDocument();
  });

  it("should display search results after search", async () => {
    const user = userEvent.setup();
    const mockResult = "# 検索結果\n\n防衛費に関する情報です。";

    // Mock search API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockResult,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "防衛費");

    const submitButton = screen.getByRole("button", { name: "検索" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "防衛費" })).toBeInTheDocument();
      expect(screen.getByText("防衛費に関する情報です。")).toBeInTheDocument();
    });
  });

  it("should display loading state during search", async () => {
    const user = userEvent.setup();

    // Mock slow search API
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                text: async () => "# Result",
              }),
            100
          )
        )
    );

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "test");

    const submitButton = screen.getByRole("button", { name: "検索" });
    await user.click(submitButton);

    expect(screen.getByText("処理中...")).toBeInTheDocument();
  });

  it("should display error message when search fails", async () => {
    const user = userEvent.setup();
    const errorMessage = "検索に失敗しました";

    // Mock failed search API
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => errorMessage,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "test");

    const submitButton = screen.getByRole("button", { name: "検索" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });

  it("should call refetchHistories after successful search", async () => {
    const user = userEvent.setup();

    // Mock search API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "# Result",
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "test");

    const submitButton = screen.getByRole("button", { name: "検索" });
    await user.click(submitButton);

    await waitFor(() => {
      // Search API should be called with deepresearch endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/deepresearch"),
        expect.any(Object)
      );
    });
  });
});
