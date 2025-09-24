// Standard library imports
import { load } from "@std/dotenv";

// Third-party library imports
import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";
import { prettyJSON } from "@hono/hono/pretty-json";
import { vValidator } from "@hono/valibot-validator";

// Local imports
import { DEFAULT_TOP_K_RESULTS } from "../config/constants.ts";
import {
  SECTION_ALLOWED_PROVIDERS,
  SECTION_TARGET_COUNTS,
} from "../config/deepresearch-constants.ts";
import { QueryPlanningService } from "../services/query-planning.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import {
  DeepResearchRequestSchema,
  type DeepResearchRequestValidated,
} from "../schemas/deepresearch-validation.ts";
import type { DeepResearchResponse, EvidenceRecord } from "../types/deepresearch.ts";
import { toEvidenceRecord } from "../types/deepresearch.ts";
import { convertDeepResearchToMarkdown } from "../utils/markdown-converter.ts";
import { SectionSynthesisService } from "../services/section-synthesis.ts";
import { DeepResearchOrchestrator } from "../services/deepresearch-orchestrator.ts";

/**
 * Kokkai Deep Research API Server using Hono
 */
class KokkaiDeepResearchAPI {
  private queryPlanningService!: QueryPlanningService;
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
      vValidator("json", DeepResearchRequestSchema),
      async (c) => {
        const start = Date.now();
        try {
          const req = c.req.valid("json");
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

    // Initialize services
    this.queryPlanningService = new QueryPlanningService();
    this.providerRegistry = new ProviderRegistry();
    this.sectionSynthesis = new SectionSynthesisService();
    this.orchestrator = new DeepResearchOrchestrator();

    console.log("✅ Services initialized");
  }

  /**
   * Deep Research v1 のメイン実行関数。
   *
   * 処理フロー:
   * 1. クエリプランニング
   *    - ユーザーのクエリを分析し、効果的なサブクエリに分解
   *    - 各サブクエリは異なる観点から情報を収集するために設計される
   *
   * 2. プロバイダー選択と検索実行
   *    - 利用可能なプロバイダーから適切なものを選択
   *    - DeepResearchOrchestratorに処理を委譲し、セクション別に検索を実行
   *    - 各セクションごとに許可されたプロバイダーとターゲット件数が設定される
   *
   * 3. 結果のマージと重複排除
   *    - 複数のプロバイダーからの結果を統合
   *    - URLまたはID基準で重複を除去
   *
   * 4. 証拠レコード生成
   *    - 各ドキュメントに一意のID（e1, e2, ...）を付与
   *    - どのセクションで使用されたかのヒント情報を追加
   *
   * 5. セクション統合（AI処理）
   *    - 収集された証拠を基に、構造化されたセクションを生成
   *    - 最終的なレスポンス形式に整形
   *
   * @param body バリデーション済みのリクエストボディ
   * @returns 構造化されたDeepResearchResponse（セクション、証拠、メタデータを含む）
   */
  private async executeDeepResearchV1(
    body: DeepResearchRequestValidated,
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
    console.log(`[DRV1] Providers: ${providerIds.join(", ")}`);

    // 1) プランニング（サブクエリ生成）
    console.log("[DRV1] ▶ Planning subqueries...");
    let plan;
    try {
      plan = await this.queryPlanningService.createQueryPlan(body.query);
      console.log(`📋 Query plan created:`);
      console.log(`   Original Question: ${JSON.stringify(plan)}`);
      console.log(`   Subqueries: ${plan.subqueries.length}`);
      console.log(`   Speakers: ${plan.entities.speakers?.length || 0}`);
      console.log(`   Topics: ${plan.entities.topics?.length || 0}`);
      console.log(`   Strategies: ${plan.enabledStrategies.join(", ")}`);
      console.log(`   Confidence: ${plan.confidence.toFixed(2)}`);
    } catch (e) {
      console.error("[DRV1][plan] error:", (e as Error).message);
      throw new Error(`[DRV1][plan] ${(e as Error).message}`);
    }

    const subqueries = plan.subqueries && plan.subqueries.length > 0
      ? plan.subqueries
      : [body.query];

    // 2)+3) DeepResearchOrchestrator に委譲（重複除去も含む）
    const { finalDocs, sectionHitMap, iterations } = await this.orchestrator.run({
      baseSubqueries: subqueries,
      providers,
      allowBySection: SECTION_ALLOWED_PROVIDERS,
      targets: SECTION_TARGET_COUNTS,
      limit,
    });

    // 4) e1.. の連番で EvidenceRecord を構築（セクションヒントを付与）
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

    // 5) セクション統合
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
