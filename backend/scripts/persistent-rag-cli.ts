#!/usr/bin/env -S deno run -A

import { load } from "@std/dotenv";
import { Settings } from "npm:llamaindex";
import { Ollama, OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

interface SpeechResult {
	speechId: string;
	speaker: string;
	party: string;
	date: string;
	meeting: string;
	content: string;
	url: string;
	score: number;
}

interface DatabaseRow {
	speech_id: string;
	speaker: string | null;
	speaker_group: string | null;
	date: string | null;
	meeting_name: string | null;
	speech_text: string | null;
	speech_url: string | null;
	similarity_score: string;
}

class PersistentKokkaiRAGCLI {
	private dbPool: Pool | null = null;

	async initialize(): Promise<void> {
		// 環境変数読み込み
		await load({ export: true });

		const databaseUrl = Deno.env.get("DATABASE_URL");
		const ollamaBaseUrl =
			Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434";

		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		// Ollama設定
		try {
			Settings.embedModel = new OllamaEmbedding({
				model: "bge-m3",
				config: {
					host: ollamaBaseUrl,
				},
			});

			Settings.llm = new Ollama({
				model: "gpt-oss:20b",
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
			max: 10,
		});

		// pgvectorタイプ登録
		const client = await this.dbPool.connect();
		try {
			await pgvector.registerTypes(client);
		} finally {
			client.release();
		}

		console.log("🚀 Persistent Kokkai RAG CLI initialized successfully");
	}

	async search(query: string, topK: number = 5): Promise<SpeechResult[]> {
		if (!this.dbPool || !Settings.embedModel) {
			throw new Error("Database or embedding model not initialized");
		}

		console.log(`🔍 Searching for: "${query}"`);

		try {
			// クエリの埋め込み生成
			const queryEmbedding = await Settings.embedModel.getTextEmbedding(query);

			// ベクトル検索実行
			const searchQuery = `
				SELECT 
					speech_id,
					speaker,
					speaker_group,
					date,
					meeting_name,
					speech_text,
					speech_url,
					(1 - (embedding <=> $1)) as similarity_score
				FROM kokkai_speech_embeddings
				WHERE embedding <=> $1 < 0.7
				ORDER BY embedding <=> $1
				LIMIT $2
			`;

			const result = await this.dbPool.query(searchQuery, [
				pgvector.toSql(queryEmbedding),
				topK,
			]);

			// 結果をSpeechResult形式に変換
			const results: SpeechResult[] = result.rows.map((row: DatabaseRow) => ({
				speechId: row.speech_id,
				speaker: row.speaker || "未知の議員",
				party: row.speaker_group || "?",
				date: row.date || "2024-01-01",
				meeting: row.meeting_name || "?",
				content: row.speech_text || "",
				url: row.speech_url || "",
				score: parseFloat(row.similarity_score) || 0.0,
			}));

			return results;
		} catch (error) {
			console.error("❌ Search error:", error);
			throw error;
		}
	}

	async generateAnswer(
		query: string,
		results: SpeechResult[],
	): Promise<string> {
		if (!Settings.llm) {
			throw new Error("LLM not initialized");
		}

		// 検索結果をコンテキストとして整理
		const context = results
			.map(
				(result, index) =>
					`【発言 ${index + 1}】
議員: ${result.speaker} (${result.party})
日付: ${result.date}
会議: ${result.meeting}
内容: ${result.content}
出典: ${result.url}
関連度: ${result.score.toFixed(3)}
`,
			)
			.join("\n");

		const prompt = `以下の国会議事録から、質問に対して正確で詳細な回答を作成してください。

質問: ${query}

国会議事録:
${context}

回答要件:
1. 発言者名と所属政党を明記する
2. 発言の日付と会議名を含める
3. 具体的な内容を引用する
4. 出典URLを提示する
5. 複数の発言がある場合は比較・整理する
6. 事実に基づいて回答し、推測は避ける

回答:`;

		try {
			const response = await Settings.llm.complete({ prompt });
			return response.text;
		} catch (error) {
			console.error("❌ LLM generation error:", error);
			return `検索結果に基づく情報:

${results
	.map(
		(result, index) =>
			`${index + 1}. ${result.speaker} (${result.party})
   日付: ${result.date}
   会議: ${result.meeting}
   内容: ${result.content.substring(0, 300)}...
   出典: ${result.url}
   関連度: ${result.score.toFixed(3)}`,
	)
	.join("\n\n")}`;
		}
	}

	async close(): Promise<void> {
		if (this.dbPool) {
			await this.dbPool.end();
			console.log("📊 Database connection closed");
		}
	}

	formatResults(results: SpeechResult[]): void {
		console.log(`\n📋 Found ${results.length} results:\n`);

		results.forEach((result, index) => {
			console.log(`--- Result ${index + 1} ---`);
			console.log(`👤 Speaker: ${result.speaker} (${result.party})`);
			console.log(`📅 Date: ${result.date}`);
			console.log(`🏛️ Meeting: ${result.meeting}`);
			console.log(`⭐ Score: ${result.score.toFixed(3)}`);
			console.log(`🔗 URL: ${result.url}`);
			console.log(
				`💬 Content: ${result.content.substring(0, 300)}${
					result.content.length > 300 ? "..." : ""
				}`,
			);
			console.log("");
		});
	}

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
}

async function main(): Promise<void> {
	const args = Deno.args;

	if (args.length === 0) {
		console.error(
			'❌ Usage: deno run -A scripts/persistent-rag-cli.ts "検索クエリ"',
		);
		console.error(
			'   Example: deno run -A scripts/persistent-rag-cli.ts "岸田総理の防衛費について"',
		);
		Deno.exit(1);
	}

	const query = args.join(" ");
	const ragCli = new PersistentKokkaiRAGCLI();

	try {
		await ragCli.initialize();
		await ragCli.getStats();

		// ベクトル検索実行
		const results = await ragCli.search(query);

		if (results.length === 0) {
			console.log("❌ No relevant speeches found.");
			return;
		}

		// 検索結果表示
		ragCli.formatResults(results);

		// LLMによる回答生成
		console.log("🤖 Generating AI answer...\n");
		const answer = await ragCli.generateAnswer(query, results);

		console.log("═".repeat(80));
		console.log("🎯 AI-Generated Answer:");
		console.log("═".repeat(80));
		console.log(answer);
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
