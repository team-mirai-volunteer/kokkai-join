import { useEffect, useRef } from "react";
import type { ProviderType } from "../types/provider";
import { PROVIDER_LABELS, SELECTABLE_PROVIDERS } from "../types/provider";

export interface ProviderSelectorProps {
  selectedProviders: ProviderType[];
  onToggle: (providerId: ProviderType) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
}

export function ProviderSelector({
  selectedProviders,
  onToggle,
  isOpen,
  onOpenChange,
  disabled,
}: ProviderSelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  return (
    <div className="provider-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-button"
        onClick={() => onOpenChange(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        検索対象
        <span className="provider-count">({selectedProviders.length})</span>
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu" role="menu">
          {SELECTABLE_PROVIDERS.map((providerId) => (
            <div key={providerId} className="dropdown-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(providerId)}
                  onChange={() => onToggle(providerId)}
                  disabled={disabled}
                />
                <span>{PROVIDER_LABELS[providerId]}</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
