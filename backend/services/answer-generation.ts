// Answer generation service using Chain of Agents approach

import { openaiClient } from "../config/openai.ts";
import type { MidSummary, SpeechResult, SubSummary, SubSummaryResult } from "../types/kokkai.ts";
import {
  createFinalAnswerPrompt,
  createMidConsolidationPrompt,
  createSimpleAnswerPrompt,
  createSubSummaryPrompt,
  formatSpeechResultsForPrompt,
  getFinalAnswerSystemPrompt,
  getMidConsolidationSystemPrompt,
  getSimpleAnswerSystemPrompt,
  getSubSummarySystemPrompt,
} from "../utils/prompt.ts";
import {
  CHAIN_OF_AGENTS_CHUNK_SIZE,
  CHAIN_OF_AGENTS_MIN_RESULTS,
  CONTENT_PREVIEW_LENGTH,
  MID_CONSOLIDATION_THRESHOLD,
} from "../config/constants.ts";

/**
 * Service responsible for generating answers using Chain of Agents approach
 */
export class AnswerGenerationService {
  /**
   * Generate a sub-summary for a chunk of speech results
   */
  private async generateSubSummary(
    chunk: SpeechResult[],
    chunkIndex: number,
    query: string,
  ): Promise<SubSummaryResult> {
    // speechIdとcontentのみを渡す
    const context = chunk
      .map((r) => `speechId: ${r.speechId}\ncontent: ${r.content}`)
      .join("\n---\n");

    const userPrompt = createSubSummaryPrompt(query, context);

    try {
      const completion = await openaiClient.chat.completions.create({
        task: "answer_generation",
        messages: [
          {
            role: "system",
            content: getSubSummarySystemPrompt(),
          },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
        temperature: 0.5,
        stream: false,
      });

      // deno-lint-ignore no-explicit-any
      const text = (completion as any).choices[0]?.message?.content;
      if (!text || text.trim() === "") {
        console.warn(
          `⚠️ Sub-summary ${chunkIndex + 1}: Empty response from API, using fallback`,
        );
        return {
          chunkIndex: chunkIndex + 1,
          summaries: [],
          sourceCount: chunk.length,
        };
      }

      // JSON パース
      let summaries: SubSummary[];
      try {
        summaries = JSON.parse(text);
      } catch (e) {
        console.error(`Failed to parse sub-summary JSON: ${e}`);
        summaries = [];
      }

      return {
        chunkIndex: chunkIndex + 1,
        summaries: summaries,
        sourceCount: chunk.length,
      };
    } catch (error) {
      console.error(`❌ Sub-summary ${chunkIndex + 1} failed:`, error);
      return {
        chunkIndex: chunkIndex + 1,
        summaries: [],
        sourceCount: chunk.length,
      };
    }
  }

  /**
   * Consolidate intermediate summaries
   */
  private async consolidateIntermediate(
    subSummaries: SubSummaryResult[],
    query: string,
  ): Promise<MidSummary[]> {
    // SubSummaryJsonの配列をフラット化
    const allSummaries = subSummaries.flatMap((m) => m.summaries);

    const input = allSummaries
      .map(
        (s) => `- speechId: ${s.speechId}, viewpoint: ${s.viewpoint}, content: ${s.content}`,
      )
      .join("\n");

    const midPrompt = createMidConsolidationPrompt(query, input);

    try {
      const completion = await openaiClient.chat.completions.create({
        task: "answer_generation",
        messages: [
          {
            role: "system",
            content: getMidConsolidationSystemPrompt(),
          },
          { role: "user", content: midPrompt },
        ],
        max_tokens: 8192,
        temperature: 0.5,
        stream: false,
      });

      // deno-lint-ignore no-explicit-any
      const text = (completion as any).choices[0]?.message?.content;
      if (!text) {
        throw new Error("No text in mid-consolidation response");
      }

      // JSON パース
      let midSummaries: MidSummary[];
      try {
        midSummaries = JSON.parse(text);
      } catch (e) {
        console.error(`Failed to parse mid-summary JSON: ${e}`);
        midSummaries = [];
      }

      return midSummaries;
    } catch (error) {
      console.error("❌ Mid-consolidation failed:", error);
      // エラー時は観点ごとにグループ化
      return this.groupByViewpoint(allSummaries);
    }
  }

  /**
   * Group summaries by viewpoint (fallback)
   */
  private groupByViewpoint(summaries: SubSummary[]): MidSummary[] {
    const grouped = new Map<
      string,
      { speechIds: string[]; contents: string[] }
    >();

    for (const summary of summaries) {
      if (!grouped.has(summary.viewpoint)) {
        grouped.set(summary.viewpoint, { speechIds: [], contents: [] });
      }
      const group = grouped.get(summary.viewpoint)!;
      group.speechIds.push(summary.speechId);
      group.contents.push(summary.content);
    }

    return Array.from(grouped.entries()).map(
      ([viewpoint, { speechIds, contents }]) => ({
        viewpoint,
        viewpointSummary: contents.length > 0
          ? `${contents.slice(0, 3).join("、")}${contents.length > 3 ? "等" : ""}`
          : `${viewpoint}に関する${speechIds.length}件の発言`,
        speechIds,
      }),
    );
  }

  /**
   * Format final markdown output
   */
  private formatFinalMarkdown(
    overallSummary: string,
    midSummaries: MidSummary[],
    speechMap: Map<string, SpeechResult>,
    subSummaries: SubSummary[],
  ): string {
    // 全体のまとめはリスト形式になっているのでそのまま使用
    let markdown = `## 全体のまとめ\n\n${overallSummary}\n\n---\n\n`;
    markdown += `## 観点別の詳細\n\n`;

    for (const mid of midSummaries) {
      markdown += `### ${mid.viewpoint}\n`;
      markdown += `#### 要約\n${mid.viewpointSummary}\n`;
      markdown += `#### 詳細\n`;
      markdown += `| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |\n`;
      markdown += `|--------|------|------|------------|------|\n`;

      for (const speechId of mid.speechIds) {
        const speech = speechMap.get(speechId);
        if (speech) {
          // サブ要約から該当するspeechIdの要約を探す
          const summary = subSummaries.find((s) => s.speechId === speechId);
          const contentPreview = summary
            ? summary.content
            : speech.content.length > 50
            ? speech.content.substring(0, 50) + "..."
            : speech.content;

          // 日付のフォーマット（YYYY-MM-DD形式を維持）
          const formattedDate = speech.date || "不明";

          markdown +=
            `| ${speech.speaker} | ${speech.party} | ${formattedDate} | ${contentPreview} | ${speech.url} |\n`;
        }
      }
      markdown += `\n---\n\n`;
    }

    return markdown;
  }

  /**
   * Generate answer using Chain of Agents multi-stage summarization
   */
  async generateAnswer(
    query: string,
    results: SpeechResult[],
  ): Promise<string> {
    console.log(`\n🤖 Generating answer using Chain of Agents...`);
    console.log(`📊 Total results to process: ${results.length}`);

    // speechIdでインデックスを作成
    const speechMap = new Map<string, SpeechResult>();
    results.forEach((r) => speechMap.set(r.speechId, r));

    // 結果が少ない場合は従来の処理
    if (results.length <= CHAIN_OF_AGENTS_MIN_RESULTS) {
      return this.generateSimpleAnswer(query, results);
    }

    // Chain of Agents: 発言者ごとにグループ化してから要約処理
    // Step 0: 発言者ごとにグループ化（同一発言者の発言が混在しないように）
    const speakerGroups = new Map<string, SpeechResult[]>();
    for (const result of results) {
      const speakerKey = `${result.speaker}_${result.party}`;
      if (!speakerGroups.has(speakerKey)) {
        speakerGroups.set(speakerKey, []);
      }
      speakerGroups.get(speakerKey)!.push(result);
    }

    console.log(`📊 Grouped into ${speakerGroups.size} speakers`);

    // 各発言者グループをチャンクに分割（同一発言者の発言をまとめて処理）
    const chunks: SpeechResult[][] = [];
    for (const [_, speeches] of speakerGroups) {
      // 発言者ごとにチャンク化
      for (let i = 0; i < speeches.length; i += CHAIN_OF_AGENTS_CHUNK_SIZE) {
        const chunk = speeches.slice(i, i + CHAIN_OF_AGENTS_CHUNK_SIZE);
        chunks.push(chunk);
      }
    }

    console.log(`📦 Split into ${chunks.length} chunks for processing`);

    // Step 1: 各チャンクを直列処理でサブ要約
    console.log(`⚙️ Step 1: Generating sub-summaries...`);
    const subSummaries: SubSummaryResult[] = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const subSummary = await this.generateSubSummary(
        chunks[chunkIndex],
        chunkIndex,
        query,
      );
      subSummaries.push(subSummary);
      console.log(
        `  ✓ Generated sub-summary ${chunkIndex + 1}/${chunks.length}`,
      );
    }

    console.log(`✅ Generated ${subSummaries.length} sub-summaries`);

    // サブ要約をフラット化して保存
    const allSubSummaries = subSummaries.flatMap((s) => s.summaries);

    // Step 2: 中間統合
    console.log(`⚙️ Step 2: Intermediate consolidation...`);
    let midSummaries: MidSummary[] = [];

    if (subSummaries.length > MID_CONSOLIDATION_THRESHOLD) {
      midSummaries = await this.consolidateIntermediate(subSummaries, query);
    } else {
      // 単一チャンクの場合は直接変換
      // 観点別にグループ化
      midSummaries = this.groupByViewpoint(allSubSummaries);
    }

    console.log(`✅ Created ${midSummaries.length} viewpoint groups`);

    // Step 3: 最終回答生成
    console.log(`⚙️ Step 3: Final answer generation...`);

    // 各観点に対応する代表的なspeechIdとURLを含む詳細なコンテキストを作成
    const finalContextWithUrls = midSummaries
      .map((m) => {
        // 各観点の代表的なspeechIdを取得（最初の3つまで）
        const representativeSpeechIds = m.speechIds.slice(0, 3);
        const urls = representativeSpeechIds
          .map((id) => speechMap.get(id)?.url)
          .filter((url) => url)
          .join(", ");

        return `観点: ${m.viewpoint}
要約: ${m.viewpointSummary}
関連発言数: ${m.speechIds.length}件
代表的な出典: ${urls || "なし"}`;
      })
      .join("\n\n");

    const finalPrompt = createFinalAnswerPrompt(query, finalContextWithUrls);

    try {
      const completion = await openaiClient.chat.completions.create({
        task: "answer_generation",
        messages: [
          {
            role: "system",
            content: getFinalAnswerSystemPrompt(),
          },
          { role: "user", content: finalPrompt },
        ],
        max_tokens: 8192,
        temperature: 0.7,
        stream: false,
      });

      // deno-lint-ignore no-explicit-any
      const overallSummary = (completion as any).choices[0]?.message?.content;
      if (!overallSummary) {
        throw new Error("No text in completion response");
      }

      console.log(`✅ Final answer generated successfully`);

      // Step 4: 最終的なMarkdown生成
      return this.formatFinalMarkdown(
        overallSummary,
        midSummaries,
        speechMap,
        allSubSummaries,
      );
    } catch (error) {
      console.error("❌ Final answer generation error:", error);
      return this.generateSimpleAnswer(query, results);
    }
  }

  /**
   * Generate simple answer (fallback method)
   */
  async generateSimpleAnswer(
    query: string,
    results: SpeechResult[],
  ): Promise<string> {
    const context = formatSpeechResultsForPrompt(results);
    const prompt = createSimpleAnswerPrompt(query, context);

    try {
      const completion = await openaiClient.chat.completions.create({
        task: "answer_generation",
        messages: [
          { role: "system", content: getSimpleAnswerSystemPrompt() },
          { role: "user", content: prompt },
        ],
        max_tokens: 8192,
        temperature: 0.7,
        stream: false,
      });

      // deno-lint-ignore no-explicit-any
      const text = (completion as any).choices[0]?.message?.content;
      if (!text) {
        throw new Error("No text in completion response");
      }
      return text;
    } catch (error) {
      console.error("❌ LLM generation error:", error);
      return `検索結果に基づく情報:

${
        results
          .map(
            (result, index) =>
              `${index + 1}. ${result.speaker} (${result.party})
   日付: ${result.date}
   会議: ${result.meeting}
   内容: ${result.content.substring(0, CONTENT_PREVIEW_LENGTH)}...
   出典: ${result.url}
   関連度: ${result.score.toFixed(3)}`,
          )
          .join("\n\n")
      }`;
    }
  }
}
