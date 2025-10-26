import {
  ACCEPTED_FILE_TYPES,
  type FileValidationError,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE,
} from "../../features/search/types/file";

export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
}

export interface FilesValidationResult {
  validFiles: File[];
  errors: FileValidationError[];
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: {
        file,
        reason: "size",
        message: `ファイルサイズは10MB以下にしてください（${file.name}）`,
      },
    };
  }

  const fileType = file.type.split(";")[0];
  const isAcceptedType = ACCEPTED_FILE_TYPES.some(
    (acceptedType) => acceptedType === fileType,
  );

  if (!isAcceptedType) {
    return {
      isValid: false,
      error: {
        file,
        reason: "type",
        message: `対応していないファイル形式です（${file.name}）`,
      },
    };
  }

  return { isValid: true };
}

export function validateFiles(
  files: File[],
  existingFileCount: number,
): FilesValidationResult {
  const totalCount = existingFileCount + files.length;

  if (totalCount > MAX_FILE_COUNT) {
    return {
      validFiles: [],
      errors: [
        {
          file: files[0],
          reason: "count",
          message: `ファイルは最大10個まで添付できます（現在: ${existingFileCount}個、追加: ${files.length}個）`,
        },
      ],
    };
  }

  const validFiles: File[] = [];
  const errors: FileValidationError[] = [];

  for (const file of files) {
    const result = validateFile(file);
    if (result.isValid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { validFiles, errors };
}
