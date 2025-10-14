export interface UIState {
  loading: boolean;
  error: string | null;
  isDropdownOpen: boolean;
}

export type UIAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "TOGGLE_DROPDOWN"; payload: boolean }
  | { type: "CLOSE_DROPDOWN" }
  | { type: "SEARCH_START" }
  | { type: "SEARCH_SUCCESS" }
  | { type: "SEARCH_ERROR"; payload: string };

export const initialUIState: UIState = {
  loading: false,
  error: null,
  isDropdownOpen: false,
};

export function uiStateReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    case "TOGGLE_DROPDOWN":
      return {
        ...state,
        isDropdownOpen: action.payload,
      };

    case "CLOSE_DROPDOWN":
      return {
        ...state,
        isDropdownOpen: false,
      };

    case "SEARCH_START":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "SEARCH_SUCCESS":
      return {
        ...state,
        loading: false,
      };

    case "SEARCH_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
