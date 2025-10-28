import { getOpenAIClient } from "../config/openai.js";
import type {
  DeepResearchSections,
  EvidenceRecord,
} from "../types/deepresearch.js";
import type { EmitFn } from "./deepresearch-streaming.js";
import {
  createSectionSynthesisPrompt,
  getSectionSynthesisSystemPrompt,
} from "../utils/prompt.js";

/**
 * セクション統合サービス。
 *
 * - 役割: 収集した Evidence を根拠として、固定スキーマのセクションJSONをLLM（OpenAI経由）で生成する。
 * - 失敗時: JSONパースに失敗した場合はエラーにする（フォールバックは行わない方針）。
 * - ストリーミング: emit関数が提供された場合、LLMのストリームチャンクを逐次送信する。
 */
export class SectionSynthesisService {
  async synthesize(
    userQuery: string,
    asOfDate: string | undefined,
    evidences: EvidenceRecord[],
    emit?: EmitFn,
  ): Promise<DeepResearchSections> {
    const user = createSectionSynthesisPrompt(userQuery, asOfDate, evidences);
    const systemPrompt = getSectionSynthesisSystemPrompt();

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: user },
      ],
      model: "openai/gpt-5-mini",
      max_completion_tokens: 160000,
      stream: true,
    });

    // ストリームチャンクを蓄積
    let jsonText = "";

    try {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          jsonText += content;

          // emitが提供されている場合、チャンクを送信
          if (emit) {
            try {
              await emit({
                type: "synthesis_chunk",
                chunk: content,
              });
            } catch (emitError) {
              // emit エラーはログに記録するが、処理は継続
              console.error("[SYN] Emit error (continuing):", emitError);
            }
          }
        }
      }
    } catch (streamError) {
      throw new Error(
        `[SYN][stream] Stream processing failed: ${(streamError as Error).message}`,
      );
    }

    if (!jsonText.trim()) throw new Error("[SYN][llm] Empty synthesis response");

    try {
      const sections = JSON.parse(jsonText) as DeepResearchSections;
      return sections;
    } catch (e) {
      const snippet = jsonText.slice(0, 400).replace(/\n/g, " ");
      throw new Error(
        `[SYN][llm-parse] Failed to parse JSON: ${(e as Error).message}; snippet="${snippet}..."`,
      );
    }
  }
}
