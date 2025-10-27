import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "./SearchForm";

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

describe("SearchForm", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("should render search input and submit button", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    expect(
      screen.getByPlaceholderText(/検索キーワードを入力/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
  });

  it("should disable submit button when query is empty", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    const submitButton = screen.getByRole("button", { name: "検索" });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when query is filled and provider is selected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "防衛費");

    // Default providers are selected, so button should be enabled
    const submitButton = screen.getByRole("button", { name: "検索" });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should call onSubmit when form is submitted with valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "防衛費");

    const submitButton = screen.getByRole("button", { name: "検索" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "防衛費",
          providers: expect.any(Array),
        }),
      );
    });
  });

  it("should show loading state when loading prop is true", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={true} />);

    expect(
      screen.getByRole("button", { name: "検索中..." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索中..." })).toBeDisabled();
  });

  it("should disable all inputs when loading", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={true} />);

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    expect(input).toBeDisabled();
  });

  it("should display error message when error prop is provided", () => {
    const onSubmit = vi.fn();
    const errorMessage = "検索に失敗しました";
    render(
      <SearchForm onSubmit={onSubmit} loading={false} error={errorMessage} />,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
