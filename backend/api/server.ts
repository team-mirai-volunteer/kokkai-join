#!/usr/bin/env -S deno run -A

// Standard library imports
import { load } from "jsr:@std/dotenv";

// Third-party library imports
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { logger } from "jsr:@hono/hono/logger";
import { prettyJSON } from "jsr:@hono/hono/pretty-json";
import { validator } from "jsr:@hono/hono/validator";
import { Settings } from "npm:llamaindex";
import { OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

// Local imports
import type { SpeechResult } from "../types/kokkai.ts";
import {
	DEFAULT_OLLAMA_BASE_URL,
	DEFAULT_TOP_K_RESULTS,
	EMBEDDING_MODEL_NAME,
	MAX_DB_CONNECTIONS,
} from "../config/constants.ts";
import { QueryPlanningService } from "../services/query-planning.ts";
import { VectorSearchService } from "../services/vector-search.ts";
import { AnswerGenerationService } from "../services/answer-generation.ts";
import { RelevanceEvaluationService } from "../services/relevance-evaluation.ts";

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
	private dbPool: Pool | null = null;
	private queryPlanningService!: QueryPlanningService;
	private vectorSearchService!: VectorSearchService;
	private answerGenerationService!: AnswerGenerationService;
	private relevanceEvaluationService!: RelevanceEvaluationService;
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
		// 環境変数読み込み
		await load({ export: true });

		const databaseUrl = Deno.env.get("DATABASE_URL");
		const ollamaBaseUrl =
			Deno.env.get("OLLAMA_BASE_URL") || DEFAULT_OLLAMA_BASE_URL;
		const cerebrasApiKey = Deno.env.get("CEREBRAS_API_KEY");

		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		if (!cerebrasApiKey) {
			throw new Error("CEREBRAS_API_KEY environment variable is required");
		}

		console.log("🚀 Initializing Kokkai Deep Research API...");

		// Ollama埋め込みモデル設定
		try {
			Settings.embedModel = new OllamaEmbedding({
				model: EMBEDDING_MODEL_NAME,
				config: {
					host: ollamaBaseUrl,
				},
			});
			console.log("🤖 Ollama BGE-M3 embedding model initialized");
		} catch (error) {
			throw new Error(
				`Failed to initialize Ollama embedding: ${(error as Error).message}`,
			);
		}

		// Database connection
		try {
			this.dbPool = new Pool({
				connectionString: databaseUrl,
				max: MAX_DB_CONNECTIONS,
			});

			// pgvector types registration
			const client = await this.dbPool.connect();
			await pgvector.registerTypes(client);
			client.release();
			console.log("📊 pgvector types registered");
		} catch (error) {
			throw new Error(
				`Database initialization failed: ${(error as Error).message}`,
			);
		}

		// Initialize services
		this.queryPlanningService = new QueryPlanningService();
		this.vectorSearchService = new VectorSearchService(this.dbPool);
		this.answerGenerationService = new AnswerGenerationService();
		this.relevanceEvaluationService = new RelevanceEvaluationService();

		console.log("✅ All services initialized successfully");
		console.log("🌟 Kokkai Deep Research API ready to serve requests");
	}

	/**
	 * Execute the Deep Research pipeline
	 */
	private async executeDeepResearchPipeline(
		query: string,
		limit: number,
	): Promise<{
		answer: string;
		sources: SpeechResult[];
	}> {
		// Query planning
		console.log("🧠 Planning query strategy...");
		const queryPlan = await this.queryPlanningService.createQueryPlan(query);

		// Vector search
		console.log("🔍 Executing search plan...");
		const searchResults = await this.vectorSearchService.executeSearchPlan(
			queryPlan,
			limit,
		);

		// Relevance evaluation
		console.log("🔍 Evaluating relevance of search results...");
		const relevantResults =
			await this.relevanceEvaluationService.evaluateRelevance(
				query,
				searchResults,
			);

		// Answer generation
		console.log("🤖 Generating AI answer...");
		const answer = await this.answerGenerationService.generateAnswer(
			query,
			relevantResults,
		);

		return {
			answer,
			sources: relevantResults,
		};
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
	async close(): Promise<void> {
		if (this.dbPool) {
			await this.dbPool.end();
			console.log("📊 Database connection closed");
		}
	}
}

// Main execution
if (import.meta.main) {
	const api = new KokkaiDeepResearchAPI();

	try {
		await api.initialize();

		// Handle graceful shutdown
		const handleShutdown = async (signal: string) => {
			console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
			await api.close();
			Deno.exit(0);
		};

		// Register signal handlers
		Deno.addSignalListener("SIGINT", () => handleShutdown("SIGINT"));
		Deno.addSignalListener("SIGTERM", () => handleShutdown("SIGTERM"));

		// Start server
		const port = parseInt(Deno.env.get("PORT") || "8000");
		api.serve(port);
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		await api.close();
		Deno.exit(1);
	}
}
