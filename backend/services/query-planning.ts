// Query planning service for Kokkai RAG system

import { getOpenAIClient } from "../config/openai.js";
import type { QueryPlan } from "../types/kokkai.js";
import { getQueryPlanSystemPrompt } from "../utils/prompt.js";

/**
 * クエリプランニングサービス。
 *
 * - 役割: ユーザ質問を解析し、検索に適したサブクエリやエンティティ（話者/政党/期間など）を抽出。
 * - 本実装: OpenAI 経由で選択した LLM にプロンプトして JSON 形式のプランを生成する。
 */
interface RawPlanData {
  subqueries?: string[];
  entities?: {
    speakers?: string[];
    parties?: string[];
    topics?: string[];
    meetings?: string[];
    positions?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  enabledStrategies?: string[];
  confidence?: number;
  estimatedComplexity?: number;
}

export class QueryPlanningService {
  /** ユーザ質問からクエリプラン（サブクエリ等）を生成 */
  async createQueryPlan(userQuestion: string): Promise<QueryPlan> {
    console.log("🧠 Planning query strategy...");

    const userPrompt = `質問: "${userQuestion}"`;

    let planText: string | undefined;
    try {
      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: getQueryPlanSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
        model: "openai/gpt-4o-mini",
        max_tokens: 3000,
        temperature: 0.3, // 計画生成は確定的に
        stream: false,
      });

      planText = completion.choices[0]?.message?.content?.trim();
      if (!planText) {
        throw new Error("No text in completion response");
      }
    } catch (error) {
      console.error("❌ Planning error:", error);
      throw error;
    }

    // JSONパース試行
    let planData: RawPlanData;
    try {
      planData = JSON.parse(planText) as RawPlanData;
    } catch (parseError) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${
          (parseError as Error).message
        }\nResponse: ${planText}`,
      );
    }

    // QueryPlan形式に変換
    const rawDateRange = planData.entities?.dateRange;
    const normalizedDateRange =
      rawDateRange &&
      typeof rawDateRange.start === "string" &&
      typeof rawDateRange.end === "string"
        ? {
            start: rawDateRange.start,
            end: rawDateRange.end,
          }
        : undefined;

    const plan: QueryPlan = {
      originalQuestion: userQuestion,
      subqueries: planData.subqueries || [userQuestion],
      entities: {
        speakers: planData.entities?.speakers || [],
        parties: planData.entities?.parties || [],
        topics: planData.entities?.topics || [],
        meetings: planData.entities?.meetings || [],
        positions: planData.entities?.positions || [],
        dateRange: normalizedDateRange,
      },
      enabledStrategies: planData.enabledStrategies || ["vector"],
      confidence: planData.confidence || 0.5,
      estimatedComplexity: planData.estimatedComplexity || 2,
    };

    return plan;
  }
}
