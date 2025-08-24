// Type definitions for Kokkai RAG system

export interface SpeechResult {
	speechId: string;
	speaker: string;
	party: string;
	date: string;
	meeting: string;
	content: string;
	url: string;
	score: number;
}

export interface KokkaiEntities {
	speakers?: string[]; // 議員名 (例: ["岸田文雄", "枝野幸男"])
	parties?: string[]; // 政党名 (例: ["自民党", "立憲民主党"])
	dateRange?: {
		// 期間指定
		start: string; // ISO日付文字列 "2024-01-01"
		end: string; // ISO日付文字列 "2024-12-31"
	};
	meetings?: string[]; // 会議名 (例: ["予算委員会", "法務委員会"])
	topics?: string[]; // 議題・キーワード (例: ["防衛費", "子育て支援"])
	positions?: string[]; // 役職 (例: ["総理大臣", "外務大臣"])
}

export interface QueryPlan {
	originalQuestion: string; // 元の質問
	subqueries: string[]; // 分解されたサブクエリ
	entities: KokkaiEntities; // 抽出されたエンティティ
	enabledStrategies: string[]; // 使用する検索戦略 ["vector", "structured", "statistical"]
	confidence: number; // プラン信頼度 (0-1)
	estimatedComplexity: number; // 処理複雑度予測 (1-5)
}

export interface DatabaseRow {
	speech_id: string;
	speaker: string | null;
	speaker_group: string | null;
	date: string | null;
	meeting_name: string | null;
	speech_text: string | null;
	speech_url: string | null;
	similarity_score: string;
}

export interface SubSummaryResult {
	chunkIndex: number;
	summary: string;
	sourceCount: number;
}

// Type aliases for better readability
export type PromptText = string;
export type SqlQuery = string;
export type QueryParameter = string | number;
export type EmbeddingThreshold = number;
