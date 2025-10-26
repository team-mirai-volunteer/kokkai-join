import { describe, expect, it } from "vitest";
import { MAX_FILE_COUNT, MAX_FILE_SIZE } from "../../features/search/types/file";
import { validateFile, validateFiles } from "./fileValidation";

describe("validateFile", () => {
  it("should return valid for a PDF file within size limit", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid for file exceeding size limit", () => {
    const largeContent = new ArrayBuffer(MAX_FILE_SIZE + 1);
    const file = new File([largeContent], "large.pdf", {
      type: "application/pdf",
    });
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error?.reason).toBe("size");
    expect(result.error?.message).toContain("10MB");
  });

  it("should return invalid for unsupported file type", () => {
    const file = new File(["content"], "test.exe", {
      type: "application/x-msdownload",
    });
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error?.reason).toBe("type");
    expect(result.error?.message).toContain("対応していない");
  });
});

describe("validateFiles", () => {
  it("should return all files when all are valid and within count limit", () => {
    const files = [
      new File(["content1"], "test1.pdf", { type: "application/pdf" }),
      new File(["content2"], "test2.pdf", { type: "application/pdf" }),
    ];
    const result = validateFiles(files, 0);
    expect(result.validFiles).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for invalid files", () => {
    const files = [
      new File(["content"], "test.pdf", { type: "application/pdf" }),
      new File(["content"], "test.exe", { type: "application/x-msdownload" }),
    ];
    const result = validateFiles(files, 0);
    expect(result.validFiles).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toBe("type");
  });

  it("should return count error when exceeding MAX_FILE_COUNT", () => {
    const files = Array.from(
      { length: MAX_FILE_COUNT + 1 },
      (_, i) =>
        new File(["content"], `test${i}.pdf`, { type: "application/pdf" }),
    );
    const result = validateFiles(files, 0);
    expect(result.validFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toBe("count");
    expect(result.errors[0].message).toContain("10個まで");
  });

  it("should consider existing file count when validating", () => {
    const files = Array.from(
      { length: 5 },
      (_, i) =>
        new File(["content"], `test${i}.pdf`, { type: "application/pdf" }),
    );
    const existingCount = 6;
    const result = validateFiles(files, existingCount);
    expect(result.validFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toBe("count");
  });

  it("should allow adding files when total count equals MAX_FILE_COUNT", () => {
    const files = [
      new File(["content"], "test.pdf", { type: "application/pdf" }),
    ];
    const existingCount = MAX_FILE_COUNT - 1;
    const result = validateFiles(files, existingCount);
    expect(result.validFiles).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
