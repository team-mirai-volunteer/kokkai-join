import { useCallback, useState } from "react";
import type { EncodedFile, UploadedFile } from "../types/file";
import { encodeFilesToBase64 } from "../utils/fileEncoder";
import { validateFiles } from "../utils/fileValidation";

export interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  encodeFilesToBase64: () => Promise<EncodedFile[]>;
  error: string | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setError(null);

      const validation = validateFiles(newFiles, files.length);

      if (validation.errors.length > 0) {
        setError(validation.errors.map((e) => e.message).join("\n"));
        return;
      }

      const uploadedFiles: UploadedFile[] = validation.validFiles.map(
        (file, index) => ({
          id: `${file.name}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        }),
      );

      setFiles((prev) => [...prev, ...uploadedFiles]);
    },
    [files.length],
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const encodeFiles = useCallback(async (): Promise<EncodedFile[]> => {
    try {
      return await encodeFilesToBase64(files);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "ファイルのエンコードに失敗しました";
      setError(message);
      throw err;
    }
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    encodeFilesToBase64: encodeFiles,
    error,
  };
}
