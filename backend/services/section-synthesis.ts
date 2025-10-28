import { getOpenAIClient } from "../config/openai.js";
import type { EvidenceRecord } from "../types/deepresearch.js";
import {
  createMarkdownSynthesisPrompt,
  getMarkdownSynthesisSystemPrompt,
} from "../utils/prompt.js";
import type { EmitFn } from "./deepresearch-streaming.js";

/**
 * セクション統合サービス。
 *
 * - 役割: 収集した Evidence を根拠として、Markdown形式のレポートをLLM（OpenAI経由）で生成する。
 * - ストリーミング: emit関数が提供された場合、LLMのMarkdownストリームチャンクを逐次送信する。
 * - 出力: 完成したMarkdown文字列を返す。
 */
export class SectionSynthesisService {
  async synthesize(
    userQuery: string,
    asOfDate: string | undefined,
    evidences: EvidenceRecord[],
    emit?: EmitFn,
  ): Promise<string> {
    const user = createMarkdownSynthesisPrompt(userQuery, asOfDate, evidences);
    const systemPrompt = getMarkdownSynthesisSystemPrompt();

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

    // Markdownストリームチャンクを蓄積
    let markdownText = "";

    try {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          markdownText += content;

          // emitが提供されている場合、Markdownチャンクを送信
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

    if (!markdownText.trim())
      throw new Error("[SYN][llm] Empty synthesis response");

    return markdownText;
  }
}
