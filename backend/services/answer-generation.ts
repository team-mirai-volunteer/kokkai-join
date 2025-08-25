// Answer generation service using Chain of Agents approach

import { cerebrasClient, CEREBRAS_MODEL } from "../config/cerebras.ts";
import type { SpeechResult, SubSummaryResult } from "../types/kokkai.ts";
import {
	formatSpeechResultsForPrompt,
	createSubSummaryPrompt,
	createMidConsolidationPrompt,
	createFinalAnswerPrompt,
	createSimpleAnswerPrompt,
	getSubSummarySystemPrompt,
	getMidConsolidationSystemPrompt,
	getFinalAnswerSystemPrompt,
	getSimpleAnswerSystemPrompt,
} from "../utils/prompt.ts";
import {
	CHAIN_OF_AGENTS_CHUNK_SIZE,
	CHAIN_OF_AGENTS_MIN_RESULTS,
	MID_CONSOLIDATION_CHUNK_SIZE,
	MID_CONSOLIDATION_THRESHOLD,
	CONTENT_PREVIEW_LENGTH,
} from "../config/constants.ts";

/**
 * Service responsible for generating answers using Chain of Agents approach
 */
export class AnswerGenerationService {
	/**
	 * Generate a sub-summary for a chunk of speech results
	 */
	private async generateSubSummary(
		chunk: SpeechResult[],
		chunkIndex: number,
		query: string,
	): Promise<SubSummaryResult> {
		const context = formatSpeechResultsForPrompt(chunk);
		const userPrompt = createSubSummaryPrompt(
			query,
			context,
		);

		try {
			// Cerebras Chat APIを直接呼び出し
			const completion = await cerebrasClient.chat.completions.create({
				messages: [
					{
						role: "system",
						content: getSubSummarySystemPrompt(),
					},
					{ role: "user", content: userPrompt },
				],
				model: CEREBRAS_MODEL,
				max_tokens: 500,
				temperature: 0.5,
				stream: false,
			});

      console.dir(completion, {depth: null});

			// deno-lint-ignore no-explicit-any
			const text = (completion as any).choices[0]?.message?.content;
			if (!text || text.trim() === "") {
				console.warn(
					`⚠️ Sub-summary ${chunkIndex + 1}: Empty response from API, using fallback`,
				);
				// 空レスポンスの場合は発言内容の抜粋を使用
				const preview = chunk
					.slice(0, 2)
					.map((r) => `${r.speaker}: ${r.content.substring(0, 100)}...`)
					.join("\n");
				return {
					chunkIndex: chunkIndex + 1,
					summary: `[要約生成失敗] 発言内容:\n${preview}`,
					sourceCount: chunk.length,
				};
			}

			return {
				chunkIndex: chunkIndex + 1,
				summary: text,
				sourceCount: chunk.length,
			};
		} catch (error) {
			console.error(`❌ Sub-summary ${chunkIndex + 1} failed:`, error);
			// APIエラーの場合も発言内容の抜粋を返す
			const preview = chunk
				.slice(0, 2)
				.map((r) => `${r.speaker}: ${r.content.substring(0, 100)}...`)
				.join("\n");
			return {
				chunkIndex: chunkIndex + 1,
				summary: `[要約生成エラー] 発言内容:\n${preview}`,
				sourceCount: chunk.length,
			};
		}
	}

	/**
	 * Generate answer using Chain of Agents multi-stage summarization
	 */
	async generateAnswer(
		query: string,
		results: SpeechResult[],
	): Promise<string> {
		console.log(`\n🤖 Generating answer using Chain of Agents...`);
		console.log(`📊 Total results to process: ${results.length}`);

		// 結果が少ない場合は従来の処理
		if (results.length <= CHAIN_OF_AGENTS_MIN_RESULTS) {
			return this.generateSimpleAnswer(query, results);
		}

		// Chain of Agents: 発言者ごとにグループ化してから要約処理
		// Step 0: 発言者ごとにグループ化（同一発言者の発言が混在しないように）
		const speakerGroups = new Map<string, SpeechResult[]>();
		for (const result of results) {
			const speakerKey = `${result.speaker}_${result.party}`;
			if (!speakerGroups.has(speakerKey)) {
				speakerGroups.set(speakerKey, []);
			}
			speakerGroups.get(speakerKey)!.push(result);
		}

		console.log(`📊 Grouped into ${speakerGroups.size} speakers`);

		// 各発言者グループをチャンクに分割（同一発言者の発言をまとめて処理）
		const chunks: SpeechResult[][] = [];
		for (const [_, speeches] of speakerGroups) {
			// 発言者ごとにチャンク化
			for (let i = 0; i < speeches.length; i += CHAIN_OF_AGENTS_CHUNK_SIZE) {
				const chunk = speeches.slice(i, i + CHAIN_OF_AGENTS_CHUNK_SIZE);
				chunks.push(chunk);
			}
		}

		console.log(`📦 Split into ${chunks.length} chunks for processing`);

		// Step 1: 各チャンクを直列処理でサブ要約
		console.log(`⚙️ Step 1: Generating sub-summaries...`);
		const subSummaries: SubSummaryResult[] = [];

		for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
			const subSummary = await this.generateSubSummary(
				chunks[chunkIndex],
				chunkIndex,
				query,
			);
			subSummaries.push(subSummary);
			console.log(
				`  ✓ Generated sub-summary ${chunkIndex + 1}/${chunks.length}`,
			);
		}

		console.log(`✅ Generated ${subSummaries.length} sub-summaries`);

		// Step 2: サブ要約が多い場合は中間統合
		let finalSummaries = subSummaries.map((s) => s.summary);
		if (subSummaries.length > MID_CONSOLIDATION_THRESHOLD) {
			console.log(`⚙️ Step 2: Intermediate consolidation...`);
			const midChunkSize = MID_CONSOLIDATION_CHUNK_SIZE;
			const midSummaries: string[] = [];

			for (let i = 0; i < finalSummaries.length; i += midChunkSize) {
				const midChunk = finalSummaries.slice(i, i + midChunkSize);
				const midPrompt = createMidConsolidationPrompt(query, midChunk, i);

				try {
					// Cerebras Chat APIを直接呼び出し
					const completion = await cerebrasClient.chat.completions.create({
						messages: [
							{
								role: "system",
								content: getMidConsolidationSystemPrompt(),
							},
							{ role: "user", content: midPrompt },
						],
						model: CEREBRAS_MODEL,
						max_tokens: 1000,
						temperature: 0.5,
						stream: false,
					});

					// deno-lint-ignore no-explicit-any
					const text = (completion as any).choices[0]?.message?.content;
					if (!text) {
						throw new Error("No text in completion response");
					}
          console.dir(completion, {depth: null});
					midSummaries.push(text);
				} catch (error) {
					console.error(`❌ Mid-level consolidation failed:`, error);
					midSummaries.push(midChunk.join("\n"));
				}
			}

			finalSummaries = midSummaries;
			console.log(
				`✅ Consolidated to ${midSummaries.length} intermediate summaries`,
			);
		}

		// Step 3: 最終統合と回答生成
		console.log(`⚙️ Step 3: Final answer generation...`);
		const finalContext = finalSummaries
			.map((s, idx) => `【要約${idx + 1}】\n${s}`)
			.join("\n\n");

		const finalPrompt = createFinalAnswerPrompt(query, finalContext);

		try {
			// Cerebras Chat APIを直接呼び出し（最終回答は詳細に）
			const completion = await cerebrasClient.chat.completions.create({
				messages: [
					{
						role: "system",
						content: getFinalAnswerSystemPrompt(),
					},
					{ role: "user", content: finalPrompt },
				],
				model: CEREBRAS_MODEL,
				max_tokens: 3000,
				temperature: 0.7,
				stream: false,
			});

			// deno-lint-ignore no-explicit-any
			const text = (completion as any).choices[0]?.message?.content;
			if (!text) {
				throw new Error("No text in completion response");
			}

			console.log(`✅ Final answer generated successfully`);
			return text;
		} catch (error) {
			console.error("❌ Final answer generation error:", error);
			return this.generateSimpleAnswer(query, results);
		}
	}

	/**
	 * Generate simple answer (fallback method)
	 */
	async generateSimpleAnswer(
		query: string,
		results: SpeechResult[],
	): Promise<string> {
		const context = formatSpeechResultsForPrompt(results);
		const prompt = createSimpleAnswerPrompt(query, context);

		try {
			// Cerebras Chat APIを直接呼び出し
			const completion = await cerebrasClient.chat.completions.create({
				messages: [
					{ role: "system", content: getSimpleAnswerSystemPrompt() },
					{ role: "user", content: prompt },
				],
				model: CEREBRAS_MODEL,
				max_tokens: 2000,
				temperature: 0.7,
				stream: false,
			});

			// deno-lint-ignore no-explicit-any
			const text = (completion as any).choices[0]?.message?.content;
			if (!text) {
				throw new Error("No text in completion response");
			}
			return text;
		} catch (error) {
			console.error("❌ LLM generation error:", error);
			return `検索結果に基づく情報:

${results
	.map(
		(result, index) =>
			`${index + 1}. ${result.speaker} (${result.party})
   日付: ${result.date}
   会議: ${result.meeting}
   内容: ${result.content.substring(0, CONTENT_PREVIEW_LENGTH)}...
   出典: ${result.url}
   関連度: ${result.score.toFixed(3)}`,
	)
	.join("\n\n")}`;
		}
	}
}
