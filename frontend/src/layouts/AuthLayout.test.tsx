import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthLayout from "./AuthLayout";

// Mock react-router-dom components
vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Child Content</div>,
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate">Redirect to {to}</div>
  ),
}));

/**
 * Mock Supabase client to isolate AuthLayout from external dependencies.
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

describe("AuthLayout", () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  describe("when user is authenticated", () => {
    it("should render children via Outlet", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        loading: false,
      });

      const { getByTestId } = render(<AuthLayout />);

      expect(getByTestId("outlet")).toBeInTheDocument();
    });

    it("should apply auth-layout class", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        loading: false,
      });

      const { container } = render(<AuthLayout />);

      const authLayoutDiv = container.querySelector(".auth-layout");
      expect(authLayoutDiv).toBeInTheDocument();
    });
  });

  describe("when user is not authenticated", () => {
    it("should redirect to /login", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { getByTestId } = render(<AuthLayout />);

      const navigate = getByTestId("navigate");
      expect(navigate).toBeInTheDocument();
      expect(navigate.textContent).toContain("/login");
    });
  });

  describe("when loading", () => {
    it("should display loading message", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { getByText } = render(<AuthLayout />);

      expect(getByText("認証確認中...")).toBeInTheDocument();
    });

    it("should apply loading class", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { container } = render(<AuthLayout />);

      const loadingDiv = container.querySelector(".loading");
      expect(loadingDiv).toBeInTheDocument();
    });
  });
});
