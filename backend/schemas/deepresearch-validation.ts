import * as v from "valibot";

const ALLOWED_MIME_TYPES = ["application/pdf"] as const;
// Base64 encoding increases size by ~33% (4/3), so calculate max Base64 size
const MAX_BASE64_SIZE = Math.ceil((10 * 1024 * 1024 * 4) / 3);

// DeepResearchRequest のバリデーションスキーマ
export const DeepResearchRequestSchema = v.object({
  query: v.pipe(
    v.string(),
    v.minLength(1, "query is required"),
    v.transform((val: string) => val.trim()),
    v.minLength(1, "query cannot be empty after trimming"),
  ),
  limit: v.optional(
    v.pipe(
      v.number(),
      v.minValue(1, "limit must be at least 1"),
      v.maxValue(100, "limit must be at most 100"),
    ),
  ),
  providers: v.optional(
    v.pipe(
      v.array(v.string()),
      v.minLength(1, "providers must contain at least one item if specified"),
    ),
  ),
  asOfDate: v.optional(v.string()),
  files: v.optional(
    v.pipe(
      v.array(
        v.object({
          name: v.pipe(v.string(), v.minLength(1, "file.name is required")),
          mimeType: v.picklist(
            ALLOWED_MIME_TYPES,
            "file.mimeType must be one of: application/pdf",
          ),
          content: v.pipe(
            v.string(),
            v.minLength(1, "file.content is required"),
            v.maxLength(
              MAX_BASE64_SIZE,
              `file.content exceeds maximum size (${MAX_BASE64_SIZE} bytes for Base64)`,
            ),
            v.base64("file.content must be valid Base64 encoding"),
          ),
        }),
      ),
      v.maxLength(10, "files must contain at most 10 items"),
    ),
  ),
});

// 型定義をスキーマから生成
export type DeepResearchRequestValidated = v.InferOutput<
  typeof DeepResearchRequestSchema
>;
