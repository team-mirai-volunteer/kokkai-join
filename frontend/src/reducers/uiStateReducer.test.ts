import { describe, expect, it } from "vitest";
import type { UIAction, UIState } from "./uiStateReducer";
import { initialUIState, uiStateReducer } from "./uiStateReducer";

describe("uiStateReducer", () => {
  it("should return initial state", () => {
    expect(initialUIState).toEqual({
      loading: false,
      error: null,
      isDropdownOpen: false,
    });
  });

  it("should handle SET_LOADING action", () => {
    const state: UIState = { ...initialUIState };
    const action: UIAction = { type: "SET_LOADING", payload: true };

    const newState = uiStateReducer(state, action);

    expect(newState.loading).toBe(true);
    expect(newState.error).toBe(null);
    expect(newState.isDropdownOpen).toBe(false);
  });

  it("should handle SET_ERROR action", () => {
    const state: UIState = { ...initialUIState };
    const action: UIAction = { type: "SET_ERROR", payload: "Test error" };

    const newState = uiStateReducer(state, action);

    expect(newState.loading).toBe(false);
    expect(newState.error).toBe("Test error");
    expect(newState.isDropdownOpen).toBe(false);
  });

  it("should handle CLEAR_ERROR action", () => {
    const state: UIState = {
      loading: false,
      error: "Previous error",
      isDropdownOpen: false,
    };
    const action: UIAction = { type: "CLEAR_ERROR" };

    const newState = uiStateReducer(state, action);

    expect(newState.error).toBe(null);
  });

  it("should handle TOGGLE_DROPDOWN action", () => {
    const state: UIState = { ...initialUIState };
    const action: UIAction = { type: "TOGGLE_DROPDOWN", payload: true };

    const newState = uiStateReducer(state, action);

    expect(newState.isDropdownOpen).toBe(true);
  });

  it("should handle CLOSE_DROPDOWN action", () => {
    const state: UIState = {
      loading: false,
      error: null,
      isDropdownOpen: true,
    };
    const action: UIAction = { type: "CLOSE_DROPDOWN" };

    const newState = uiStateReducer(state, action);

    expect(newState.isDropdownOpen).toBe(false);
  });

  it("should handle SEARCH_START action", () => {
    const state: UIState = {
      loading: false,
      error: "Previous error",
      isDropdownOpen: true,
    };
    const action: UIAction = { type: "SEARCH_START" };

    const newState = uiStateReducer(state, action);

    expect(newState.loading).toBe(true);
    expect(newState.error).toBe(null);
  });

  it("should handle SEARCH_SUCCESS action", () => {
    const state: UIState = {
      loading: true,
      error: null,
      isDropdownOpen: false,
    };
    const action: UIAction = { type: "SEARCH_SUCCESS" };

    const newState = uiStateReducer(state, action);

    expect(newState.loading).toBe(false);
    expect(newState.error).toBe(null);
  });

  it("should handle SEARCH_ERROR action", () => {
    const state: UIState = {
      loading: true,
      error: null,
      isDropdownOpen: false,
    };
    const action: UIAction = { type: "SEARCH_ERROR", payload: "Search failed" };

    const newState = uiStateReducer(state, action);

    expect(newState.loading).toBe(false);
    expect(newState.error).toBe("Search failed");
  });

  it("should maintain immutability", () => {
    const state: UIState = { ...initialUIState };
    const action: UIAction = { type: "SET_LOADING", payload: true };

    const newState = uiStateReducer(state, action);

    expect(newState).not.toBe(state);
    expect(state.loading).toBe(false); // Original state unchanged
    expect(newState.loading).toBe(true);
  });

  it("should handle multiple state transitions", () => {
    let state: UIState = { ...initialUIState };

    // Start search
    state = uiStateReducer(state, { type: "SEARCH_START" });
    expect(state.loading).toBe(true);
    expect(state.error).toBe(null);

    // Search fails
    state = uiStateReducer(state, {
      type: "SEARCH_ERROR",
      payload: "Network error",
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe("Network error");

    // Clear error
    state = uiStateReducer(state, { type: "CLEAR_ERROR" });
    expect(state.error).toBe(null);

    // Open dropdown
    state = uiStateReducer(state, { type: "TOGGLE_DROPDOWN", payload: true });
    expect(state.isDropdownOpen).toBe(true);

    // Close dropdown
    state = uiStateReducer(state, { type: "CLOSE_DROPDOWN" });
    expect(state.isDropdownOpen).toBe(false);
  });
});
