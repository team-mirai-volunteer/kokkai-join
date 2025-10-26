import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAX_FILE_COUNT } from "../types/file";
import { useFileUpload } from "./useFileUpload";

describe("useFileUpload", () => {
  it("should initialize with empty files and no error", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.files).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should add files with correct encoding and metadata", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["content2"], "test2.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([file1, file2]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(2);
    });

    // Base64 encoding verification
    expect(result.current.files[0].content).toBeDefined();
    expect(result.current.files[0].content).not.toBe("");
    expect(result.current.files[1].content).toBeDefined();

    // Metadata verification
    expect(result.current.files[0].name).toBe("test1.pdf");
    expect(result.current.files[0].size).toBe(file1.size);
    expect(result.current.files[0].type).toBe("application/pdf");

    expect(result.current.files[1].name).toBe("test2.pdf");
    expect(result.current.files[1].size).toBe(file2.size);
    expect(result.current.files[1].type).toBe("application/pdf");

    expect(result.current.error).toBeNull();
  });

  it("should prevent adding duplicate filenames", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "duplicate.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["content2"], "duplicate.pdf", {
      type: "application/pdf",
    });

    // Add first file successfully
    await act(async () => {
      await result.current.addFiles([file1]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    expect(result.current.error).toBeNull();

    // Try to add duplicate - should fail without validation or adding
    await act(async () => {
      await result.current.addFiles([file2]);
    });

    // File should not be added
    expect(result.current.files).toHaveLength(1);
    // Error should be set
    expect(result.current.error).toBe(
      "次のファイルは既にアップロードされています: duplicate.pdf",
    );
    // Original file should remain unchanged
    expect(result.current.files[0].name).toBe("duplicate.pdf");
  });

  it("should treat filenames as case-sensitive", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["content2"], "TEST.pdf", {
      type: "application/pdf",
    });
    const file3 = new File(["content3"], "Test.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([file1, file2, file3]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(3);
    });

    expect(result.current.files[0].name).toBe("test.pdf");
    expect(result.current.files[1].name).toBe("TEST.pdf");
    expect(result.current.files[2].name).toBe("Test.pdf");
    expect(result.current.error).toBeNull();
  });

  it("should handle validation errors", async () => {
    const { result } = renderHook(() => useFileUpload());

    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([largeFile]);
    });

    expect(result.current.files).toHaveLength(0);
    expect(result.current.error).toContain("large.pdf");
  });

  it("should handle encoding errors", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });

    // Mock FileReader to simulate error
    const originalFileReader = global.FileReader;
    const mockError = new Error("Failed to read file");

    try {
      global.FileReader = vi.fn().mockImplementation(function (this: {
        result: string | ArrayBuffer | null;
        error: DOMException | null;
        onload: ((ev: ProgressEvent<FileReader>) => unknown) | null;
        onerror: ((ev: ProgressEvent<FileReader>) => unknown) | null;
        readAsDataURL: (blob: Blob) => void;
      }) {
        this.result = null;
        this.error = mockError as unknown as DOMException;
        this.onload = null;
        this.onerror = null;

        this.readAsDataURL = vi.fn(function (this: {
          result: string | ArrayBuffer | null;
          error: DOMException | null;
          onload: ((ev: ProgressEvent<FileReader>) => unknown) | null;
          onerror: ((ev: ProgressEvent<FileReader>) => unknown) | null;
          readAsDataURL: (blob: Blob) => void;
        }) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({} as ProgressEvent<FileReader>);
            }
          }, 0);
        });

        return this;
      }) as unknown as typeof FileReader;

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.error).toBe("Failed to read file");
    } finally {
      // Always restore original FileReader
      global.FileReader = originalFileReader;
    }
  });

  it("should skip validation for duplicate files", async () => {
    const { result } = renderHook(() => useFileUpload());

    const validFile = new File(["content"], "valid.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([validFile]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    // Add duplicate file that exceeds size limit
    // Duplicate check should happen before validation
    const largeDuplicate = new File(
      ["x".repeat(11 * 1024 * 1024)],
      "valid.pdf",
      { type: "application/pdf" },
    );

    await act(async () => {
      await result.current.addFiles([largeDuplicate]);
    });

    // Should show duplicate error, not size validation error
    expect(result.current.files).toHaveLength(1);
    expect(result.current.error).toContain("既にアップロード");
    expect(result.current.error).not.toContain("10MB");
  });

  it("should enforce MAX_FILE_COUNT limit", async () => {
    const { result } = renderHook(() => useFileUpload());

    // Add MAX_FILE_COUNT files
    const files = Array.from(
      { length: MAX_FILE_COUNT },
      (_, i) =>
        new File(["content"], `test${i}.pdf`, { type: "application/pdf" }),
    );

    await act(async () => {
      await result.current.addFiles(files);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(MAX_FILE_COUNT);
    });

    expect(result.current.error).toBeNull();

    // Try to add one more file
    const extraFile = new File(["content"], "extra.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([extraFile]);
    });

    // Should still have MAX_FILE_COUNT files and show error
    expect(result.current.files).toHaveLength(MAX_FILE_COUNT);
    expect(result.current.error).toContain("10個まで");
  });

  it("should remove file by filename", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["content2"], "test2.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([file1, file2]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(2);
    });

    act(() => {
      result.current.removeFile("test1.pdf");
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe("test2.pdf");
    expect(result.current.error).toBeNull();
  });

  it("should clear all files", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["content2"], "test2.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([file1, file2]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(2);
    });

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.files).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("should clear error when removing a file", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const duplicate = new File(["content2"], "test1.pdf", {
      type: "application/pdf",
    });

    // Add initial file
    await act(async () => {
      await result.current.addFiles([file1]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    // Trigger error with duplicate
    await act(async () => {
      await result.current.addFiles([duplicate]);
    });

    expect(result.current.error).not.toBeNull();

    // Error should clear when removing a file
    act(() => {
      result.current.removeFile("test1.pdf");
    });

    expect(result.current.error).toBeNull();
  });

  it("should clear error when clearing all files", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const duplicate = new File(["content2"], "test1.pdf", {
      type: "application/pdf",
    });

    // Add initial file
    await act(async () => {
      await result.current.addFiles([file1]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    // Trigger error with duplicate
    await act(async () => {
      await result.current.addFiles([duplicate]);
    });

    expect(result.current.error).not.toBeNull();

    // Error should clear when clearing all files
    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.error).toBeNull();
  });

  it("should clear error when successfully adding new file", async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["content1"], "test1.pdf", {
      type: "application/pdf",
    });
    const duplicate = new File(["content2"], "test1.pdf", {
      type: "application/pdf",
    });

    // Add initial file
    await act(async () => {
      await result.current.addFiles([file1]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    // Trigger error with duplicate
    await act(async () => {
      await result.current.addFiles([duplicate]);
    });

    expect(result.current.error).not.toBeNull();

    // Error should clear when successfully adding a different file
    const file2 = new File(["content3"], "test2.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.addFiles([file2]);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(2);
    });

    expect(result.current.error).toBeNull();
  });
});
