export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string; // Base64 encoded content
}

export interface EncodedFile {
  name: string;
  content: string;
  mimeType: string;
}

export interface FileValidationError {
  file: File;
  reason: "size" | "type" | "count";
  message: string;
}

export const ACCEPTED_FILE_TYPES = ["application/pdf"] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_COUNT = 10;
