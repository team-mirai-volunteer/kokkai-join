import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuestLayout from "./GuestLayout";

// Mock react-router-dom components
vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Child Content</div>,
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate">Redirect to {to}</div>
  ),
}));

/**
 * Mock Supabase client to isolate GuestLayout from external dependencies.
 */
vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Create a mock function for useAuth
const mockUseAuth = vi.fn();

/**
 * Mock AuthContext with configurable useAuth return value.
 */
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("GuestLayout", () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  describe("when user is not authenticated", () => {
    it("should render children via Outlet", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { getByTestId } = render(<GuestLayout />);

      expect(getByTestId("outlet")).toBeInTheDocument();
    });
  });

  describe("when user is authenticated", () => {
    it("should redirect to /", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        loading: false,
      });

      const { getByTestId } = render(<GuestLayout />);

      const navigate = getByTestId("navigate");
      expect(navigate).toBeInTheDocument();
      expect(navigate.textContent).toContain("Redirect to /");
    });
  });

  describe("when loading", () => {
    it("should display loading message", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { getByText } = render(<GuestLayout />);

      expect(getByText("認証確認中...")).toBeInTheDocument();
    });

    it("should apply loading class", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { container } = render(<GuestLayout />);

      const loadingDiv = container.querySelector(".loading");
      expect(loadingDiv).toBeInTheDocument();
    });
  });
});
