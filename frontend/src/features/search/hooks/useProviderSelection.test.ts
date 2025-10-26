import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderID, SELECTABLE_PROVIDERS } from "../types/provider";
import { createStorage } from "../../../shared/utils/storage";
import { useProviderSelection } from "./useProviderSelection";

describe("useProviderSelection", () => {
  it("should initialize with all providers selected by default", () => {
    const storage = createStorage();
    const { result } = renderHook(() => useProviderSelection(storage));

    expect(result.current.selectedProviders).toEqual([...SELECTABLE_PROVIDERS]);
  });

  it("should restore saved providers from storage on mount", () => {
    const storage = createStorage();
    const savedProviders = [ProviderID.WebSearch, ProviderID.GovMeetingRag];
    storage.setItem("selected-providers", JSON.stringify(savedProviders));

    const { result } = renderHook(() => useProviderSelection(storage));

    expect(result.current.selectedProviders).toEqual(savedProviders);
  });

  it("should toggle provider selection on and off", () => {
    const storage = createStorage();
    const { result } = renderHook(() => useProviderSelection(storage));

    // Initially all providers are selected
    expect(result.current.selectedProviders).toContain(ProviderID.KokkaiDB);

    // Deselect a provider
    act(() => {
      result.current.handleProviderToggle(ProviderID.KokkaiDB);
    });

    expect(result.current.selectedProviders).not.toContain(ProviderID.KokkaiDB);

    // Re-select the provider
    act(() => {
      result.current.handleProviderToggle(ProviderID.KokkaiDB);
    });

    expect(result.current.selectedProviders).toContain(ProviderID.KokkaiDB);
  });

  it("should prevent deselecting the last provider", () => {
    const storage = createStorage();
    storage.setItem(
      "selected-providers",
      JSON.stringify([ProviderID.WebSearch]),
    );

    const { result } = renderHook(() => useProviderSelection(storage));

    // Try to deselect the only selected provider
    act(() => {
      result.current.handleProviderToggle(ProviderID.WebSearch);
    });

    // Should still be selected
    expect(result.current.selectedProviders).toEqual([ProviderID.WebSearch]);
  });

  it("should persist selection changes to storage", () => {
    const storage = createStorage();
    const { result } = renderHook(() => useProviderSelection(storage));

    act(() => {
      result.current.handleProviderToggle(ProviderID.KokkaiDB);
    });

    const saved = storage.getItem("selected-providers");
    expect(saved).toBeTruthy();

    const parsedProviders = JSON.parse(saved!);
    expect(parsedProviders).not.toContain(ProviderID.KokkaiDB);
    expect(parsedProviders).toContain(ProviderID.WebSearch);
    expect(parsedProviders).toContain(ProviderID.GovMeetingRag);
  });

  it("should handle corrupted storage data gracefully", () => {
    const storage = createStorage();
    storage.setItem("selected-providers", "invalid-json{");

    const { result } = renderHook(() => useProviderSelection(storage));

    // Should fall back to default (all providers)
    expect(result.current.selectedProviders).toEqual([...SELECTABLE_PROVIDERS]);
  });
});
