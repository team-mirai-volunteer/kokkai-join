import { useState, useEffect, useCallback } from "react";

interface UseLocalStorageCacheOptions {
	key: string;
}

interface UseLocalStorageCacheReturn<T> {
	data: T | null;
	setData: (data: T) => void;
	clearCache: () => void;
	isCached: boolean;
}

export function useLocalStorageCache<T>({
	key,
}: UseLocalStorageCacheOptions): UseLocalStorageCacheReturn<T> {
	const [data, setDataState] = useState<T | null>(null);
	const [isCached, setIsCached] = useState(false);

	// Load cache on mount
	useEffect(() => {
		const loadCache = () => {
			try {
				const cached = localStorage.getItem(key);
				if (!cached) return;

				const parsedCache = JSON.parse(cached);
				setDataState(parsedCache);
				setIsCached(true);
			} catch (error) {
				console.error(`Failed to load cache for key "${key}":`, error);
				localStorage.removeItem(key);
			}
		};

		loadCache();
	}, [key]);

	// Save data to cache
	const setData = useCallback(
		(newData: T) => {
			setDataState(newData);
			setIsCached(false); // New data is not from cache

			try {
				localStorage.setItem(key, JSON.stringify(newData));
			} catch (error) {
				console.error(`Failed to save cache for key "${key}":`, error);
			}
		},
		[key],
	);

	// Clear cache
	const clearCache = useCallback(() => {
		setDataState(null);
		setIsCached(false);
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(`Failed to clear cache for key "${key}":`, error);
		}
	}, [key]);

	return {
		data,
		setData,
		clearCache,
		isCached,
	};
}
