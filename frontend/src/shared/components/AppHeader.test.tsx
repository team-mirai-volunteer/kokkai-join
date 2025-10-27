import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppHeader } from "./AppHeader";

const mockSignOut = vi.fn();

vi.mock("@/features/auth/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    signOut: mockSignOut,
  }),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render application title", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>,
    );

    expect(screen.getByText("みらい議会 DeepResearch")).toBeInTheDocument();
  });

  it("should render user email", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>,
    );

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  describe("Navigation on search page", () => {
    it("should show search and history buttons on search page", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <AppHeader />
        </MemoryRouter>,
      );

      expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "履歴" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "ログアウト" }),
      ).toBeInTheDocument();
    });

    it("should navigate to history page when history button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<AppHeader />} />
            <Route
              path="/histories"
              element={
                <div>
                  <AppHeader />
                  <div>History List Page</div>
                </div>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const historyButton = screen.getByRole("button", { name: "履歴" });
      await user.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText("History List Page")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation on history list page", () => {
    it("should show search and history buttons on history page", () => {
      render(
        <MemoryRouter initialEntries={["/histories"]}>
          <AppHeader />
        </MemoryRouter>,
      );

      expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "履歴" })).toBeInTheDocument();
    });

    it("should navigate to search page when search button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/histories"]}>
          <Routes>
            <Route
              path="/histories"
              element={
                <div>
                  <AppHeader />
                  <div>History Page</div>
                </div>
              }
            />
            <Route
              path="/"
              element={
                <div>
                  <AppHeader />
                  <div>Search Page</div>
                </div>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const searchButton = screen.getByRole("button", { name: "検索" });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Search Page")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation on history detail page", () => {
    it("should show back button on history detail page", () => {
      render(
        <MemoryRouter initialEntries={["/histories/test-id-123"]}>
          <AppHeader />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("button", { name: "← 履歴一覧に戻る" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "検索" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "履歴" }),
      ).not.toBeInTheDocument();
    });

    it("should navigate to history list when back button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/histories/test-id-123"]}>
          <Routes>
            <Route
              path="/histories/:id"
              element={
                <div>
                  <AppHeader />
                  <div>Detail Page</div>
                </div>
              }
            />
            <Route
              path="/histories"
              element={
                <div>
                  <AppHeader />
                  <div>History List Page</div>
                </div>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const backButton = screen.getByRole("button", {
        name: "← 履歴一覧に戻る",
      });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText("History List Page")).toBeInTheDocument();
      });
    });
  });

  describe("Logout", () => {
    it("should call signOut when logout button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/"]}>
          <AppHeader />
        </MemoryRouter>,
      );

      const logoutButton = screen.getByRole("button", { name: "ログアウト" });
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
