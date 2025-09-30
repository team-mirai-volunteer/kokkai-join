import * as v from "valibot";

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
});

// 型定義をスキーマから生成
export type DeepResearchRequestValidated = v.InferOutput<
	typeof DeepResearchRequestSchema
>;
