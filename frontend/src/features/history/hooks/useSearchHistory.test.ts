import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchHistoryListItem } from "../../../../../types/supabase.types";

// Mock Supabase client - must be defined before vi.mock
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockEq = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Import after mocking
const { useSearchHistory } = await import("./useSearchHistory");

describe("useSearchHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      mockRange.mockResolvedValue({
        data: mockHistories,
        error: null,
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual(mockHistories);
      expect(result.current.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("search_histories");
      expect(mockSelect).toHaveBeenCalledWith(
        "id, query, providers, result_summary, file_names, created_at"
      );
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(mockRange).toHaveBeenCalledWith(0, 99);
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Failed to fetch histories";
      mockRange.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual([]);
      expect(result.current.error).toBe(
        `Failed to fetch search histories: ${errorMessage}`
      );
    });

    it("should handle empty histories", async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

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
      mockRange.mockResolvedValue({
        data: mockHistories,
        error: null,
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Delete operation
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });
      mockDelete.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      // After deletion, fetch returns empty array
      mockRange.mockResolvedValue({
        data: [],
        error: null,
      });

      await result.current.deleteHistory("1");

      expect(mockFrom).toHaveBeenCalledWith("search_histories");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "1");

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

      mockRange.mockResolvedValue({
        data: mockHistories,
        error: null,
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = "Delete failed";
      mockEq.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });
      mockDelete.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      await expect(result.current.deleteHistory("1")).rejects.toThrow(
        `Failed to delete search history: ${errorMessage}`
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
      mockRange.mockResolvedValueOnce({
        data: initialHistories,
        error: null,
      });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { result } = renderHook(() => useSearchHistory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.histories).toEqual(initialHistories);

      // Refetch with updated data
      mockRange.mockResolvedValueOnce({
        data: updatedHistories,
        error: null,
      });

      await result.current.refetchHistories();

      await waitFor(() => {
        expect(result.current.histories).toEqual(updatedHistories);
      });
    });
  });
});
