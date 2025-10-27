import { useCallback, useState } from "react";
import { type ProviderType, SELECTABLE_PROVIDERS } from "../types/provider";
import type { StorageType } from "@/shared/utils/storage";

const storageKey = "selected-providers";

export function useProviderSelection(storage: StorageType) {
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>(
    () => {
      const saved = storage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          console.warn(
            "Failed to parse selected_providers from storage, using default.",
          );
          storage.removeItem("selected_providers");
        }
      }
      return SELECTABLE_PROVIDERS;
    },
  );

  const handleProviderToggle = useCallback(
    (providerId: ProviderType) => {
      setSelectedProviders((prev) => {
        const update = () => {
          if (prev.includes(providerId)) {
            if (prev.length === 1) {
              return prev;
            }
            return prev.filter((id) => id !== providerId);
          } else {
            return [...prev, providerId];
          }
        };

        const newState = update();

        storage.setItem(storageKey, JSON.stringify(newState));

        return newState;
      });
    },
    [storage],
  );

  return {
    selectedProviders,
    handleProviderToggle,
  };
}
