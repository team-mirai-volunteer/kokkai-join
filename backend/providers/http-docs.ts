import type { ProviderQuery, DocumentResult } from "../types/knowledge.ts";
import type { SearchProvider } from "./base.ts";

interface HttpDocsConfig {
  id?: string; // default: "seed-docs"
  timeoutMs?: number; // per request
  maxBytes?: number; // max response bytes
}

/**
 * HttpDocsProvider
 * - Not a search engine. It fetches the exact URLs provided via query.seedUrls and
 *   extracts plain text content (best-effort for HTML). PDF is detected and kept as reference
 *   with no text extraction in v1.
 */
/**
 * HttpDocsProvider
 * - seedUrls に含まれるURLをそのまま取得してテキスト化するプロバイダ。
 * - 検索は行わない（指定リソースのフェッチ専用）。
 * - v1ではPDFのテキスト抽出は行わず、プレースホルダのexcerptを返す。
 */
export class HttpDocsProvider implements SearchProvider {
  id: string;
  private timeoutMs: number;
  private maxBytes: number;

  constructor(cfg?: HttpDocsConfig) {
    this.id = cfg?.id ?? "seed-docs";
    this.timeoutMs = cfg?.timeoutMs ?? 15000;
    this.maxBytes = cfg?.maxBytes ?? 2_000_000; // 2MB per URL cap
  }

  /** 指定された seedUrls の本文を取得して DocumentResult に変換 */
  async search(q: ProviderQuery): Promise<DocumentResult[]> {
    const urls = q.seedUrls ?? [];
    if (!urls.length) return [];

    const tasks = urls.map((url, idx) => this.fetchOne(url, idx));
    const docs = await Promise.all(tasks);
    // filter failures
    return docs.filter((d): d is DocumentResult => !!d);
  }

  private async fetchOne(url: string, idx: number): Promise<DocumentResult | null> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      const ct = resp.headers.get("content-type") || "";
      if (!resp.ok) return null;
      // Limit bytes
      const reader = resp.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > this.maxBytes) break;
          chunks.push(value);
        }
      }
      const buf = concat(chunks);
      let text = "";
      if (ct.includes("application/pdf")) {
        // v1: do not extract PDF text; keep as placeholder excerpt
        text = "PDF document (text extraction not enabled in v1).";
      } else {
        const dec = new TextDecoder(detectEncoding(buf, ct));
        const raw = dec.decode(buf);
        text = ct.includes("html") ? stripHtml(raw) : raw;
      }
      return {
        id: `${this.id}:${idx}`,
        title: undefined,
        content: text,
        url,
        date: undefined,
        author: undefined,
        score: 0.5, // neutral baseline; RAG/LLM will re-rank
        source: { providerId: this.id, type: this.id },
        extras: {},
      };
    } catch (_e) {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out;
}

function detectEncoding(_buf: Uint8Array, contentType: string): string {
  // Very light heuristic: rely on HTTP header charset if present, else utf-8
  const m = /charset=([^;]+)/i.exec(contentType);
  return m?.[1]?.toLowerCase() || "utf-8";
}

function stripHtml(html: string): string {
  // Best-effort HTML to text: remove scripts/styles, tags, collapse whitespace
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
                       .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const noTags = noScript.replace(/<[^>]+>/g, " ");
  return noTags.replace(/[\t\r\n]+/g, "\n").replace(/\u00A0/g, " ").trim();
}
