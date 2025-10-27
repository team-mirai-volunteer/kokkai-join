import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HistoryListPage from "./HistoryListPage";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase client
vi.mock("../../../lib/supabaseClient", () => ({
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

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("HistoryListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockFetch.mockClear();

    // Default mock for history API
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it("should fetch and display histories on mount", async () => {
    const mockHistories = [
      {
        id: "1",
        query: "Test query",
        providers: ["kokkai-db"],
        result_summary: "Summary",
        file_names: [],
        created_at: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistories,
    });

    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/history"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Test query")).toBeInTheDocument();
    });
  });

  it("should navigate to detail page when history item is clicked", async () => {
    const mockHistories = [
      {
        id: "test-id",
        query: "Test query",
        providers: ["kokkai-db"],
        result_summary: "Summary",
        file_names: [],
        created_at: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistories,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test query")).toBeInTheDocument();
    });

    const historyItem = screen.getByText("Test query");
    await user.click(historyItem);

    expect(mockNavigate).toHaveBeenCalledWith("/histories/test-id");
  });

  it("should delete history when delete button is clicked and confirmed", async () => {
    const mockHistories = [
      {
        id: "test-id",
        query: "Test query",
        providers: ["kokkai-db"],
        result_summary: "Summary",
        file_names: [],
        created_at: new Date().toISOString(),
      },
    ];

    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistories,
    });

    // Mock window.confirm to return true
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test query")).toBeInTheDocument();
    });

    // Mock delete API success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Mock refetch after delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/history/test-id"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  it("should not delete history when delete is cancelled", async () => {
    const mockHistories = [
      {
        id: "test-id",
        query: "Test query",
        providers: ["kokkai-db"],
        result_summary: "Summary",
        file_names: [],
        created_at: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistories,
    });

    // Mock window.confirm to return false
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test query")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // Verify delete API was not called
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
  });

  it("should display error message when fetch fails", async () => {
    const errorMessage = "Failed to fetch histories";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: errorMessage }),
    });

    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("should display empty state when no histories exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <MemoryRouter>
        <HistoryListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("検索履歴がありません")).toBeInTheDocument();
    });
  });
});
