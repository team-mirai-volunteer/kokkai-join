// Relevance evaluation service for filtering search results

import { cerebrasClient, CEREBRAS_MODEL } from "../config/cerebras.ts";
import type { SpeechResult } from "../types/kokkai.ts";
import {
	createRelevanceEvaluationPrompt,
	getRelevanceEvaluationSystemPrompt,
} from "../utils/prompt.ts";

/**
 * Service responsible for evaluating and filtering search results based on relevance
 */
export class RelevanceEvaluationService {
	/**
	 * Evaluate relevance of search results and filter out noise
	 */
	async evaluateRelevance(
		query: string,
		results: SpeechResult[],
	): Promise<SpeechResult[]> {
		console.log("\n🔍 Evaluating relevance of search results...");

		// 直列処理で各結果の関連性を評価（レート制限対策）
		const evaluatedResults: SpeechResult[] = [];

		for (const result of results) {
			try {
				const prompt = createRelevanceEvaluationPrompt(query, result);

				// Cerebras Chat APIを直接呼び出し
				const completion = await cerebrasClient.chat.completions.create({
					messages: [
						{
							role: "system",
							content: getRelevanceEvaluationSystemPrompt(),
						},
						{ role: "user", content: prompt },
					],
					model: CEREBRAS_MODEL,
					max_tokens: 100,
					temperature: 0.1, // 評価は確定的に
					stream: false,
				});

				// deno-lint-ignore no-explicit-any
				const evaluation = (completion as any).choices[0]?.message?.content;
				if (!evaluation) {
					evaluatedResults.push(result); // テキストがない場合は元の結果を返す
					continue;
				}

				// 関連性の判定
				if (evaluation.includes("無関係")) {
          // 無関係と判定された場合は除外
				} else if (evaluation.includes("低")) {
					// 低関連性の場合はスコアを調整
					result.score *= 0.5;
					evaluatedResults.push(result);
				} else if (evaluation.includes("中")) {
					result.score *= 0.8;
					evaluatedResults.push(result);
				} else {
					// 高関連性はそのまま
					evaluatedResults.push(result);
				}
			} catch (error) {
				console.error(`❌ Error evaluating result: ${error}`);
				evaluatedResults.push(result); // エラーの場合は元の結果を返す
			}
		}

		console.log(
			`✅ Filtered ${results.length} results to ${evaluatedResults.length} relevant results`,
		);

		// スコアで再ソート
		evaluatedResults.sort((a, b) => b.score - a.score);

		return evaluatedResults;
	}
}
