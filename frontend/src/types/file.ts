export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
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

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_COUNT = 10;
