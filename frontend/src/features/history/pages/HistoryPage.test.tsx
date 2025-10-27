import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Mock Supabase client to isolate HistoryPage from external dependencies.
 */
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
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

/**
 * Mock AuthContext to focus tests on HistoryPage's behavior.
 */
vi.mock("../../auth/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    session: {
      user: { id: "test-user-id", email: "test@example.com" },
      access_token: "test-token",
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  }),
}));

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

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockNavigate.mockClear();
    mockFetch.mockClear();

    // Default mock for history API
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe("Tab Navigation", () => {
    it("should show search tab by default when at root path", async () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Find tab buttons in auth-header
        const authHeader = container.querySelector(".auth-header");
        const tabButtons = authHeader?.querySelectorAll("button");
        const searchTabButton = Array.from(tabButtons || []).find(
          (btn) => btn.textContent === "検索"
        );
        expect(searchTabButton).toHaveClass("submit-button");
      });
    });

    it("should show history tab when at /histories path", async () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/histories"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        const authHeader = container.querySelector(".auth-header");
        const tabButtons = authHeader?.querySelectorAll("button");
        const historyTabButton = Array.from(tabButtons || []).find(
          (btn) => btn.textContent === "履歴"
        );
        expect(historyTabButton).toHaveClass("submit-button");
      });
    });

    it("should navigate to root when search tab is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <MemoryRouter initialEntries={["/histories"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        const authHeader = container.querySelector(".auth-header");
        const tabButtons = authHeader?.querySelectorAll("button");
        const searchTabButton = Array.from(tabButtons || []).find(
          (btn) => btn.textContent === "検索"
        ) as HTMLButtonElement;
        expect(searchTabButton).toBeTruthy();
      });

      const authHeader = container.querySelector(".auth-header");
      const tabButtons = authHeader?.querySelectorAll("button");
      const searchTabButton = Array.from(tabButtons || []).find(
        (btn) => btn.textContent === "検索"
      ) as HTMLButtonElement;

      await user.click(searchTabButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should navigate to /histories when history tab is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        const authHeader = container.querySelector(".auth-header");
        const tabButtons = authHeader?.querySelectorAll("button");
        const historyTabButton = Array.from(tabButtons || []).find(
          (btn) => btn.textContent === "履歴"
        ) as HTMLButtonElement;
        expect(historyTabButton).toBeTruthy();
      });

      const authHeader = container.querySelector(".auth-header");
      const tabButtons = authHeader?.querySelectorAll("button");
      const historyTabButton = Array.from(tabButtons || []).find(
        (btn) => btn.textContent === "履歴"
      ) as HTMLButtonElement;

      await user.click(historyTabButton);

      expect(mockNavigate).toHaveBeenCalledWith("/histories");
    });
  });

  describe("Search Tab", () => {
    it("should render search form when on search tab", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText(/検索キーワードを入力/)).toBeInTheDocument();
    });

    it("should display placeholder when no search results", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      expect(screen.getByText("検索結果がここに表示されます")).toBeInTheDocument();
    });
  });

  describe("History Tab", () => {
    it("should fetch histories when on history tab", async () => {
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
        <MemoryRouter initialEntries={["/histories"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/history"),
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: "Bearer test-token",
            }),
          })
        );
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
        <MemoryRouter initialEntries={["/histories"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Test query")).toBeInTheDocument();
      });

      const historyItem = screen.getByText("Test query");
      await user.click(historyItem);

      expect(mockNavigate).toHaveBeenCalledWith("/histories/test-id");
    });
  });

  describe("User Interface", () => {
    it("should display user email in header", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should render logout button", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <HistoryPage />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
    });
  });
});
