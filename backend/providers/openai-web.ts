import type { ProviderQuery, DocumentResult } from "../types/knowledge.ts";
import type { SearchProvider } from "./base.ts";
import OpenAI from "npm:openai";

interface OpenAIWebConfig {
  id?: string; // default: "openai-web"
  apiKey?: string; // from env OPENAI_API_KEY if omitted
  model?: string; // default: gpt-4o-mini
  timeoutMs?: number; // default: 20000
  maxPerSubquery?: number; // default: 5
  maxQueriesPerCall?: number; // default: 3 (subquery数の上限)
}

/**
 * OpenAI Web 検索プロバイダ。
 *
 * - OpenAI Responses API + web_search_preview を利用して Web 検索結果を取得。
 * - 返却は DocumentResult の配列（title/url/snippet/date など）に正規化。
 */
export class OpenAIWebProvider implements SearchProvider {
  id: string;
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private maxPerSubquery: number;
  private maxQueriesPerCall: number;
  private client: OpenAI;

  constructor(cfg?: OpenAIWebConfig) {
    this.id = cfg?.id ?? "openai-web";
    const key = cfg?.apiKey ?? Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is required for OpenAIWebProvider");
    this.apiKey = key;
    this.model = cfg?.model ?? "gpt-4o-mini";
    this.timeoutMs = cfg?.timeoutMs ?? 20000;
    this.maxPerSubquery = cfg?.maxPerSubquery ?? 5;
    this.maxQueriesPerCall = cfg?.maxQueriesPerCall ?? parseInt(Deno.env.get("OPENAI_WEB_MAX_SUBQS") || "3");
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  /** サブクエリごとにOpenAIへ検索を投げ、結果をマージして返す */
  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    const subqsAll = q.subqueries?.length ? q.subqueries : [q.originalQuestion];
    const subqs = subqsAll.slice(0, Math.max(1, this.maxQueriesPerCall));
    const limitPer = Math.max(1, Math.min(this.maxPerSubquery, Math.floor((q.limit || 10) / subqs.length) || 1));
    const tasks = subqs.map((s, i) => this.searchOne(s, limitPer, i));
    const arrays = await Promise.all(tasks);
    const merged = arrays.flat();
    // Dedup by URL
    const seen = new Set<string>();
    const out: DocumentResult[] = [];
    for (const d of merged) {
      const key = d.url || `${d.source.providerId}:${d.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    }
    return out;
  }

  /** 1サブクエリ分の検索を実行し、結果を DocumentResult に変換 */
  private async searchOne(subq: string, limit: number, idx: number): Promise<DocumentResult[]> {
    // SDKでResponses APIを呼び、web_search_previewツールを有効化。JSONスキーマで構造化結果を要求
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await this.client.responses.create({
        model: this.model,
        tools: [{ type: "web_search_preview" }],
        tool_choice: { type: "web_search_preview" },
        // 指示は簡潔に。モデルに結果JSONのみに集中させる（スキーマは口頭指定）
        input: `Search the web for: ${subq}. Return ONLY valid JSON (no prose) with shape {"results":[{"id":string,"title":string,"url":string,"date"?:string,"snippet"?:string,"score"?:number}]}. Limit to ${limit} items.`,
      }, { signal: controller.signal });
      const raw = resp.output_text?.trim();
      if (!raw) return [];
      let parsed: { results?: Array<Record<string, unknown>> } = {};
      try { parsed = JSON.parse(raw); } catch { return []; }
      const items = Array.isArray(parsed.results) ? parsed.results : [];
      const docs: DocumentResult[] = items.map((it, j) => {
        const id = String(it.id ?? `${this.id}:${idx}:${j}`);
        const title = typeof it.title === "string" ? it.title : undefined;
        const url = typeof it.url === "string" ? it.url : undefined;
        const date = typeof (it as any).date === "string" ? (it as any).date : undefined;
        const snippet = typeof (it as any).snippet === "string" ? (it as any).snippet : undefined;
        const score = typeof (it as any).score === "number" ? (it as any).score : undefined;
        return {
          id,
          title,
          url,
          date,
          content: snippet ?? "",
          author: undefined,
          score,
          source: { providerId: this.id, type: this.id },
          extras: { subquery: subq },
        };
      });
      return docs;
    } finally {
      clearTimeout(timeout);
    }
  }
}
