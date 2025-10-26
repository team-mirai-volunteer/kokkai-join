import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { ProviderID } from "./features/search/types/provider";
import { STORAGE_PREFIX } from "./shared/utils/storage";

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

// Mock AuthContext to provide a logged-in user immediately
vi.mock("./features/auth/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
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

// Helper function to render App
const renderApp = (): ReturnType<typeof render> => {
  return render(<App />);
};

describe("App - Provider Selection", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Mock fetch
    global.fetch = vi.fn();
  });

  it("should render provider dropdown button", () => {
    const { getByRole } = renderApp();

    const dropdownButton = getByRole("button", { name: /検索対象/ });
    expect(dropdownButton).toBeInTheDocument();
    expect(dropdownButton).toHaveTextContent("(3)");
  });

  it("should have all providers selected by default", () => {
    const { getByRole, getByLabelText } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;
    const webCheckbox = getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = getByLabelText("各省庁会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(true);
    expect(webCheckbox.checked).toBe(true);
    expect(govCheckbox.checked).toBe(true);
  });

  it("should toggle provider selection", () => {
    const { getByRole, getByLabelText } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(true);

    fireEvent.click(kokkaiCheckbox);
    expect(kokkaiCheckbox.checked).toBe(false);

    fireEvent.click(kokkaiCheckbox);
    expect(kokkaiCheckbox.checked).toBe(true);
  });

  it("should not allow unchecking the last provider", () => {
    const { getByRole, getByLabelText } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;
    const webCheckbox = getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = getByLabelText("各省庁会議録") as HTMLInputElement;

    // Uncheck two providers
    fireEvent.click(kokkaiCheckbox);
    fireEvent.click(webCheckbox);

    // Try to uncheck the last one
    fireEvent.click(govCheckbox);

    // Should still be checked
    expect(govCheckbox.checked).toBe(true);
  });

  it("should persist provider selections in localStorage", async () => {
    // Ensure clean localStorage
    localStorageMock.clear();

    const { getByRole, getByLabelText } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    const webCheckbox = getByLabelText("Web") as HTMLInputElement;

    // Uncheck Web
    if (webCheckbox.checked) {
      fireEvent.click(webCheckbox);
    }

    // Wait for useEffect to update localStorage (with prefix)
    await waitFor(() => {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}selected-providers`);
      expect(saved).toBeTruthy();
      const providers = JSON.parse(saved!);
      expect(providers).not.toContain(ProviderID.WebSearch);
    });
  });

  it("should restore provider selections from localStorage on mount", () => {
    localStorage.setItem(
      `${STORAGE_PREFIX}selected-providers`,
      JSON.stringify([ProviderID.WebSearch]),
    );

    const { getByRole, getByLabelText } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;
    const webCheckbox = getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = getByLabelText("各省庁会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(false);
    expect(webCheckbox.checked).toBe(true);
    expect(govCheckbox.checked).toBe(false);
  });

  it("should close dropdown when clicking outside", () => {
    const { getByRole, queryByRole } = renderApp();

    // Open dropdown
    const dropdownButton = getByRole("button", { name: /検索対象/ });
    fireEvent.click(dropdownButton);

    // Verify dropdown is open
    const dropdownMenu = getByRole("menu");
    expect(dropdownMenu).toBeInTheDocument();

    // Click outside (on document body)
    fireEvent.mouseDown(document.body);

    // Verify dropdown is closed
    expect(queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should disable submit button when query is empty", () => {
    const { container } = renderApp();

    const submitButton = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when query is entered", async () => {
    const { container, getByRole } = renderApp();

    const queryInput = getByRole("textbox");

    const getSubmitButton = () =>
      container.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(getSubmitButton()).toBeDisabled();

    // Enter query
    fireEvent.change(queryInput, { target: { value: "test query" } });

    // Wait for React to update
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("should disable submit button when query becomes empty after input", async () => {
    const { container, getByRole } = renderApp();

    const queryInput = getByRole("textbox");

    const getSubmitButton = () =>
      container.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Enter query
    fireEvent.change(queryInput, { target: { value: "test query" } });

    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });

    // Clear query
    fireEvent.change(queryInput, { target: { value: "" } });

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });
  });

  it("should disable submit button when query is only whitespace", async () => {
    const { container, getByRole } = renderApp();

    const queryInput = getByRole("textbox");

    const getSubmitButton = () =>
      container.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Enter whitespace only
    fireEvent.change(queryInput, { target: { value: "   " } });

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });
  });
});
