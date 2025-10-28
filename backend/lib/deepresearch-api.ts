// Standard library imports

import { vValidator } from "@hono/valibot-validator";
import { config } from "dotenv";
// Third-party library imports
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { streamSSE } from "hono/streaming";
import { ProviderRegistry } from "../providers/registry.js";
import { DeepResearchRequestSchema } from "../schemas/deepresearch-validation.js";
import { DeepResearchOrchestrator } from "../services/deepresearch-orchestrator.js";
import {
  createHonoEmit,
  executeDeepResearchStreaming,
} from "../services/deepresearch-streaming.js";
import { PDFSectionExtractionService } from "../services/pdf-section-extraction.js";
import { QueryPlanningService } from "../services/query-planning.js";
import { SectionSynthesisService } from "../services/section-synthesis.js";
import {
  getAuthenticatedSupabaseClient,
  validateSupabaseEnv,
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
    // Deep Research v1 streaming endpoint (protected by auth)
    this.app.post(
      "/api/v1/deepresearch/stream",
      authMiddleware,
      vValidator("json", DeepResearchRequestSchema),
      async (c) => {
        const start = Date.now();
        const request = c.req.valid("json");

        return streamSSE(c, async (stream) => {
          const emit = createHonoEmit(stream);

          try {
            const result = await executeDeepResearchStreaming(request, emit, {
              queryPlanning: this.queryPlanningService,
              orchestrator: this.orchestrator,
              pdfExtraction: this.pdfSectionExtraction,
              sectionSynthesis: this.sectionSynthesis,
              providerRegistry: this.providerRegistry,
            });

            console.log(
              `✅ /v1/deepresearch/stream completed in ${Date.now() - start}ms`,
            );

            // Save search history after streaming completes
            try {
              const { supabase } = getAuthenticatedSupabaseClient(c);
              const fileNames =
                request.files?.map((f) => ({ name: f.name })) || [];

              await executeSearchAndSaveHistory(supabase, {
                query: request.query,
                providers: result.providers,
                markdown: result.markdown,
                files: fileNames,
              });

              console.log("✅ Search history saved");
            } catch (historyError) {
              // Log but don't fail the stream if history save fails
              console.error("Failed to save search history:", historyError);
            }
          } catch (error) {
            // エラーは既にemit経由で送信済み
            console.error(
              `❌ /v1/deepresearch/stream error: ${(error as Error).message}`,
            );
          }
        });
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

    // Validate Supabase environment variables early
    try {
      validateSupabaseEnv();
      console.log("✅ Supabase environment validated");
    } catch (error) {
      console.error(
        "❌ Supabase environment validation failed:",
        (error as Error).message,
      );
      throw error;
    }

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
