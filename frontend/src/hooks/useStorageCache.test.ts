import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useStorageCache } from "./useStorageCache";
import { createStorage } from "../utils/storage";

describe("useStorageCache", () => {
	it("should initialize with null when no cached data exists", () => {
		const storage = createStorage();
		const { result } = renderHook(() =>
			useStorageCache<string>({ key: "test-key", storage }),
		);

		expect(result.current.data).toBeNull();
	});

	it("should load cached data from storage on mount", () => {
		const storage = createStorage();
		const cachedData = { message: "Hello, World!" };
		storage.setItem("test-key", JSON.stringify(cachedData));

		const { result } = renderHook(() =>
			useStorageCache<{ message: string }>({
				key: "test-key",
				storage,
			}),
		);

		expect(result.current.data).toEqual(cachedData);
	});

	it("should save and update data in storage", () => {
		const storage = createStorage();
		const { result } = renderHook(() =>
			useStorageCache<number>({ key: "test-key", storage }),
		);

		act(() => {
			result.current.setData(1);
		});

		expect(result.current.data).toBe(1);
		expect(storage.getItem("test-key")).toBe("1");

		act(() => {
			result.current.setData(2);
		});

		expect(result.current.data).toBe(2);
		expect(storage.getItem("test-key")).toBe("2");
	});

	it("should handle corrupted cache data gracefully", () => {
		const storage = createStorage();
		// Set invalid JSON in storage
		storage.setItem("test-key", "invalid-json{");

		const { result } = renderHook(() =>
			useStorageCache<string>({ key: "test-key", storage }),
		);

		// Should initialize with null and remove corrupted data
		expect(result.current.data).toBeNull();
		expect(storage.getItem("test-key")).toBeNull();
	});

	it("should use different keys independently", () => {
		const storage = createStorage();
		const { result: result1 } = renderHook(() =>
			useStorageCache<string>({ key: "key1", storage }),
		);
		const { result: result2 } = renderHook(() =>
			useStorageCache<string>({ key: "key2", storage }),
		);

		act(() => {
			result1.current.setData("value1");
		});

		act(() => {
			result2.current.setData("value2");
		});

		expect(result1.current.data).toBe("value1");
		expect(result2.current.data).toBe("value2");
		expect(storage.getItem("key1")).toBe(JSON.stringify("value1"));
		expect(storage.getItem("key2")).toBe(JSON.stringify("value2"));
	});

	it("should reload data when key changes", () => {
		const storage = createStorage();
		storage.setItem("key1", JSON.stringify("value1"));
		storage.setItem("key2", JSON.stringify("value2"));

		const { result, rerender } = renderHook(
			({ key }) => useStorageCache<string>({ key, storage }),
			{ initialProps: { key: "key1" } },
		);

		expect(result.current.data).toBe("value1");

		rerender({ key: "key2" });

		expect(result.current.data).toBe("value2");
	});
});
