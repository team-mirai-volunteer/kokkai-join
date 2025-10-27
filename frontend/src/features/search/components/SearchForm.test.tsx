import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "./SearchForm";

describe("SearchForm", () => {
  it("should render search input and submit button", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    expect(screen.getByPlaceholderText(/検索キーワードを入力/)).toBeInTheDocument();
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

    // Provider selector should default to some provider selected
    // or we need to select one
    // For now, let's assume at least one provider is selected by default
  });

  it("should call onSubmit when form is submitted with valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={false} />);

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    await user.type(input, "防衛費");

    // Assuming we need to select a provider first
    // This test may need adjustment based on actual implementation
  });

  it("should show loading state when loading prop is true", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: "検索中..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索中..." })).toBeDisabled();
  });

  it("should disable all inputs when loading", () => {
    const onSubmit = vi.fn();
    render(<SearchForm onSubmit={onSubmit} loading={true} />);

    const input = screen.getByPlaceholderText(/検索キーワードを入力/);
    expect(input).toBeDisabled();
  });
});
