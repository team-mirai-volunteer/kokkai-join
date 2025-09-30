import { getOpenAIClient } from "../config/openai.js";
import type { DocumentResult, ProviderQuery } from "../types/knowledge.js";
import type { SearchProvider } from "./base.js";

/** Web検索結果の個別アイテム */
interface WebSearchResultItem {
  id: string;
  title: string;
  url: string;
  date: string;
  content: string;
  score: number;
}

/** Web検索結果のレスポンス */
interface WebSearchResponse {
  results: WebSearchResultItem[];
}

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "web_search_results",
    strict: true,
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          description: "Array of search results",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Unique identifier for this result",
              },
              title: {
                type: "string",
                description: "Title of the web page",
              },
              url: {
                type: "string",
                description: "URL of the web page",
              },
              date: {
                type: "string",
                description: "Publication date (YYYY-MM-DD format)",
              },
              content: {
                type: "string",
                description: "Summary or snippet of the content",
              },
              score: {
                type: "number",
                description: "Relevance score between 0 and 1",
              },
            },
            required: ["id", "title", "url", "date", "content", "score"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    },
  },
} as const;

/**
 * OpenAI Web 検索プロバイダ。
 *
 * - OpenAI Responses API + web_search_preview を利用して Web 検索結果を取得。
 * - 返却は DocumentResult の配列（title/url/content/date など）に正規化。
 */
export class OpenAIWebProvider implements SearchProvider {
  id: string;
  private timeoutMs: number;

  constructor() {
    this.id = "openai-web";
    this.timeoutMs = 120000;
  }

  /** サブクエリを統合して効率的に検索を実行 */
  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    // 統合クエリで1回だけ検索（重複を避け、効率的に）
    const limit = q.limit || 10;
    const docs = await this.searchOne(q.query, limit);
    return docs;
  }

  /** 1サブクエリ分の検索を実行し、結果を DocumentResult に変換 */
  private async searchOne(
    subq: string,
    limit: number,
  ): Promise<DocumentResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const client = getOpenAIClient();
    try {
      const resp = await client.chat.completions.create(
        {
          model: "openai/o4-mini:online",
          max_tokens: 16000,
          stream: false,
          messages: [
            {
              role: "system",
              content:
                "あなたはウェブ検索エンジンです。ユーザーのクエリに基づいて、関連性が高く多様なウェブ検索結果を見つけ出します。",
            },
            {
              role: "user",
              content: `以下のクエリについてウェブを包括的に検索してください: "${subq}"

指示:
1. 異なる観点をカバーする最も関連性が高く多様な結果を見つける
2. 利用可能な場合は最新情報（2023-2025年）を含める
3. 信頼できる情報源（政府、ニュース、学術機関）を優先する
4. 情報源の多様性を確保 - 同一ドメインからの複数の結果を避ける

最大${limit}件の高品質でユニークな結果を返してください。
リンク先に対象の情報があるものだけを返してください。`,
            },
          ],
          response_format: responseFormat,
        },
        { signal: controller.signal },
      );

      const raw = resp.choices[0]?.message?.content;
      if (!raw) return [];

      const parsed: WebSearchResponse = JSON.parse(raw);
      const docs: DocumentResult[] = parsed.results.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        date: item.date,
        content: item.content,
        score: item.score,
        source: { providerId: this.id, type: this.id },
        extras: { subquery: subq },
      }));
      return docs;
    } finally {
      clearTimeout(timeout);
    }
  }
}
