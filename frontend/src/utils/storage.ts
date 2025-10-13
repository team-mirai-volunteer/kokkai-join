export const STORAGE_PREFIX = "mirai-kaigi-";

export const storage = {
  prefix: STORAGE_PREFIX,
  getItem: function(key: string): string | null {
    return localStorage.getItem(this.prefix + key);
  },
  setItem: function(key: string, value: string): void {
    localStorage.setItem(this.prefix + key, value);
  },
  removeItem: function(key: string): void {
    localStorage.removeItem(this.prefix + key);
  },
  clear: function(): void {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  },
};

export type StorageType = Omit<typeof storage, "prefix">;

export function createStorage(): StorageType {
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
}

