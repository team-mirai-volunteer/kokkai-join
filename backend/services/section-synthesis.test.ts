import { describe, it, expect, vi, beforeEach } from "vitest";
import { SectionSynthesisService } from "./section-synthesis.js";
import type { EvidenceRecord } from "../types/deepresearch.js";
import type { EmitFn } from "./deepresearch-streaming.js";

/**
 * TDD: セクション統合サービスのストリーミング対応テスト
 *
 * テストシナリオ:
 * 1. synthesize メソッドが emit パラメータを受け取る
 * 2. OpenAI API のストリームチャンクを処理する
 * 3. 各チャンクが emit 関数で送信される
 * 4. 最終的に正しい JSON がパースされる
 */

// OpenAI クライアントのモック - 共有モックオブジェクト
const mockCreate = vi.fn();
const mockClient = {
	chat: {
		completions: {
			create: mockCreate,
		},
	},
};

vi.mock("../config/openai.js", () => ({
	getOpenAIClient: () => mockClient,
}));

describe("SectionSynthesisService - Streaming", () => {
	let service: SectionSynthesisService;
	let mockEmit: EmitFn;
	let emitCalls: unknown[];

	beforeEach(() => {
		service = new SectionSynthesisService();
		emitCalls = [];
		mockEmit = vi.fn(async (event) => {
			emitCalls.push(event);
		});
		// モックをリセット
		mockCreate.mockReset();
	});

	it("should accept emit parameter in synthesize method", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [
			{
				id: "e1",
				title: "テスト証拠",
				text: "テスト内容",
				url: "https://example.com",
				source: { providerId: "test" },
			},
		];

		const expectedSections = {
			purpose_overview: { summary: "目的の概要", citations: [] },
			current_status: { summary: "現状", citations: [] },
			timeline: { summary: "経緯", citations: [] },
			key_points: { summary: "要点", citations: [] },
			background: { summary: "背景", citations: [] },
			main_issues: { summary: "論点", citations: [] },
			reasons_for_amendment: { summary: "理由", citations: [] },
			impact_analysis: { summary: "影響", citations: [] },
			past_debates_summary: { summary: "過去の議論", citations: [] },
		};

		// モックのOpenAI APIレスポンス（ストリーミング形式）
		const jsonResponse = JSON.stringify(expectedSections);
		const mockStream = createMockStream([
			{ delta: { content: jsonResponse } },
		]);

		mockCreate.mockResolvedValue(mockStream as never);

		// Act
		const result = await service.synthesize(
			userQuery,
			asOfDate,
			evidences,
			mockEmit,
		);

		// Assert
		expect(result).toEqual(expectedSections);
		// emit が呼ばれていることを確認（emitパラメータが受け入れられている）
		expect(emitCalls.length).toBeGreaterThan(0);
	});

	it("should stream chunks via emit function", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [];

		const jsonResponse = JSON.stringify({
			purpose_overview: { summary: "目的の概要", citations: [] },
			current_status: { summary: "現状", citations: [] },
			timeline: { summary: "経緯", citations: [] },
			key_points: { summary: "要点", citations: [] },
			background: { summary: "背景", citations: [] },
			main_issues: { summary: "論点", citations: [] },
			reasons_for_amendment: { summary: "理由", citations: [] },
			impact_analysis: { summary: "影響", citations: [] },
			past_debates_summary: { summary: "過去の議論", citations: [] },
		});

		// チャンクに分割
		const chunks = jsonResponse.match(/.{1,50}/g) || [];
		const mockStreamChunks = chunks.map((content) => ({
			delta: { content },
		}));

		mockCreate.mockImplementation(
			async () => createMockStream(mockStreamChunks) as never,
		);

		// Act
		await service.synthesize(userQuery, asOfDate, evidences, mockEmit);

		// Assert
		// emit が複数回呼ばれていることを確認
		expect(emitCalls.length).toBeGreaterThan(0);

		// synthesis_chunk イベントが含まれていることを確認
		const chunkEvents = emitCalls.filter(
			(event: { type: string }) => event.type === "synthesis_chunk",
		);
		expect(chunkEvents.length).toBeGreaterThan(0);
	});

	it("should accumulate chunks and parse final JSON", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [];

		const expectedSections = {
			purpose_overview: { summary: "目的の概要", citations: ["e1"] },
			current_status: { summary: "現状", citations: [] },
			timeline: { summary: "経緯", citations: [] },
			key_points: { summary: "要点", citations: [] },
			background: { summary: "背景", citations: [] },
			main_issues: { summary: "論点", citations: [] },
			reasons_for_amendment: { summary: "理由", citations: [] },
			impact_analysis: { summary: "影響", citations: [] },
			past_debates_summary: { summary: "過去の議論", citations: [] },
		};

		const jsonResponse = JSON.stringify(expectedSections);
		const mockStreamChunks = [
			{ delta: { content: jsonResponse.slice(0, 50) } },
			{ delta: { content: jsonResponse.slice(50, 100) } },
			{ delta: { content: jsonResponse.slice(100) } },
		];

		mockCreate.mockImplementation(
			async () => createMockStream(mockStreamChunks) as never,
		);

		// Act
		const result = await service.synthesize(
			userQuery,
			asOfDate,
			evidences,
			mockEmit,
		);

		// Assert
		expect(result).toEqual(expectedSections);
	});

	it("should work without emit parameter (backward compatibility)", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [];

		const expectedSections = {
			purpose_overview: { summary: "目的の概要", citations: [] },
			current_status: { summary: "現状", citations: [] },
			timeline: { summary: "経緯", citations: [] },
			key_points: { summary: "要点", citations: [] },
			background: { summary: "背景", citations: [] },
			main_issues: { summary: "論点", citations: [] },
			reasons_for_amendment: { summary: "理由", citations: [] },
			impact_analysis: { summary: "影響", citations: [] },
			past_debates_summary: { summary: "過去の議論", citations: [] },
		};

		const jsonResponse = JSON.stringify(expectedSections);

		mockCreate.mockImplementation(
			async () => createMockStream([{ delta: { content: jsonResponse } }]) as never,
		);

		// Act - emit なしで呼び出し
		const result = await service.synthesize(userQuery, asOfDate, evidences);

		// Assert
		expect(result).toEqual(expectedSections);
	});

	it("should continue processing even if emit fails", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [];

		const expectedSections = {
			purpose_overview: { summary: "目的の概要", citations: [] },
			current_status: { summary: "現状", citations: [] },
			timeline: { summary: "経緯", citations: [] },
			key_points: { summary: "要点", citations: [] },
			background: { summary: "背景", citations: [] },
			main_issues: { summary: "論点", citations: [] },
			reasons_for_amendment: { summary: "理由", citations: [] },
			impact_analysis: { summary: "影響", citations: [] },
			past_debates_summary: { summary: "過去の議論", citations: [] },
		};

		const jsonResponse = JSON.stringify(expectedSections);

		// Mock emit that throws error
		const mockEmitWithError = vi.fn().mockImplementation(async () => {
			throw new Error("Emit failed");
		});

		mockCreate.mockImplementation(
			async () =>
				createMockStream([
					{ delta: { content: jsonResponse.slice(0, 50) } },
					{ delta: { content: jsonResponse.slice(50, 100) } },
					{ delta: { content: jsonResponse.slice(100) } },
				]) as never,
		);

		// Act - emit が失敗しても処理は継続するべき
		const result = await service.synthesize(
			userQuery,
			asOfDate,
			evidences,
			mockEmitWithError,
		);

		// Assert
		expect(result).toEqual(expectedSections);
		expect(mockEmitWithError).toHaveBeenCalled();
	});

	it("should throw error when stream processing fails", async () => {
		// Arrange
		const userQuery = "防衛費と子育て支援の関係";
		const asOfDate = "2025-09-01";
		const evidences: EvidenceRecord[] = [];

		// Mock stream that throws error
		const failingStream = {
			async *[Symbol.asyncIterator]() {
				yield { choices: [{ delta: { content: '{"purpose' } }] };
				throw new Error("Stream connection lost");
			},
		};

		mockCreate.mockImplementation(async () => failingStream as never);

		// Act & Assert
		await expect(
			service.synthesize(userQuery, asOfDate, evidences),
		).rejects.toThrow("Stream processing failed");
	});
});

/**
 * OpenAI ストリームのモックを作成するヘルパー関数
 */
function createMockStream(chunks: Array<{ delta: { content?: string } }>) {
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of chunks) {
				yield {
					choices: [chunk],
				};
			}
		},
	};
}
