// Query planning service for Kokkai RAG system

import { Settings } from "npm:llamaindex";
import type { QueryPlan } from "../types/kokkai.ts";
import { createQueryPlanPrompt } from "../utils/prompt.ts";

/**
 * Service responsible for creating query plans from user questions
 */
export class QueryPlanningService {
	/**
	 * Create a query plan from a user question
	 */
	async createQueryPlan(userQuestion: string): Promise<QueryPlan> {
		if (!Settings.llm) {
			throw new Error("LLM not initialized");
		}

		console.log("🧠 Planning query strategy...");

		const systemPrompt = createQueryPlanPrompt(userQuestion);

		try {
			const response = await Settings.llm.complete({ prompt: systemPrompt });
			const planText = response.text.trim();

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
