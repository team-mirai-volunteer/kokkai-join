import { getOpenAIClient } from "../config/openai.ts";
import type { DeepResearchSections, EvidenceRecord } from "../types/deepresearch.ts";
import { createSectionSynthesisPrompt, getSectionSynthesisSystemPrompt } from "../utils/prompt.ts";

/**
 * セクション統合サービス。
 *
 * - 役割: 収集した Evidence を根拠として、固定スキーマのセクションJSONをLLM（OpenAI経由）で生成する。
 * - 失敗時: JSONパースに失敗した場合はエラーにする（フォールバックは行わない方針）。
 */
export class SectionSynthesisService {
  async synthesize(
    userQuery: string,
    asOfDate: string | undefined,
    evidences: EvidenceRecord[],
  ): Promise<DeepResearchSections> {
    const user = createSectionSynthesisPrompt(userQuery, asOfDate, evidences);
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: getSectionSynthesisSystemPrompt() },
        { role: "user", content: user },
      ],
      model: "gpt-5",
      max_completion_tokens: 8000,
      stream: false,
    });
    const jsonText = completion.choices[0]?.message?.content?.trim();
    if (!jsonText) throw new Error("[SYN][llm] Empty synthesis response");
    try {
      return JSON.parse(jsonText) as DeepResearchSections;
    } catch (e) {
      const snippet = jsonText.slice(0, 400).replace(/\n/g, " ");
      throw new Error(
        `[SYN][llm-parse] Failed to parse JSON: ${(e as Error).message}; snippet="${snippet}..."`,
      );
    }
  }
}
