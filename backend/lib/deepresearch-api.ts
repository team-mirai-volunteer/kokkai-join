// Standard library imports

import { vValidator } from "@hono/valibot-validator";
import { config } from "dotenv";
// Third-party library imports
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { DEFAULT_TOP_K_RESULTS, ProviderID } from "../config/constants.js";
import {
  SECTION_ALLOWED_PROVIDERS,
  SECTION_TARGET_COUNTS,
} from "../config/deepresearch-constants.js";
import { ProviderRegistry } from "../providers/registry.js";
import {
  DeepResearchRequestSchema,
  type DeepResearchRequestValidated,
} from "../schemas/deepresearch-validation.js";
import { DeepResearchOrchestrator } from "../services/deepresearch-orchestrator.js";
import { PDFSectionExtractionService } from "../services/pdf-section-extraction.js";
import { QueryPlanningService } from "../services/query-planning.js";
import { SectionSynthesisService } from "../services/section-synthesis.js";
import type {
  DeepResearchResponse,
  EvidenceRecord,
} from "../types/deepresearch.js";
import { toEvidenceRecord } from "../types/deepresearch.js";
import type { QueryPlan } from "../types/kokkai.js";
import { convertDeepResearchToMarkdown } from "../utils/markdown-converter.js";
import {
  createSupabaseClient,
  extractToken,
  getAuthenticatedSupabaseClient,
} from "./auth-helpers.js";
// Local imports
import { authMiddleware } from "./authMiddleware.js";
import {
  deleteSearchHistory,
  executeSearchAndSaveHistory,
  getSearchHistories,
  getSearchHistoryById,
} from "./search-history-api.js";

/**
 * Kokkai Deep Research API Server using Hono
 */
class KokkaiDeepResearchAPI {
  private queryPlanningService!: QueryPlanningService;
  private providerRegistry!: ProviderRegistry;
  private sectionSynthesis!: SectionSynthesisService;
  private orchestrator!: DeepResearchOrchestrator;
  private pdfSectionExtraction!: PDFSectionExtractionService;
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
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Accept", "Authorization"],
        exposeHeaders: ["Content-Type"],
        credentials: false,
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
    // Deep Research v1 endpoint (protected by auth)
    this.app.post(
      "/api/v1/deepresearch",
      authMiddleware,
      vValidator("json", DeepResearchRequestSchema),
      async (c) => {
        const start = Date.now();
        try {
          const req = c.req.valid("json");
          const resp = await this.executeDeepResearchV1(req);
          console.log(
            `✅ /v1/deepresearch completed in ${Date.now() - start}ms`,
          );
          const markdown = convertDeepResearchToMarkdown(resp);

          // Save search history to Supabase
          try {
            const token = extractToken(c);

            if (
              token &&
              process.env.SUPABASE_URL &&
              process.env.SUPABASE_ANON_KEY
            ) {
              const supabase = createSupabaseClient(token);

              const fileNames = req.files?.map((f) => ({ name: f.name })) || [];
              await executeSearchAndSaveHistory(supabase, {
                query: req.query,
                providers: req.providers || [],
                markdown,
                files: fileNames,
              });
              console.log("✅ Search history saved");
            }
          } catch (historyError) {
            // Log but don't fail the request if history save fails
            console.error("Failed to save search history:", historyError);
          }

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

    // Search history endpoints (protected by auth)
    this.app.get("/api/v1/history", authMiddleware, async (c) => {
      try {
        const { supabase } = getAuthenticatedSupabaseClient(c);

        const limit = Number.parseInt(c.req.query("limit") || "100", 10);
        const offset = Number.parseInt(c.req.query("offset") || "0", 10);

        const histories = await getSearchHistories(supabase, { limit, offset });
        return c.json(histories);
      } catch (e) {
        const msg = (e as Error).message;
        console.error("/api/v1/history error:", msg);
        return c.json({ error: "internal", message: msg }, 500);
      }
    });

    this.app.get("/api/v1/history/:id", authMiddleware, async (c) => {
      try {
        const { supabase } = getAuthenticatedSupabaseClient(c);
        const id = c.req.param("id");

        const history = await getSearchHistoryById(supabase, id);

        if (!history) {
          return c.json({ error: "History not found" }, 404);
        }

        return c.json(history);
      } catch (e) {
        const msg = (e as Error).message;
        console.error("/api/v1/history/:id error:", msg);
        return c.json({ error: "internal", message: msg }, 500);
      }
    });

    this.app.delete("/api/v1/history/:id", authMiddleware, async (c) => {
      try {
        const { supabase } = getAuthenticatedSupabaseClient(c);
        const id = c.req.param("id");

        await deleteSearchHistory(supabase, id);
        return c.json({ success: true });
      } catch (e) {
        const msg = (e as Error).message;
        console.error("/api/v1/history/:id delete error:", msg);
        return c.json({ error: "internal", message: msg }, 500);
      }
    });

    // Root endpoint
    this.app.get("/", (c) => {
      return c.json({
        name: "Kokkai Deep Research API",
        version: "1.0.0",
        description:
          "Deep Research API for Japanese parliamentary records analysis",
        endpoints: {
          "/": "This endpoint",
          "/api/v1/deepresearch":
            "POST - Deep research pipeline returning sections and citations",
          "/api/v1/history": "GET - Get search history list",
          "/api/v1/history/:id":
            "GET - Get search history detail, DELETE - Delete search history",
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
    config();
    console.log("🚀 Initializing Kokkai Deep Research API (provider-based)...");

    // Initialize services
    this.queryPlanningService = new QueryPlanningService();
    this.providerRegistry = new ProviderRegistry();
    this.sectionSynthesis = new SectionSynthesisService();
    this.orchestrator = new DeepResearchOrchestrator();
    this.pdfSectionExtraction = new PDFSectionExtractionService();

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
    const fileContexts =
      body.files?.map((file) => ({
        name: file.name,
        buffer: Buffer.from(file.content, "base64"),
        mimeType: file.mimeType,
      })) ?? [];

    const start = Date.now();
    const limit = body.limit ?? DEFAULT_TOP_K_RESULTS;
    console.log(
      `[DRV1] ▶ Start deepresearch query="${body.query}" limit=${limit}`,
    );
    const providersRequested = body.providers ? body.providers : [];
    const providers = this.providerRegistry.byIds(providersRequested);
    const providerIds = providers.map((p) => p.id);
    console.log(`[DRV1] Providers: ${providerIds.join(", ")}`);

    // 1) プランニング（サブクエリ生成）
    console.log("[DRV1] ▶ Planning subqueries...");
    let plan: QueryPlan;
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

    const subqueries =
      plan.subqueries && plan.subqueries.length > 0
        ? plan.subqueries
        : [body.query];

    // 2)+3) DeepResearchOrchestrator に委譲（重複除去も含む）
    const [orchestratorResult, ...pdfSectionResultsArray] = await Promise.all([
      this.orchestrator.run({
        baseSubqueries: subqueries,
        providers,
        allowBySection: SECTION_ALLOWED_PROVIDERS,
        targets: SECTION_TARGET_COUNTS,
        limit,
      }),
      ...fileContexts.map((fileContext) =>
        this.pdfSectionExtraction.extractBySections({
          query: [body.query, ...subqueries].join(" "),
          fileName: fileContext.name,
          fileBuffer: fileContext.buffer,
          mimeType: fileContext.mimeType,
        }),
      ),
    ]);

    // 複数ファイルの結果をフラット化
    const pdfSectionResults = pdfSectionResultsArray.flat();

    const { finalDocs, sectionHitMap, iterations } = orchestratorResult;
    for (const { sectionKey, docs } of pdfSectionResults) {
      for (const doc of docs) {
        finalDocs.push(doc);
        const key = doc.url ?? `${doc.source.providerId}:${doc.id}`;
        let sectionsForDoc = sectionHitMap.get(key);
        if (!sectionsForDoc) {
          sectionsForDoc = new Set<string>();
          sectionHitMap.set(key, sectionsForDoc);
        }
        sectionsForDoc.add(sectionKey);
      }
    }

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
      if (hints?.size) rec.sectionHints = Array.from(hints);
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

    const usedProviderIds = [...providerIds];
    if (
      finalDocs.some((doc) => doc.source.providerId === ProviderID.PDFExtract)
    ) {
      usedProviderIds.push(ProviderID.PDFExtract);
    }

    const resp: DeepResearchResponse = {
      query: body.query,
      asOfDate: body.asOfDate,
      sections,
      evidences,
      metadata: {
        usedProviders: usedProviderIds,
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
    console.log(`🌐 Server running at http://localhost:${port}`);
    console.log("📋 Available endpoints:");
    console.log(`   GET  /                    - API information`);
    console.log(
      `   POST /api/v1/deepresearch - Deep research pipeline (sections+citations)`,
    );
  }

  /**
   * Get Hono app instance (for Vercel, etc.)
   */
  getApp(): Hono {
    return this.app;
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {}
}

// Export for use in Vercel functions
export { KokkaiDeepResearchAPI };
