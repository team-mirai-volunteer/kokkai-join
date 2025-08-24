// Relevance evaluation service for filtering search results

import { Settings } from "npm:llamaindex";
import type { SpeechResult } from "../types/kokkai.ts";
import { createRelevanceEvaluationPrompt } from "../utils/prompt.ts";

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
		if (!Settings.llm) {
			console.warn("⚠️ LLM not initialized for relevance evaluation");
			return results;
		}

		console.log("\n🔍 Evaluating relevance of search results...");

		// 並行処理で各結果の関連性を評価
		const evaluationPromises = results.map(async (result) => {
			try {
				const prompt = createRelevanceEvaluationPrompt(query, result);
				const response = await Settings.llm.complete({ prompt });
				const evaluation = response.text;

				// 関連性の判定
				if (evaluation.includes("無関係")) {
					return null;
				} else if (evaluation.includes("低")) {
					// 低関連性の場合はスコアを調整
					result.score *= 0.5;
				} else if (evaluation.includes("中")) {
					result.score *= 0.8;
				}
				// 高関連性はそのまま

				return result;
			} catch (error) {
				console.error(`❌ Error evaluating result: ${error}`);
				return result; // エラーの場合は元の結果を返す
			}
		});

		// 並行実行して結果を取得
		const evaluatedResults = await Promise.all(evaluationPromises);

		// nullを除外（無関係と判定されたもの）
		const filteredResults = evaluatedResults.filter(
			(result): result is SpeechResult => result !== null,
		);

		// スコアで再ソート
		filteredResults.sort((a, b) => b.score - a.score);

		console.log(
			`✅ Filtered ${results.length} results to ${filteredResults.length} relevant results`,
		);

		return filteredResults;
	}
}
