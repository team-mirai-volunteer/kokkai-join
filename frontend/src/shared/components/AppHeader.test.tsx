import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader";

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../features/auth/contexts/AuthContext", () => ({
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
      </MemoryRouter>
    );

    expect(screen.getByText("みらい議会 DeepResearch")).toBeInTheDocument();
  });

  it("should render user email", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>
    );

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("should render navigation buttons", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const buttonTexts = Array.from(buttons || []).map((btn) => btn.textContent);

    expect(buttonTexts).toContain("検索");
    expect(buttonTexts).toContain("履歴");
    expect(buttonTexts).toContain("ログアウト");
  });

  it("should highlight search button when on search page", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const searchButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "検索"
    );

    expect(searchButton).toHaveClass("submit-button");
  });

  it("should highlight history button when on history page", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/histories"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const historyButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "履歴"
    );

    expect(historyButton).toHaveClass("submit-button");
  });

  it("should navigate to search page when search button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/histories"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const searchButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "検索"
    ) as HTMLButtonElement;

    await user.click(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should navigate to history page when history button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const historyButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "履歴"
    ) as HTMLButtonElement;

    await user.click(historyButton);

    expect(mockNavigate).toHaveBeenCalledWith("/histories");
  });

  it("should call signOut when logout button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    await user.click(logoutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("should display back button on history detail page", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/histories/test-id"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: /履歴一覧に戻る/ });
    expect(backButton).toBeInTheDocument();
  });

  it("should navigate to /histories when back button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/histories/test-id"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: /履歴一覧に戻る/ });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/histories");
  });

  it("should not display navigation buttons on detail page", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/histories/test-id"]}>
        <AppHeader />
      </MemoryRouter>
    );

    const authHeader = container.querySelector(".auth-header");
    const buttons = authHeader?.querySelectorAll("button");
    const searchButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "検索"
    );
    const historyButton = Array.from(buttons || []).find(
      (btn) => btn.textContent === "履歴"
    );

    expect(searchButton).toBeUndefined();
    expect(historyButton).toBeUndefined();
  });
});
