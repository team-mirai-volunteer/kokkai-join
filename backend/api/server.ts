#!/usr/bin/env -S deno run -A

// Standard library imports
import { load } from "jsr:@std/dotenv";

// Third-party library imports
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { logger } from "jsr:@hono/hono/logger";
import { prettyJSON } from "jsr:@hono/hono/pretty-json";
import { validator } from "jsr:@hono/hono/validator";

// Local imports
import type { SpeechResult } from "../types/kokkai.ts";
import { DEFAULT_TOP_K_RESULTS } from "../config/constants.ts";
import { QueryPlanningService } from "../services/query-planning.ts";
import { RelevanceEvaluationService } from "../services/relevance-evaluation.ts";
import { ProviderRegistry } from "../services/provider-registry.ts";
import type { DocumentResult } from "../types/knowledge.ts";
import { documentToSpeech } from "../providers/adapter.ts";
import { HttpDocsProvider } from "../providers/http-docs.ts";
import type {
  DeepResearchRequest,
  DeepResearchResponse,
  EvidenceRecord,
} from "../types/deepresearch.ts";
import { toEvidenceRecord } from "../types/deepresearch.ts";
import { convertDeepResearchToMarkdown } from "../utils/markdown-converter.ts";
import { SectionSynthesisService } from "../services/section-synthesis.ts";
import { DeepResearchOrchestrator } from "../services/deepresearch-orchestrator.ts";

/**
 * Kokkai Deep Research API Server using Hono
 */
class KokkaiDeepResearchAPI {
  private queryPlanningService!: QueryPlanningService;
  private relevanceEvaluationService!: RelevanceEvaluationService;
  private providerRegistry!: ProviderRegistry;
  private sectionSynthesis!: SectionSynthesisService;
  private orchestrator!: DeepResearchOrchestrator;
  private app: Hono;

  constructor() {
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Hono middleware
   */
  private setupMiddleware(): void {
    // CORS for cross-origin requests
    this.app.use(
      "*",
      cors({
        origin: "*",
        allowMethods: ["GET", "POST"],
        allowHeaders: ["Content-Type"],
      }),
    );

    // Logger middleware
    this.app.use("*", logger());

    // Pretty JSON responses
    this.app.use("*", prettyJSON());
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Deep Research v1 endpoint
    this.app.post(
      "/v1/deepresearch",
      validator("json", (value, c) => {
        const v = value as DeepResearchRequest;
        if (
          !v.query ||
          typeof v.query !== "string" ||
          v.query.trim().length === 0
        ) {
          return c.json({ error: "query is required" }, 400);
        }
        if (
          v.limit !== undefined &&
          (typeof v.limit !== "number" || v.limit < 1 || v.limit > 100)
        ) {
          return c.json({ error: "limit must be 1..100" }, 400);
        }
        if (
          v.providers &&
          (!Array.isArray(v.providers) ||
            v.providers.some((p) => typeof p !== "string"))
        ) {
          return c.json({ error: "providers must be string[]" }, 400);
        }
        if (
          v.seedUrls &&
          (!Array.isArray(v.seedUrls) ||
            v.seedUrls.some(
              (u) => typeof u !== "string" || !/^https?:\/\//.test(u),
            ))
        ) {
          return c.json({ error: "seedUrls must be http(s) URLs" }, 400);
        }
        return value;
      }),
      async (c) => {
        const start = Date.now();
        try {
          const req = await c.req.json<DeepResearchRequest>();
          const resp = await this.executeDeepResearchV1(req);
          console.log(
            `✅ /v1/deepresearch completed in ${Date.now() - start}ms`,
          );
          Deno.writeFileSync(
            "./result.json",
            new TextEncoder().encode(JSON.stringify(resp, null, 2)),
          );
          const markdown = convertDeepResearchToMarkdown(resp);
          return c.text(markdown, 200, {
            "Content-Type": "text/markdown; charset=utf-8",
          });
        } catch (e) {
          const msg = (e as Error).message;
          console.error("/v1/deepresearch error:", msg);
          return c.json({ error: "internal", message: msg }, 500);
        }
      },
    );

    // Root endpoint
    this.app.get("/", (c) => {
      return c.json({
        name: "Kokkai Deep Research API",
        version: "1.0.0",
        description: "Deep Research API for Japanese parliamentary records analysis",
        endpoints: {
          "/": "This endpoint",
          "/v1/deepresearch": "POST - Deep research pipeline returning sections and citations",
        },
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.notFound((c) => {
      return c.json(
        {
          error: "Not Found",
          message: "The requested endpoint does not exist",
          timestamp: new Date().toISOString(),
        },
        404,
      );
    });

    // Error handler
    this.app.onError((err, c) => {
      console.error("🚨 Unhandled error:", err);
      return c.json(
        {
          error: "Internal Server Error",
          message: err.message,
          timestamp: new Date().toISOString(),
        },
        500,
      );
    });
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    await load({ export: true });
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    console.log("🚀 Initializing Kokkai Deep Research API (provider-based)...");
    this.queryPlanningService = new QueryPlanningService();
    this.relevanceEvaluationService = new RelevanceEvaluationService();
    this.providerRegistry = new ProviderRegistry();
    this.sectionSynthesis = new SectionSynthesisService();
    this.orchestrator = new DeepResearchOrchestrator();
    console.log("✅ Services initialized");
  }

  /**
   * Deep Research v1 のメイン実行関数。
   *
   * 処理の概要（高レベル）
   * - 1) プランニング: 質問からサブクエリを作成
   * - 2) セクション別ターゲット探索: セクションごとに許可プロバイダを切り替えて取得
   * - 3) ギャップ充足ループ: 充足状況を見ながら最大3回まで再探索（早期終了あり）
   * - 4) マージ/重複排除 → 関連度評価（LLM）
   * - 5) 証拠レコード（e1..）化（どのセクションでヒットしたかのヒントも付与）
   * - 6) セクション統合（LLMで最終JSONを生成）
   *
   * 返却するレスポンスは agreed JSON（sections/sources/evidences/metadata）形式。
   */
  private async executeDeepResearchV1(
    body: DeepResearchRequest,
  ): Promise<DeepResearchResponse> {
    const start = Date.now();
    const limit = body.limit ?? DEFAULT_TOP_K_RESULTS;
    console.log(
      `[DRV1] ▶ Start deepresearch query="${body.query}" limit=${limit}`,
    );
    const providersRequested = body.providers && body.providers.length > 0
      ? body.providers
      : undefined;
    const providers = this.providerRegistry.byIds(providersRequested);
    const providerIds = providers.map((p) => p.id);
    const docsProvider = body.seedUrls && body.seedUrls.length > 0 ? new HttpDocsProvider() : null;
    if (docsProvider) providerIds.push(docsProvider.id);
    console.log(
      `[DRV1] Providers: ${providerIds.join(", ")} seedUrls=${body.seedUrls?.length ?? 0}`,
    );

    // 1) プランニング（サブクエリ生成）
    console.log("[DRV1] ▶ Planning subqueries...");
    let plan;
    try {
      plan = await this.queryPlanningService.createQueryPlan(body.query);
    } catch (e) {
      console.error("[DRV1][plan] error:", (e as Error).message);
      throw new Error(`[DRV1][plan] ${(e as Error).message}`);
    }
    const subqueries = plan.subqueries && plan.subqueries.length > 0
      ? plan.subqueries
      : [body.query];

    // 2)+3) DeepResearchOrchestrator に委譲
    const allowBySection: Record<string, string[]> = {
      purpose_overview: ["openai-web"],
      current_status: ["kokkai-db", "openai-web"],
      timeline: ["kokkai-db", "openai-web"],
      key_points: ["openai-web"],
      background: ["openai-web", "kokkai-db"],
      main_issues: ["openai-web", "kokkai-db"],
      past_debates_summary: ["kokkai-db"],
      status_notes: ["kokkai-db", "openai-web"],
      related_links: ["openai-web", "kokkai-db"],
    };
    const targets: Record<string, number> = {
      purpose_overview: 2,
      current_status: 1,
      timeline: 3,
      key_points: 3,
      background: 2,
      main_issues: 3,
      past_debates_summary: 3,
      status_notes: 1,
      related_links: 3,
    };
    const { allDocs, sectionHitMap, iterations } = await this.orchestrator.run({
      userQuery: body.query,
      baseSubqueries: subqueries,
      providers,
      allowBySection,
      targets,
      limit,
      seedUrls: body.seedUrls,
      docsProvider,
    });

    // Ensure uniqueness
    console.log(`[DRV1] ▶ Merging & dedup totalDocs=${allDocs.length}`);
    const finalDocs: DocumentResult[] = [];
    const seen = new Set<string>();
    for (const d of allDocs) {
      const key = d.url || `${d.source.providerId}:${d.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      finalDocs.push(d);
    }
    console.log(`[DRV1] ◀ After dedup finalDocs=${finalDocs.length}`);

    // 4) 関連度評価（LLM）用に SpeechResult に正規化して再ランク
    console.log("[DRV1] ▶ Relevance evaluation...");
    const speeches = finalDocs.map(documentToSpeech);
    let relevant: SpeechResult[];
    try {
      relevant = await this.relevanceEvaluationService.evaluateRelevance(
        body.query,
        speeches,
      );
    } catch (e) {
      console.error("[DRV1][relevance] error:", (e as Error).message);
      throw new Error(`[DRV1][relevance] ${(e as Error).message}`);
    }
    const topRelevant = relevant.slice(0, limit);
    console.log(
      `[DRV1] ◀ Relevance kept=${relevant.length} top=${topRelevant.length}`,
    );

    // 5) e1.. の連番で EvidenceRecord を構築（セクションヒントを付与）
    console.log("[DRV1] ▶ Building evidences...");
    const evidenceMap = new Map<string, EvidenceRecord>();
    const evidences: EvidenceRecord[] = [];
    let ecount = 0;
    for (const d of finalDocs) {
      const key = d.url || `${d.source.providerId}:${d.id}`;
      if (evidenceMap.has(key)) continue;
      ecount += 1;
      const eid = `e${ecount}`;
      const rec = toEvidenceRecord(d, eid);
      const hints = sectionHitMap.get(key);
      if (hints && hints.size) rec.sectionHints = Array.from(hints);
      evidenceMap.set(key, rec);
      evidences.push(rec);
    }
    console.log(`[DRV1] ◀ Evidences built count=${evidences.length}`);

    // 6) セクション統合
    console.log("[DRV1] ▶ Section synthesize...");
    const sections = await this.sectionSynthesis.synthesize(
      body.query,
      body.asOfDate,
      evidences,
    );

    const resp: DeepResearchResponse = {
      query: body.query,
      asOfDate: body.asOfDate,
      sections,
      evidences,
      metadata: {
        usedProviders: providerIds,
        iterations,
        totalResults: finalDocs.length,
        processingTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        version: "deepresearch-v1",
      },
    };
    return resp;
  }

  /**
   * Start the server
   */
  serve(port: number = 8000): void {
    console.log(`🚀 Starting server on port ${port}...`);

    Deno.serve(
      {
        port,
        onListen: ({ port, hostname }) => {
          console.log(`🌐 Server running at http://${hostname}:${port}`);
          console.log("📋 Available endpoints:");
          console.log(`   GET  /                - API information`);
          console.log(
            `   POST /v1/deepresearch - Deep research pipeline (sections+citations)`,
          );
        },
      },
      this.app.fetch,
    );
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {}
}

// Main execution
if (import.meta.main) {
  const api = new KokkaiDeepResearchAPI();

  try {
    await api.initialize();

    const handleShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await api.close();
      Deno.exit(0);
    };
    Deno.addSignalListener("SIGINT", () => handleShutdown("SIGINT"));
    Deno.addSignalListener("SIGTERM", () => handleShutdown("SIGTERM"));

    const port = parseInt(Deno.env.get("PORT") || "8000");
    api.serve(port);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await api.close();
    Deno.exit(1);
  }
}
