import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchHistoryListItem } from "../../../../../types/supabase.types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase auth
const mockGetSession = vi.fn();

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

// Import after mocking
const { useSearchHistory } = await import("./useSearchHistory");

describe("useSearchHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default auth mock
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          user: { id: "test-user-id" },
        },
      },
      error: null,
    });
  });

  describe("fetchHistories", () => {
    it("should fetch search histories successfully", async () => {
      const mockHistories: SearchHistoryListItem[] = [
        {
          id: "1",
          query: "防衛費と子育て支援",
          providers: ["kokkai", "web"],
          result_summary: "検索結果のサマリー...",
          file_names: [],
          created_at: "2025-01-26T00:00:00Z",
        },
        {
          id: "2",
          query: "教育改革について",
          providers: ["gov"],
          result_summary: "教育改革の検索結果...",
          file_names: ["document.pdf"],
          created_at: "2025-01-25T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockHistories,
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual(mockHistories);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/history?limit=100&offset=0",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Failed to fetch histories";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: errorMessage }),
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it("should handle empty histories", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("deleteHistory", () => {
    it("should delete history successfully", async () => {
      const mockHistories: SearchHistoryListItem[] = [
        {
          id: "1",
          query: "test query",
          providers: ["kokkai"],
          result_summary: "summary",
          file_names: [],
          created_at: "2025-01-26T00:00:00Z",
        },
      ];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistories,
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Delete operation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // After deletion, fetch returns empty array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await waitFor(async () => {
        await result.current.deleteHistory("1");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/history/1",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );

      await waitFor(() => {
        expect(result.current.histories).toEqual([]);
      });
    });

    it("should handle delete error", async () => {
      const mockHistories: SearchHistoryListItem[] = [
        {
          id: "1",
          query: "test query",
          providers: ["kokkai"],
          result_summary: "summary",
          file_names: [],
          created_at: "2025-01-26T00:00:00Z",
        },
      ];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistories,
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = "Delete failed";
      // Delete operation fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: errorMessage }),
      });

      await expect(result.current.deleteHistory("1")).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe("refetchHistories", () => {
    it("should refetch histories on demand", async () => {
      const initialHistories: SearchHistoryListItem[] = [
        {
          id: "1",
          query: "initial query",
          providers: ["kokkai"],
          result_summary: "initial summary",
          file_names: [],
          created_at: "2025-01-26T00:00:00Z",
        },
      ];

      const updatedHistories: SearchHistoryListItem[] = [
        {
          id: "1",
          query: "initial query",
          providers: ["kokkai"],
          result_summary: "initial summary",
          file_names: [],
          created_at: "2025-01-26T00:00:00Z",
        },
        {
          id: "2",
          query: "new query",
          providers: ["web"],
          result_summary: "new summary",
          file_names: [],
          created_at: "2025-01-27T00:00:00Z",
        },
      ];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => initialHistories,
      });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual(initialHistories);

      // Refetch with updated data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedHistories,
      });

      await waitFor(async () => {
        await result.current.refetchHistories();
      });

      await waitFor(() => {
        expect(result.current.histories).toEqual(updatedHistories);
      });
    });
  });
});
