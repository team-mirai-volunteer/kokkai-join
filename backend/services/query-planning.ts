// Query planning service for Kokkai RAG system

import { cerebrasClient, CEREBRAS_MODEL } from "../config/cerebras.ts";
import type { QueryPlan } from "../types/kokkai.ts";
import {
	createQueryPlanPrompt,
	getQueryPlanSystemPrompt,
} from "../utils/prompt.ts";

/**
 * Service responsible for creating query plans from user questions
 */
export class QueryPlanningService {
	/**
	 * Create a query plan from a user question
	 */
	async createQueryPlan(userQuestion: string): Promise<QueryPlan> {
		console.log("🧠 Planning query strategy...");

		const userPrompt = createQueryPlanPrompt(userQuestion);

		try {
			// Cerebras Chat APIを直接呼び出し
			const completion = await cerebrasClient.chat.completions.create({
				messages: [
					{ role: "system", content: getQueryPlanSystemPrompt() },
					{ role: "user", content: userPrompt },
				],
				model: CEREBRAS_MODEL,
				max_tokens: 1000,
				temperature: 0.3, // 計画生成は確定的に
				stream: false,
			});

			// deno-lint-ignore no-explicit-any
			const planText = (completion as any).choices[0]?.message?.content?.trim();
			if (!planText) {
				throw new Error("No text in completion response");
			}

			// JSONパース試行
			let planData;
			try {
				planData = JSON.parse(planText);
			} catch (parseError) {
				throw new Error(
					`Failed to parse LLM response as JSON: ${
						(parseError as Error).message
					}\nResponse: ${planText}`,
				);
			}

			// QueryPlan形式に変換
			const plan: QueryPlan = {
				originalQuestion: userQuestion,
				subqueries: planData.subqueries || [userQuestion],
				entities: {
					speakers: planData.entities?.speakers || [],
					parties: planData.entities?.parties || [],
					topics: planData.entities?.topics || [],
					meetings: planData.entities?.meetings || [],
					positions: planData.entities?.positions || [],
					dateRange: planData.entities?.dateRange,
				},
				enabledStrategies: planData.enabledStrategies || ["vector"],
				confidence: planData.confidence || 0.5,
				estimatedComplexity: planData.estimatedComplexity || 2,
			};

			console.log(`📋 Query plan created:`);
			console.log(`   Original Question: ${JSON.stringify(plan)}`);
			console.log(`   Subqueries: ${plan.subqueries.length}`);
			console.log(`   Speakers: ${plan.entities.speakers?.length || 0}`);
			console.log(`   Topics: ${plan.entities.topics?.length || 0}`);
			console.log(`   Strategies: ${plan.enabledStrategies.join(", ")}`);
			console.log(`   Confidence: ${plan.confidence.toFixed(2)}`);

			return plan;
		} catch (error) {
			console.error("❌ Planning error:", error);
			throw error;
		}
	}
}
