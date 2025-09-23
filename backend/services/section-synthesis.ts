import { getOpenAIClient } from "../config/openai.ts";
import type { DeepResearchSections, EvidenceRecord } from "../types/deepresearch.ts";
import { createSectionSynthesisPrompt, getSectionSynthesisSystemPrompt } from "../utils/prompt.ts";
import { AICacheManager } from "../utils/ai-cache-manager.ts";

/**
 * セクション統合サービス。
 *
 * - 役割: 収集した Evidence を根拠として、固定スキーマのセクションJSONをLLM（OpenAI経由）で生成する。
 * - 失敗時: JSONパースに失敗した場合はエラーにする（フォールバックは行わない方針）。
 * - キャッシュ: AI応答をJSONファイルにキャッシュし、モックモードで再利用可能。
 */
export class SectionSynthesisService {
  private cacheManager: AICacheManager;

  constructor(cacheManager?: AICacheManager) {
    this.cacheManager = cacheManager || new AICacheManager();
  }

  async synthesize(
    userQuery: string,
    asOfDate: string | undefined,
    evidences: EvidenceRecord[],
  ): Promise<DeepResearchSections> {
    const user = createSectionSynthesisPrompt(userQuery, asOfDate, evidences);
    const systemPrompt = getSectionSynthesisSystemPrompt();

    const cacheInput = {
      userQuery,
      asOfDate,
      evidencesCount: evidences.length,
      evidenceIds: evidences.map((e) => e.id),
      userPrompt: user,
      systemPrompt,
      model: "gpt-5",
    };

    // キャッシュチェック
    const cachedResponse = await this.cacheManager.load<DeepResearchSections>(
      "section-synthesis",
      cacheInput,
    );

    if (cachedResponse) {
      console.log("📂 Using cached section synthesis");
      return cachedResponse;
    }

    // モックモードでキャッシュがない場合はエラー
    if (this.cacheManager.isMockMode()) {
      throw new Error(
        "Mock mode enabled but no cached section synthesis found for this input",
      );
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: user },
      ],
      model: "gpt-5",
      max_completion_tokens: 8000,
      stream: false,
    });

    const jsonText = completion.choices[0]?.message?.content?.trim();
    if (!jsonText) throw new Error("[SYN][llm] Empty synthesis response");

    try {
      const sections = JSON.parse(jsonText) as DeepResearchSections;

      // キャッシュに保存
      await this.cacheManager.save("section-synthesis", cacheInput, sections);

      return sections;
    } catch (e) {
      const snippet = jsonText.slice(0, 400).replace(/\n/g, " ");
      throw new Error(
        `[SYN][llm-parse] Failed to parse JSON: ${(e as Error).message}; snippet="${snippet}..."`,
      );
    }
  }
}
