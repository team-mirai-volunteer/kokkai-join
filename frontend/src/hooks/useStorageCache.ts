import { useState, useEffect, useCallback } from "react";
import type { StorageType } from "../utils/storage";

interface UseStorageCacheOptions {
  key: string;
  storage: StorageType;
}

interface UseStorageCacheReturn<T> {
  data: T | null;
  setData: (data: T) => void;
}

export function useStorageCache<T>({
  key,
  storage
}: UseStorageCacheOptions): UseStorageCacheReturn<T> {
  const [data, setDataState] = useState<T | null>(null);

  useEffect(() => {
    try {
      const cached = storage.getItem(key);
      if (!cached) return;

      const parsedCache = JSON.parse(cached);
      setDataState(parsedCache);
    } catch (error) {
      console.error(`Failed to load cache for key "${key}":`, error);
      storage.removeItem(key);
    }
  }, [key, storage]);

  const setData = useCallback(
    (newData: T) => {
      setDataState(newData);

      try {
        storage.setItem(key, JSON.stringify(newData));
      } catch (error) {
        console.error(`Failed to save cache for key "${key}":`, error);
      }
    },
    [key, storage],
  );


  return {
    data,
    setData,
  };
}
