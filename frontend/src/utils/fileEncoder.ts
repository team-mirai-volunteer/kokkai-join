import type { EncodedFile, UploadedFile } from "../types/file";

export async function encodeFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error(`ファイルの読み込みに失敗しました: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

export async function encodeFilesToBase64(
  files: File[] | UploadedFile[],
): Promise<EncodedFile[]> {
  const encodedFiles: EncodedFile[] = [];

  for (const fileOrUploadedFile of files) {
    const file =
      fileOrUploadedFile instanceof File
        ? fileOrUploadedFile
        : fileOrUploadedFile.file;

    try {
      const content = await encodeFileToBase64(file);
      const mimeType = file.type.split(";")[0];

      encodedFiles.push({
        name: file.name,
        content,
        mimeType,
      });
    } catch (error) {
      console.error("File encoding error:", error);
      throw error;
    }
  }

  return encodedFiles;
}
