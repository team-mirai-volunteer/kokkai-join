import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderType } from "../types/provider";
import { useDeepSearch } from "./useDeepSearch";

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

describe("useDeepSearch", () => {
  const mockFetcher = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with idle state", () => {
    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should handle successful search", async () => {
    const mockResponse = "# Search Result\nThis is the result";
    mockFetcher.mockResolvedValueOnce({
      ok: true,
      text: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    let searchResult: string | undefined;
    await act(async () => {
      searchResult = await result.current.search({
        query: "test query",
        providers: ["kokkai-db"] as ProviderType[],
      });
    });

    expect(searchResult).toBe(mockResponse);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
      }),
    );
  });

  it("should handle search with files", async () => {
    const mockResponse = "# Result with files";
    mockFetcher.mockResolvedValueOnce({
      ok: true,
      text: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    await act(async () => {
      await result.current.search({
        query: "test query",
        providers: ["kokkai-db"] as ProviderType[],
        files: [
          {
            name: "test.txt",
            content: "base64content",
            mimeType: "text/plain",
          },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: expect.stringContaining("test.txt"),
      }),
    );
  });

  it("should handle HTTP error", async () => {
    mockFetcher.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
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

  it("should handle network error", async () => {
    mockFetcher.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    await act(async () => {
      await expect(
        result.current.search({
          query: "test query",
          providers: ["kokkai-db"] as ProviderType[],
        }),
      ).rejects.toThrow("Network error");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("エラーが発生しました: Network error");
  });

  it("should trim query before sending", async () => {
    mockFetcher.mockResolvedValueOnce({
      ok: true,
      text: async () => "result",
    });

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    await act(async () => {
      await result.current.search({
        query: "  test query  ",
        providers: ["kokkai-db"] as ProviderType[],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"query":"test query"'),
      }),
    );
  });

  it("should handle unknown error type", async () => {
    mockFetcher.mockRejectedValueOnce("string error");

    const { result } = renderHook(() =>
      useDeepSearch({ fetcher: mockFetcher }),
    );

    await act(async () => {
      await expect(
        result.current.search({
          query: "test query",
          providers: ["kokkai-db"] as ProviderType[],
        }),
      ).rejects.toBe("string error");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("エラーが発生しました: 不明なエラー");
  });
});
