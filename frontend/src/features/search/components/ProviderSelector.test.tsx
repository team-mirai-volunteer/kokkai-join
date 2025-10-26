import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderID } from "../types/provider";
import { ProviderSelector } from "./ProviderSelector";

describe("ProviderSelector", () => {
  const mockOnToggle = vi.fn();

  it("should render dropdown button", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={false}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    const button = screen.getByRole("button", { name: /検索対象/ });
    expect(button).toBeDefined();
  });

  it("should display selected provider count", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB, ProviderID.WebSearch]}
        onToggle={mockOnToggle}
        isOpen={false}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByText("(2)")).toBeDefined();
  });

  it("should show dropdown menu when open", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    const menu = screen.getByRole("menu");
    expect(menu).toBeDefined();
  });

  it("should not show dropdown menu when closed", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={false}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("should render all provider options", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByText("国会会議録")).toBeDefined();
    expect(screen.getByText("Web")).toBeDefined();
    expect(screen.getByText("各省庁会議録")).toBeDefined();
  });

  it("should call onToggle when checkbox is clicked", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    const checkbox = screen.getByLabelText("Web");
    act(() => {
      checkbox.click();
    });

    expect(mockOnToggle).toHaveBeenCalledWith(ProviderID.WebSearch);
  });

  it("should show checked state for selected providers", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB, ProviderID.WebSearch]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    const kokkaiCheckbox = screen.getByLabelText(
      "国会会議録",
    ) as HTMLInputElement;
    const webCheckbox = screen.getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = screen.getByLabelText(
      "各省庁会議録",
    ) as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(true);
    expect(webCheckbox.checked).toBe(true);
    expect(govCheckbox.checked).toBe(false);
  });

  it("should disable button when disabled prop is true", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={false}
        onOpenChange={vi.fn()}
        disabled={true}
      />,
    );

    const button = screen.getByRole("button", { name: /検索対象/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("should disable checkboxes when disabled prop is true", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={true}
      />,
    );

    const checkbox = screen.getByLabelText("Web") as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it("should call onOpenChange when button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        disabled={false}
      />,
    );

    const button = screen.getByRole("button", { name: /検索対象/ });
    act(() => {
      button.click();
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });

  it("should have proper aria attributes", () => {
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={vi.fn()}
        disabled={false}
      />,
    );

    const button = screen.getByRole("button", { name: /検索対象/ });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-haspopup")).toBe("true");
  });

  it("should close dropdown when clicking outside", () => {
    const mockOnOpenChange = vi.fn();
    render(
      <div>
        <ProviderSelector
          selectedProviders={[ProviderID.KokkaiDB]}
          onToggle={mockOnToggle}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          disabled={false}
        />
        <div data-testid="outside">Outside element</div>
      </div>,
    );

    const outsideElement = screen.getByTestId("outside");
    act(() => {
      // mousedownイベントを発火
      const event = new MouseEvent("mousedown", { bubbles: true });
      outsideElement.dispatchEvent(event);
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should not close dropdown when clicking inside", () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ProviderSelector
        selectedProviders={[ProviderID.KokkaiDB]}
        onToggle={mockOnToggle}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        disabled={false}
      />,
    );

    const menu = screen.getByRole("menu");
    act(() => {
      menu.click();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });
});
