import { ProviderID } from "../config/constants.js";
import { getOpenAIClient } from "../config/openai.js";
import type { DocumentResult } from "../types/knowledge.js";

const SECTION_KEYS = [
  "purpose_overview",
  "current_status",
  "timeline",
  "key_points",
  "background",
  "main_issues",
  "reasons_for_amendment",
  "impact_analysis",
  "past_debates_summary",
] as const;

const MIN_RELEVANCE = 0.5;
const DEFAULT_MODEL = "openai/gpt-4o";

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface PDFSectionExtractionParams {
  query: string;
  fileBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
}

interface PDFSectionContent {
  sections: Array<{
    pageNumber: number;
    content: string;
    relevance: number;
    keywords: string[];
  }>;
}

interface PDFExtractionResponse {
  purpose_overview: PDFSectionContent | null;
  current_status: PDFSectionContent | null;
  timeline: PDFSectionContent | null;
  key_points: PDFSectionContent | null;
  background: PDFSectionContent | null;
  main_issues: PDFSectionContent | null;
  reasons_for_amendment: PDFSectionContent | null;
  impact_analysis: PDFSectionContent | null;
  past_debates_summary: PDFSectionContent | null;
}

export interface PDFSectionResult {
  sectionKey: SectionKey;
  docs: DocumentResult[];
}

export class PDFSectionExtractionService {
  constructor(private readonly model: string = DEFAULT_MODEL) {}

  async extractBySections(
    params: PDFSectionExtractionParams,
  ): Promise<PDFSectionResult[]> {
    const { query, fileBuffer, mimeType = "application/pdf" } = params;
    const client = getOpenAIClient();

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query);
    const fileData = this.encodeFileAsDataUri(fileBuffer, mimeType);

    const requestPayload = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "file",
              file: {
                filename: params.fileName,
                file_data: fileData,
              },
            },
          ],
        },
      ],
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pdf_all_sections_extraction",
          strict: true,
          schema: this.getAllSectionsSchema(),
        },
      },
      plugins: [
        {
          id: "file-parser",
          pdf: {
            engine: "pdf-text",
          },
        },
      ],
    };

    let rawContent: string | undefined;
    try {
      const completionResponse = await client.chat.completions.create(
        requestPayload as never,
      );
      if (
        typeof completionResponse !== "object" ||
        completionResponse === null ||
        !("choices" in completionResponse)
      ) {
        throw new Error("Streaming completion returned without choices");
      }
      const completion = completionResponse as {
        choices: Array<{ message?: { content?: string } }>;
      };
      rawContent = completion.choices[0]?.message?.content?.trim();
      if (!rawContent) {
        throw new Error("Empty completion content for PDF extraction");
      }
    } catch (error) {
      // OpenRouter/OpenAI APIエラーの詳細を抽出
      let errorDetails = (error as Error).message;
      if (error && typeof error === "object" && "error" in error) {
        const apiError = error as { error?: { metadata?: { raw?: string } } };
        if (apiError.error?.metadata?.raw) {
          console.error(
            "[PDF] Provider error details:",
            apiError.error.metadata.raw,
          );
          // プロバイダーエラーの詳細をメッセージに含める
          try {
            const parsedError = JSON.parse(apiError.error.metadata.raw);
            if (parsedError.error?.message) {
              errorDetails = parsedError.error.message;
            }
          } catch {
            // JSON parseに失敗した場合はrawをそのまま使用
            errorDetails = apiError.error.metadata.raw;
          }
        }
      }

      throw new Error(`[PDF] Failed to extract sections: ${errorDetails}`);
    }

    let parsed: PDFExtractionResponse;
    try {
      parsed = JSON.parse(rawContent) as PDFExtractionResponse;
    } catch (error) {
      throw new Error(
        `[PDF] Failed to parse extraction response as JSON: ${(error as Error).message}`,
      );
    }

    return this.convertToSectionResults(parsed);
  }

  private buildSystemPrompt(): string {
    return `あなたは政策リサーチ用のアシスタントです。アップロードされた日本語PDFから、指定されたセクションに関連するテキスト断片を抽出し、JSONで返してください。各セクションは目的に基づいて関連度の高い段落を最大3件抽出し、ページ番号・要約テキスト・関連キーワード・関連度スコア(0-1)を含めてください。`;
  }

  private buildUserPrompt(query: string): string {
    return [
      "ユーザーのリサーチクエリに基づき、PDFから関連テキストを抽出してください。",
      "各セクションでは、関連度が0.5未満の内容は除外してください。",
      "抽出対象セクション:",
      "- purpose_overview: 目的・概要",
      "- current_status: 現状・最新情報",
      "- timeline: 重要な出来事の時系列",
      "- key_points: 主要なポイント",
      "- background: 背景",
      "- main_issues: 主要な論点",
      "- reasons_for_amendment: 法改正の理由",
      "- impact_analysis: 影響分析",
      "- past_debates_summary: 過去の議論サマリー",
      "返却形式はJSONスキーマに準拠してください。",
      `検索クエリ: "${query}"`,
    ].join("\n");
  }

  private getAllSectionsSchema(): Record<string, unknown> {
    const sectionRef = {
      anyOf: [{ $ref: "#/definitions/sectionContent" }, { type: "null" }],
    };
    return {
      type: "object",
      properties: SECTION_KEYS.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sectionRef;
        return acc;
      }, {}),
      required: [...SECTION_KEYS],
      additionalProperties: false,
      definitions: {
        sectionContent: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pageNumber: { type: "number" },
                  content: { type: "string" },
                  relevance: { type: "number", minimum: 0, maximum: 1 },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["pageNumber", "content", "relevance", "keywords"],
                additionalProperties: false,
              },
            },
          },
          required: ["sections"],
          additionalProperties: false,
        },
      },
    };
  }

  private convertToSectionResults(
    response: PDFExtractionResponse,
  ): PDFSectionResult[] {
    const results: PDFSectionResult[] = [];

    for (const sectionKey of SECTION_KEYS) {
      const sectionContent = response[sectionKey];
      if (!sectionContent?.sections?.length) continue;

      const docs: DocumentResult[] = [];
      sectionContent.sections.forEach((item, index) => {
        if (
          typeof item.relevance === "number" &&
          item.relevance < MIN_RELEVANCE
        ) {
          return;
        }
        const pageNumber = item.pageNumber ?? 0;
        docs.push({
          id: `pdf-${sectionKey}-p${pageNumber}-${index}`,
          title: `Uploaded PDF - Page ${pageNumber}`,
          content: item.content,
          score: item.relevance,
          source: {
            providerId: ProviderID.PDFExtract,
            type: ProviderID.PDFExtract,
          },
          extras: {
            pageNumber,
            keywords: item.keywords,
            sectionKey,
            relevance: item.relevance,
          },
        });
      });

      if (docs.length > 0) {
        results.push({ sectionKey, docs });
      }
    }

    return results;
  }

  private encodeFileAsDataUri(buffer: Buffer, mimeType: string): string {
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }
}
