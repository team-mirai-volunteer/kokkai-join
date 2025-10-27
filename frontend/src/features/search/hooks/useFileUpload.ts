import { useCallback, useState } from "react";
import type { UploadedFile } from "../types/file";
import { validateFiles } from "@/shared/utils/fileValidation";

export interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (newFiles: File[]) => Promise<void>;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
  error: string | null;
}

async function encodeFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Extract base64 content from data URL (remove "data:mime/type;base64," prefix)
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      // Check for duplicate filenames first
      const existingNames = new Set(files.map((f) => f.name));
      const duplicates = newFiles.filter((file) =>
        existingNames.has(file.name),
      );

      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map((f) => f.name).join(", ");
        setError(
          `次のファイルは既にアップロードされています: ${duplicateNames}`,
        );
        return;
      }

      // Validate only non-duplicate files
      const validation = validateFiles(newFiles, files.length);

      if (validation.errors.length > 0) {
        setError(validation.errors.map((e) => e.message).join("\n"));
        return;
      }

      // Encode files to base64
      try {
        const encodedFiles = await Promise.all(
          validation.validFiles.map(async (file) => {
            const content = await encodeFileToBase64(file);
            return {
              name: file.name,
              size: file.size,
              type: file.type,
              content,
            };
          }),
        );

        setFiles((prev) => [...prev, ...encodedFiles]);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "ファイルの読み込みに失敗しました";
        setError(message);
      }
    },
    [files],
  );

  const removeFile = useCallback((fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    error,
  };
}
