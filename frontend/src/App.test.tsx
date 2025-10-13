import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "@testing-library/jest-dom";
import App from "./App";
import { ProviderID } from "./types/provider";
import { STORAGE_PREFIX } from "./utils/storage";

// Register happy-dom before all tests
beforeAll(() => {
  GlobalRegistrator.register();
});

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

describe("App - Provider Selection", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Cleanup rendered components after each test
    cleanup();
  });

  it("should render provider checkboxes", () => {
    const { getByRole, getByLabelText } = render(<App />);

    const providerGroup = getByRole("group", { name: /provider selection/i });
    expect(providerGroup).toBeInTheDocument();

    const kokkaiCheckbox = getByLabelText("国会会議録");
    const webCheckbox = getByLabelText("Web");
    const govCheckbox = getByLabelText("各省庁会議録");

    expect(kokkaiCheckbox).toBeInTheDocument();
    expect(webCheckbox).toBeInTheDocument();
    expect(govCheckbox).toBeInTheDocument();
  });

  it("should have all providers selected by default", () => {
    const { getByLabelText } = render(<App />);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;
    const webCheckbox = getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = getByLabelText("各省庁会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(true);
    expect(webCheckbox.checked).toBe(true);
    expect(govCheckbox.checked).toBe(true);
  });

  it("should toggle provider selection", () => {
    const { getByLabelText } = render(<App />);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(true);

    fireEvent.click(kokkaiCheckbox);
    expect(kokkaiCheckbox.checked).toBe(false);

    fireEvent.click(kokkaiCheckbox);
    expect(kokkaiCheckbox.checked).toBe(true);
  });

  it("should not allow unchecking the last provider", () => {
    const { getByLabelText } = render(<App />);

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

    const { getByLabelText } = render(<App />);

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

    const { getByLabelText } = render(<App />);

    const kokkaiCheckbox = getByLabelText("国会会議録") as HTMLInputElement;
    const webCheckbox = getByLabelText("Web") as HTMLInputElement;
    const govCheckbox = getByLabelText("各省庁会議録") as HTMLInputElement;

    expect(kokkaiCheckbox.checked).toBe(false);
    expect(webCheckbox.checked).toBe(true);
    expect(govCheckbox.checked).toBe(false);
  });
});
