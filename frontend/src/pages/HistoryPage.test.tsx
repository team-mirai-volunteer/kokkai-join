import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HistoryPage from "./HistoryPage";

/**
 * Mock Supabase client to isolate HistoryPage from external dependencies.
 */
vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

/**
 * Mock AuthContext to focus tests on HistoryPage's rendering.
 */
vi.mock("../contexts/AuthContext", () => ({
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

describe("HistoryPage", () => {
  it("should render app container", () => {
    const { container } = render(<HistoryPage />);

    const appContainer = container.querySelector(".app-container");
    expect(appContainer).toBeInTheDocument();
  });

  it("should render search form", () => {
    const { container } = render(<HistoryPage />);

    const searchForm = container.querySelector(".search-form");
    expect(searchForm).toBeInTheDocument();
  });

  it("should display user email in header", () => {
    const { getByText } = render(<HistoryPage />);

    const userEmail = getByText("test@example.com");
    expect(userEmail).toBeInTheDocument();
  });

  it("should render logout button", () => {
    const { getByText } = render(<HistoryPage />);

    const logoutButton = getByText("ログアウト");
    expect(logoutButton).toBeInTheDocument();
  });
});
