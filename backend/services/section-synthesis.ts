import { cerebrasClient, CEREBRAS_MODEL } from "../config/cerebras.ts";
import type { DeepResearchSections, EvidenceRecord } from "../types/deepresearch.ts";
import { createSectionSynthesisPrompt, getSectionSynthesisSystemPrompt } from "../utils/prompt.ts";

/**
 * セクション統合サービス。
 *
 * - 役割: 収集した Evidence を根拠として、固定スキーマのセクションJSONをLLM（Cerebras）で生成する。
 * - 失敗時: JSONパースに失敗した場合はエラーにする（フォールバックは行わない方針）。
 */
export class SectionSynthesisService {
  async synthesize(
    userQuery: string,
    asOfDate: string | undefined,
    evidences: EvidenceRecord[],
  ): Promise<DeepResearchSections> {
    const user = createSectionSynthesisPrompt(userQuery, asOfDate, evidences);
    const completion = await cerebrasClient.chat.completions.create({
      messages: [
        { role: "system", content: getSectionSynthesisSystemPrompt() },
        { role: "user", content: user },
      ],
      model: CEREBRAS_MODEL,
      max_tokens: 8000,
      temperature: 0.2,
      stream: false,
    });
    // deno-lint-ignore no-explicit-any
    const jsonText = (completion as any).choices[0]?.message?.content?.trim();
    if (!jsonText) throw new Error("[SYN][llm] Empty synthesis response");
    try {
      return JSON.parse(jsonText) as DeepResearchSections;
    } catch (e) {
      const snippet = jsonText.slice(0, 400).replace(/\n/g, " ");
      throw new Error(`[SYN][llm-parse] Failed to parse JSON: ${(e as Error).message}; snippet="${snippet}..."`);
    }
  }
}
