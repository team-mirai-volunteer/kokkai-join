import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

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

// Mock Supabase client
vi.mock("./lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "test-user", email: "test@example.com" },
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

// Mock AuthContext
vi.mock("./features/auth/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    session: { access_token: "test-token" },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("App - Routing Structure", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    mockFetch.mockClear();

    // Default mock for history API
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe("when user is authenticated", () => {
    it("should render HistoryPage at root path", async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        // HistoryPage should be rendered - check for search input placeholder
        expect(screen.getByPlaceholderText(/検索キーワードを入力/)).toBeInTheDocument();
      });
    });

    it("should render application title", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("みらい議会 DeepResearch")).toBeInTheDocument();
      });
    });

    it("should render tab navigation buttons", async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        const authHeader = container.querySelector(".auth-header");
        const tabButtons = authHeader?.querySelectorAll("button");
        const buttonTexts = Array.from(tabButtons || []).map((btn) => btn.textContent);

        expect(buttonTexts).toContain("検索");
        expect(buttonTexts).toContain("履歴");
      });
    });

    it("should display user email when authenticated", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });
    });

    it("should display logout button when authenticated", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
      });
    });
  });
});
