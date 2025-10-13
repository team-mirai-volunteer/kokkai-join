import { ProviderID } from "../config/constants.js";
import type { DocumentResult, ProviderQuery } from "../types/knowledge.js";
import { ensureEnv } from "../utils/env.js";
import type { SearchProvider } from "./base.js";

/**
 * Gov-Meeting-RAG API レスポンスの個別アイテム
 */
interface GovMeetingResult {
  url: string;
  council_name: string;
  date: string;
  chunk_text: string;
  score: number;
  match_count: number;
}

/**
 * Gov-Meeting-RAG API リクエストボディ
 */
interface GovMeetingSearchRequest {
  query: string;
  top_k: number;
}

/**
 * Gov-Meeting-RAG Provider
 *
 * 政府会議録検索サービス (https://gov-meeting-rag.vercel.app) の統合。
 * 厚生労働省などの政府機関の会議録をRAGベースで検索する。
 */
export class GovMeetingRagProvider implements SearchProvider {
  readonly id = ProviderID.GovMeetingRag;
  private baseUrl = ensureEnv("GOV_MEETIN_GRAG_ENDPOINT");
  private timeoutMs = 30000; // 30 seconds

  /**
   * プロバイダークエリを実行し、DocumentResult形式で結果を返す
   */
  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    try {
      const results = await this.fetchResults(q.query, q.limit);
      return results.map((item) => this.mapToDocumentResult(item));
    } catch (error) {
      const err = error as Error;
      console.error(`[GovMeetingRagProvider] Search failed: ${err.message}`);
      // Graceful degradation: 外部APIのエラーでパイプライン全体を止めない
      return [];
    }
  }

  /**
   * Gov-Meeting-RAG APIにリクエストを送信
   */
  private async fetchResults(
    query: string,
    topK: number,
  ): Promise<GovMeetingResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const requestBody: GovMeetingSearchRequest = {
        query,
        top_k: topK,
      };

      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response is array
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected array");
      }

      return data as GovMeetingResult[];
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Gov-Meeting-RAG結果をDocumentResult形式に変換
   */
  private mapToDocumentResult(item: GovMeetingResult): DocumentResult {
    // Extract ID from URL
    const urlParts = item.url.split("/");
    const filename = urlParts[urlParts.length - 1] || "unknown";
    const id = filename.replace(".html", "");

    return {
      id: `gov-${id}`, // Prefix with "gov-" to avoid collision
      title: item.council_name,
      content: item.chunk_text,
      url: item.url,
      date: item.date,
      author: undefined, // Not provided by API
      score: item.score,
      source: {
        providerId: this.id,
        type: this.id,
      },
      extras: {
        match_count: item.match_count,
        council_name: item.council_name,
      },
    };
  }
}
