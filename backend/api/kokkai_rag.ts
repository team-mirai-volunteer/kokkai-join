#!/usr/bin/env -S deno run -A --watch

// Kokkai RAG Service (検索専用: DBベクトル検索の結果のみ返す)

import { load } from "@std/dotenv";
import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";
import { prettyJSON } from "@hono/hono/pretty-json";
import { validator } from "@hono/hono/validator";

import { Pool } from "pg";

import { DEFAULT_TOP_K_RESULTS, MAX_DB_CONNECTIONS } from "../config/constants.ts";
import type { DocumentResult } from "../types/knowledge.ts";
import type { SpeechResult } from "../types/kokkai.ts";
import { VectorSearchService } from "../services/vector-search.ts";
import { ensureEnv } from "../utils/env.ts";

interface RagSearchRequest {
  query: string;
  limit?: number;
}
interface RagSearchResponse {
  results: DocumentResult[];
  meta: { total: number; tookMs: number; timestamp: string };
}

/**
 * Convert SpeechResult to DocumentResult for unified response format
 */
function mapSpeechToDocument(r: SpeechResult): DocumentResult {
  return {
    id: r.speechId,
    title: r.meeting || undefined,
    content: r.content,
    url: r.url || undefined,
    date: r.date || undefined,
    author: r.speaker ? `${r.speaker} (${r.party})` : undefined,
    score: r.score,
    source: { providerId: "kokkai-db", type: "kokkai-db" },
    extras: {
      speaker: r.speaker,
      party: r.party,
      meeting: r.meeting,
    },
  };
}

class KokkaiRagApi {
  private dbPool: Pool;
  private vectorSearch!: VectorSearchService;
  private app = new Hono();

  constructor() {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(
      "*",
      cors({
        origin: "*",
        allowMethods: ["GET", "POST"],
        allowHeaders: ["Content-Type"],
      }),
    );
    this.app.use("*", logger());
    this.app.use("*", prettyJSON());
  }

  private setupRoutes() {
    this.app.get(
      "/v1/health",
      (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }),
    );

    this.app.post(
      "/v1/search",
      validator("json", (value, c) => {
        const { query, limit } = value as RagSearchRequest;
        if (!query || typeof query !== "string" || query.trim().length === 0) {
          return c.json({ error: "query is required" }, 400);
        }
        if (
          limit !== undefined &&
          (typeof limit !== "number" || limit < 1 || limit > 100)
        ) {
          return c.json({ error: "limit must be 1..100" }, 400);
        }
        return value;
      }),
      async (c) => {
        const start = Date.now();
        try {
          const { query, limit = DEFAULT_TOP_K_RESULTS } = await c.req.json<RagSearchRequest>();
          const speeches = await this.vectorSearch.simpleSearch(query, limit);
          const docs = speeches.map(mapSpeechToDocument);
          const resp: RagSearchResponse = {
            results: docs,
            meta: {
              total: docs.length,
              tookMs: Date.now() - start,
              timestamp: new Date().toISOString(),
            },
          };
          return c.json(resp);
        } catch (e) {
          return c.json(
            { error: "internal", message: (e as Error).message },
            500,
          );
        }
      },
    );

    this.app.notFound((c) => c.json({ error: "Not Found" }, 404));
    this.app.onError((err, c) =>
      c.json({ error: "Internal Server Error", message: err.message }, 500)
    );
  }

  async initialize(): Promise<void> {
    await load({ export: true });
    const databaseUrl = ensureEnv("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    this.dbPool = new Pool({
      connectionString: databaseUrl,
      max: MAX_DB_CONNECTIONS,
      query_timeout: 10000,
      statement_timeout: 10000,
    });
    this.vectorSearch = new VectorSearchService(this.dbPool);
  }

  serve(port = parseInt(Deno.env.get("KOKKAI_RAG_PORT") || "8001")) {
    console.log(`🚀 Kokkai RAG API listening on http://localhost:${port}`);
    Deno.serve(
      {
        port,
        onListen: ({ port }) => {
          console.log(`🚀 Kokkai RAG API is running on port ${port}`);
          console.log("Endpoints:");
          console.log("  GET  /v1/health");
          console.log("  POST /v1/search");
        },
      },
      this.app.fetch,
    );
  }
}

if (import.meta.main) {
  const api = new KokkaiRagApi();
  await api.initialize();
  api.serve();
}
