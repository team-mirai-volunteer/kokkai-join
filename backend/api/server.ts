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
import { AnswerGenerationService } from "../services/answer-generation.ts";
import { RelevanceEvaluationService } from "../services/relevance-evaluation.ts";
import { ProviderRegistry } from "../services/provider-registry.ts";
import { MultiSourceSearchService } from "../services/multi-source-search.ts";
import type { ProviderQuery } from "../types/knowledge.ts";
import { documentToSpeech } from "../providers/adapter.ts";

// API Types
interface SearchRequest {
	query: string;
	limit?: number;
}

interface SearchResponse {
	query: string;
	answer: string;
	sources: SpeechResult[];
	metadata: {
		totalResults: number;
		processingTime: number;
		timestamp: string;
	};
}

/**
 * Kokkai Deep Research API Server using Hono
 */
class KokkaiDeepResearchAPI {
  private queryPlanningService!: QueryPlanningService;
  private answerGenerationService!: AnswerGenerationService;
  private relevanceEvaluationService!: RelevanceEvaluationService;
  private providerRegistry!: ProviderRegistry;
  private multiSource!: MultiSourceSearchService;
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
		// Search endpoint
		this.app.post(
			"/search",
			validator("json", (value, c) => {
				const { query, limit } = value as SearchRequest;
				if (!query || typeof query !== "string" || query.trim().length === 0) {
					return c.json(
						{
							error:
								"Query parameter is required and must be a non-empty string",
						},
						400,
					);
				}
				if (
					limit !== undefined &&
					(typeof limit !== "number" || limit < 1 || limit > 100)
				) {
					return c.json(
						{ error: "Limit must be a number between 1 and 100" },
						400,
					);
				}
				return value;
			}),
			async (c) => {
				const startTime = Date.now();

				try {
					const { query, limit = DEFAULT_TOP_K_RESULTS } =
						await c.req.json<SearchRequest>();

					console.log(`🔍 Processing search query: "${query}"`);

					// Execute Deep Research pipeline
					const results = await this.executeDeepResearchPipeline(query, limit);

					const processingTime = Date.now() - startTime;

					const response: SearchResponse = {
						query,
						answer: results.answer,
						sources: results.sources,
						metadata: {
							totalResults: results.sources.length,
							processingTime,
							timestamp: new Date().toISOString(),
						},
					};

					console.log(`✅ Search completed in ${processingTime}ms`);
					return c.json(response);
				} catch (error) {
					const processingTime = Date.now() - startTime;
					console.error("❌ Search error:", error);

					return c.json(
						{
							error: "Internal server error",
							message: (error as Error).message,
							metadata: {
								processingTime,
								timestamp: new Date().toISOString(),
							},
						},
						500,
					);
				}
			},
		);

		// Root endpoint
		this.app.get("/", (c) => {
			return c.json({
				name: "Kokkai Deep Research API",
				version: "1.0.0",
				description:
					"Deep Research API for Japanese parliamentary records analysis",
				endpoints: {
					"/": "This endpoint",
					"/search": "POST - Deep research on parliamentary records",
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
    const cerebrasApiKey = Deno.env.get("CEREBRAS_API_KEY");
    if (!cerebrasApiKey) {
      throw new Error("CEREBRAS_API_KEY environment variable is required");
    }
    console.log("🚀 Initializing Kokkai Deep Research API (provider-based)...");
    this.queryPlanningService = new QueryPlanningService();
    this.answerGenerationService = new AnswerGenerationService();
    this.relevanceEvaluationService = new RelevanceEvaluationService();
    this.providerRegistry = new ProviderRegistry();
    this.multiSource = new MultiSourceSearchService();
    console.log("✅ Services initialized");
  }

	/**
	 * Execute the Deep Research pipeline
	 */
  private async executeDeepResearchPipeline(
    query: string,
    limit: number,
  ): Promise<{ answer: string; sources: SpeechResult[] }> {
    console.log("🧠 Planning query strategy...");
    const plan = await this.queryPlanningService.createQueryPlan(query);

    console.log("🔍 Executing provider searches...");
    const providerQuery: ProviderQuery = {
      originalQuestion: plan.originalQuestion,
      subqueries: plan.subqueries,
      limit,
    };
    const providers = this.providerRegistry.byIds();
    const docs = await this.multiSource.searchAcross(providers, providerQuery);

    // Normalize to existing SpeechResult for downstream services
    const searchResults: SpeechResult[] = docs.map(documentToSpeech);

    console.log("🔍 Evaluating relevance of search results...");
    const relevantResults = await this.relevanceEvaluationService.evaluateRelevance(
      query,
      searchResults,
    );

    console.log("🤖 Generating AI answer...");
    const answer = await this.answerGenerationService.generateAnswer(query, relevantResults);
    return { answer, sources: relevantResults };
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
					console.log(`   GET  /          - API information`);
					console.log(
						`   POST /search    - Deep research on parliamentary records`,
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
