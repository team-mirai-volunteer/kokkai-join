import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HistoryDetailPage from "./HistoryDetailPage";
import { supabase } from "@/lib/supabaseClient";
import type { SearchHistory } from "@/types/supabase.types";

// Mock Supabase
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockHistory: SearchHistory = {
  id: "test-id-123",
  user_id: "user-456",
  query: "テスト検索クエリ",
  providers: ["kokkai", "web"],
  result_summary: "これはテスト結果のサマリーです",
  result_markdown: "# テスト結果\n\nこれはマークダウン形式の結果です。",
  file_names: ["test.pdf"],
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
};

describe("HistoryDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful auth session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
        },
      },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  });

  it("should display loading state initially", () => {
    mockFetch.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - simulates loading
        }),
    );

    render(
      <MemoryRouter initialEntries={["/histories/test-id-123"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should fetch and display history detail", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistory,
    });

    render(
      <MemoryRouter initialEntries={["/histories/test-id-123"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // Check if markdown is rendered
    expect(screen.getByText(/テスト結果/)).toBeInTheDocument();
    expect(
      screen.getByText(/これはマークダウン形式の結果です/),
    ).toBeInTheDocument();

    // Check metadata
    expect(screen.getByText(/検索日時:/)).toBeInTheDocument();
    expect(screen.getByText(/プロバイダー: kokkai, web/)).toBeInTheDocument();
  });

  it("should handle 404 error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "Not found" }),
    });

    render(
      <MemoryRouter initialEntries={["/histories/nonexistent"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeInTheDocument();
    });

    expect(screen.getByText("履歴一覧に戻る")).toBeInTheDocument();
  });

  it("should handle missing history ID", async () => {
    render(
      <MemoryRouter initialEntries={["/histories/"]}>
        <Routes>
          <Route path="/histories/:id?" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("履歴IDが指定されていません"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("履歴一覧に戻る")).toBeInTheDocument();
  });

  it("should handle authentication error", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    render(
      <MemoryRouter initialEntries={["/histories/test-id-123"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("認証されていません")).toBeInTheDocument();
    });
  });

  it("should handle network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <MemoryRouter initialEntries={["/histories/test-id-123"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should display placeholder when no markdown result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockHistory,
        result_markdown: null,
      }),
    });

    render(
      <MemoryRouter initialEntries={["/histories/test-id-123"]}>
        <Routes>
          <Route path="/histories/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("検索結果がありません")).toBeInTheDocument();
    });
  });
});
