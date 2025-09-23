// Relevance evaluation service for filtering search results

import { getOpenAIClient, resolveModel } from "../config/openai.ts";
import type { SpeechResult } from "../types/kokkai.ts";
import {
	createRelevanceEvaluationPrompt,
	getRelevanceEvaluationSystemPrompt,
} from "../utils/prompt.ts";

/**
 * 関連度評価サービス。
 *
 * - 各ドキュメント（SpeechResult）を質問に対して LLM で評価（高/中/低/無関係）
 * - スコアを調整し、降順ソートした配列を返す（無関係は除外）
 */
export class RelevanceEvaluationService {
	/** 質問に対する関連度を評価し、ノイズを除去してスコア順で返す */
	async evaluateRelevance(
		query: string,
		results: SpeechResult[],
	): Promise<SpeechResult[]> {
		console.log("\n🔍 Evaluating relevance of search results...");

		// 直列処理で各結果の関連性を評価（レート制限対策）
		const evaluatedResults: SpeechResult[] = [];
		const client = getOpenAIClient();

		for (const result of results) {
			try {
				const prompt = createRelevanceEvaluationPrompt(query, result);

				const completion = await client.chat.completions.create({
					messages: [
						{
							role: "system",
							content: getRelevanceEvaluationSystemPrompt(),
						},
						{ role: "user", content: prompt },
					],
					model: resolveModel("relevance_evaluation"),
					max_tokens: 100,
					temperature: 0.1, // 評価は確定的に
					stream: false,
				});

				const evaluation = completion.choices[0]?.message?.content;
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
