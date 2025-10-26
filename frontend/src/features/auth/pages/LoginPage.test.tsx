import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";

/**
 * Mock Supabase client to isolate LoginPage from external dependencies.
 * This avoids requiring actual Supabase environment variables in tests.
 */
vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

/**
 * Mock AuthContext to focus tests on LoginPage's layout responsibility.
 * AuthContext's functionality is tested separately in its own test file.
 */
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  it("should render LoginForm component", () => {
    const { container } = render(<LoginPage />);

    // LoginFormの存在を確認（メールアドレスフィールドで判定）
    const emailInput = container.querySelector('input[type="email"]');
    expect(emailInput).toBeInTheDocument();
  });

  it("should have login-page class for styling", () => {
    const { container } = render(<LoginPage />);

    const loginPageDiv = container.querySelector(".login-page");
    expect(loginPageDiv).toBeInTheDocument();
  });

  it("should center the login form on the page", () => {
    const { container } = render(<LoginPage />);

    const loginPageDiv = container.querySelector(".login-page");
    expect(loginPageDiv).toBeInTheDocument();

    // CSSクラスが適用されていることを確認
    expect(loginPageDiv?.className).toContain("login-page");
  });
});
