#!/usr/bin/env -S deno run -A

// Standard library imports
import { load } from "@std/dotenv";

// Third-party library imports
import { Settings } from "npm:llamaindex";
import { Ollama, OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

// Local imports
import type { SpeechResult } from "../types/kokkai.ts";
import {
	DEFAULT_OLLAMA_BASE_URL,
	EMBEDDING_MODEL_NAME,
	LLM_MODEL_NAME,
	MAX_DB_CONNECTIONS,
	DEFAULT_TOP_K_RESULTS,
} from "../config/constants.ts";
import { QueryPlanningService } from "../services/query-planning.ts";
import { VectorSearchService } from "../services/vector-search.ts";
import { AnswerGenerationService } from "../services/answer-generation.ts";
import { RelevanceEvaluationService } from "../services/relevance-evaluation.ts";

/**
 * Main orchestrator class for the refactored Kokkai RAG CLI
 */
class RefactoredKokkaiRAGCLI {
	private dbPool: Pool | null = null;
	private queryPlanningService!: QueryPlanningService;
	private vectorSearchService!: VectorSearchService;
	private answerGenerationService!: AnswerGenerationService;
	private relevanceEvaluationService!: RelevanceEvaluationService;

	/**
	 * Initialize the CLI with all required services
	 */
	async initialize(): Promise<void> {
		// 環境変数読み込み
		await load({ export: true });

		const databaseUrl = Deno.env.get("DATABASE_URL");
		const ollamaBaseUrl =
			Deno.env.get("OLLAMA_BASE_URL") || DEFAULT_OLLAMA_BASE_URL;

		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		// Ollama設定
		try {
			Settings.embedModel = new OllamaEmbedding({
				model: EMBEDDING_MODEL_NAME,
				config: {
					host: ollamaBaseUrl,
				},
			});

			Settings.llm = new Ollama({
				model: LLM_MODEL_NAME,
				config: {
					host: ollamaBaseUrl,
				},
			});
		} catch (error) {
			throw new Error(
				`Failed to initialize Ollama: ${(error as Error).message}`,
			);
		}

		// データベース接続プール
		this.dbPool = new Pool({
			connectionString: databaseUrl,
			max: MAX_DB_CONNECTIONS,
		});

		// pgvectorタイプ登録
		const client = await this.dbPool.connect();
		try {
			await pgvector.registerTypes(client);
		} finally {
			client.release();
		}

		// サービスの初期化
		this.queryPlanningService = new QueryPlanningService();
		this.vectorSearchService = new VectorSearchService(this.dbPool);
		this.answerGenerationService = new AnswerGenerationService();
		this.relevanceEvaluationService = new RelevanceEvaluationService();

		console.log("🚀 Refactored Kokkai RAG CLI initialized successfully");
	}

	/**
	 * Perform search using query planning and vector search
	 */
	async search(
		userQuery: string,
		maxResults: number = DEFAULT_TOP_K_RESULTS,
	): Promise<SpeechResult[]> {
		// プランナーを使用した検索
		const queryPlan =
			await this.queryPlanningService.createQueryPlan(userQuery);
		return this.vectorSearchService.executeSearchPlan(queryPlan, maxResults);
	}

	/**
	 * Generate answer from search results
	 */
	generateAnswer(query: string, results: SpeechResult[]): Promise<string> {
		return this.answerGenerationService.generateAnswer(query, results);
	}

	/**
	 * Evaluate relevance of search results
	 */
	evaluateRelevance(
		query: string,
		results: SpeechResult[],
	): Promise<SpeechResult[]> {
		return this.relevanceEvaluationService.evaluateRelevance(query, results);
	}

	/**
	 * Get database statistics
	 */
	async getStats(): Promise<void> {
		if (!this.dbPool) return;

		try {
			const totalResult = await this.dbPool.query(
				'SELECT COUNT(*) as count FROM "Speech"',
			);
			const embeddedResult = await this.dbPool.query(
				"SELECT COUNT(*) as count FROM kokkai_speech_embeddings",
			);

			console.log("\n📊 Database Statistics:");
			console.log(`Total speeches: ${totalResult.rows[0].count}`);
			console.log(`Embedded speeches: ${embeddedResult.rows[0].count}`);
			const percentage =
				(embeddedResult.rows[0].count / totalResult.rows[0].count) * 100;
			console.log(`Embedded percentage: ${percentage.toFixed(1)}%`);
		} catch (error) {
			console.error("Failed to get stats:", error);
		}
	}

	/**
	 * Close database connections and cleanup
	 */
	async close(): Promise<void> {
		if (this.dbPool) {
			await this.dbPool.end();
			console.log("📊 Database connection closed");
		}
	}
}

/**
 * Main function - CLI entry point
 */
async function main(): Promise<void> {
	const args = Deno.args;

	if (args.length === 0) {
		console.error(
			'❌ Usage: deno run -A scripts/persistent-rag-cli-refactored.ts "検索クエリ"',
		);
		console.error(
			'   Example: deno run -A scripts/persistent-rag-cli-refactored.ts "岸田総理の防衛費について"',
		);
		Deno.exit(1);
	}

	const query = args.join(" ");
	const ragCli = new RefactoredKokkaiRAGCLI();

	try {
		await ragCli.initialize();
		await ragCli.getStats();

		// ベクトル検索実行
		const results = await ragCli.search(query);

		if (results.length === 0) {
			console.log("❌ No relevant speeches found.");
			return;
		}

		// 関連性評価でノイズを除去
		const relevantResults = await ragCli.evaluateRelevance(query, results);

		if (relevantResults.length === 0) {
			console.log("❌ No relevant speeches found after filtering.");
			return;
		}

		// LLMによる回答生成
		console.log("🤖 Generating AI answer...\n");
		const answer = await ragCli.generateAnswer(query, relevantResults);

		console.log("═".repeat(80));
		console.log("\n" + answer + "\n");
		console.log("═".repeat(80));
	} catch (error) {
		console.error("❌ Error:", (error as Error).message);
		Deno.exit(1);
	} finally {
		await ragCli.close();
	}
}

if (import.meta.main) {
	await main();
}
