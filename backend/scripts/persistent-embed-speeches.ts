#!/usr/bin/env -S deno run -A

import { load } from "@std/dotenv";
import { Settings } from "npm:llamaindex";
import { OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

interface SpeechData {
	id: string;
	speechOrder: number;
	speaker: string;
	speakerRole: string;
	speakerGroup: string;
	speech: string;
	issueID: string;
	meetingName: string;
	date: string;
}

interface EmbeddingProgress {
	processed: number;
	total: number;
	currentBatch: number;
	startTime: number;
	errors: number;
}

class PersistentSpeechEmbedder {
	private dbPool: Pool | null = null;
	private progress: EmbeddingProgress = {
		processed: 0,
		total: 0,
		currentBatch: 0,
		startTime: 0,
		errors: 0,
	};

	async initialize(): Promise<void> {
		await load({ export: true });

		const databaseUrl = Deno.env.get("DATABASE_URL");
		const ollamaBaseUrl =
			Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434";

		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		// Ollama埋め込み設定
		try {
			Settings.embedModel = new OllamaEmbedding({
				model: "bge-m3",
				config: {
					host: ollamaBaseUrl,
				},
			});
			console.log("🤖 Ollama BGE-M3 embedding model initialized");
		} catch (error) {
			throw new Error(`Failed to initialize Ollama: ${error.message}`);
		}

		// データベース接続
		this.dbPool = new Pool({
			connectionString: databaseUrl,
			max: 20,
		});

		// pgvectorタイプ登録
		const client = await this.dbPool.connect();
		try {
			await pgvector.registerTypes(client);
			console.log("📊 pgvector types registered");
		} finally {
			client.release();
		}

		// ベクトルテーブル作成
		await this.createVectorTable();

		console.log("🚀 Persistent Speech Embedder initialized");
	}

	async createVectorTable(): Promise<void> {
		if (!this.dbPool) {
			throw new Error("Database pool not initialized");
		}

		const createTableQuery = `
			CREATE TABLE IF NOT EXISTS kokkai_speech_embeddings (
				id TEXT PRIMARY KEY,
				speech_id TEXT NOT NULL UNIQUE,
				speaker TEXT,
				speaker_role TEXT,
				speaker_group TEXT,
				speech_text TEXT NOT NULL,
				issue_id TEXT,
				meeting_name TEXT,
				date TEXT,
				speech_url TEXT,
				speech_order INTEGER,
				embedding vector(1024),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`;

		const createIndexQuery = `
			CREATE INDEX IF NOT EXISTS kokkai_embeddings_speaker_idx ON kokkai_speech_embeddings(speaker);
			CREATE INDEX IF NOT EXISTS kokkai_embeddings_date_idx ON kokkai_speech_embeddings(date);
			CREATE INDEX IF NOT EXISTS kokkai_embeddings_vector_idx ON kokkai_speech_embeddings 
			USING hnsw (embedding vector_cosine_ops);
		`;

		try {
			await this.dbPool.query(createTableQuery);
			await this.dbPool.query(createIndexQuery);
			console.log("✅ Vector storage table created/verified");
		} catch (error) {
			console.error("❌ Error creating vector table:", error);
			throw error;
		}
	}

	async getTotalCount(): Promise<number> {
		if (!this.dbPool) {
			throw new Error("Database pool not initialized");
		}

		const result = await this.dbPool.query(`
			SELECT COUNT(*) as count 
			FROM "Speech" s
			WHERE s.speech IS NOT NULL 
			AND length(trim(s.speech)) > 50
			AND s."rawSpeaker" != '会議録情報'
			AND s."rawSpeaker" NOT LIKE '%委員長%'
			AND s.id NOT IN (SELECT speech_id FROM kokkai_speech_embeddings)
		`);

		return parseInt(result.rows[0].count);
	}

	async getProcessedCount(): Promise<number> {
		if (!this.dbPool) {
			throw new Error("Database pool not initialized");
		}

		const result = await this.dbPool.query(
			"SELECT COUNT(*) as count FROM kokkai_speech_embeddings",
		);

		return parseInt(result.rows[0].count);
	}

	async fetchUnprocessedSpeechBatch(
		offset: number,
		batchSize: number,
	): Promise<SpeechData[]> {
		if (!this.dbPool) {
			throw new Error("Database pool not initialized");
		}

		const query = `
			SELECT
				s.id,
				s."speechOrder",
				COALESCE(sp."displayName", s."rawSpeaker") as speaker,
				COALESCE(sr.name, s."rawSpeakerRole") as speakerRole,
				s."rawSpeakerGroup" as speakerGroup,
				s.speech,
				m."issueID",
				m."nameOfMeeting" as meetingName,
				m.date::text as date
			FROM "Speech" s
			LEFT JOIN "Meeting" m ON s."meetingId" = m.id  
			LEFT JOIN "Speaker" sp ON s."speakerId" = sp.id
			LEFT JOIN "SpeakerRole" sr ON s."roleId" = sr.id
			WHERE s.speech IS NOT NULL 
				AND length(trim(s.speech)) > 50
				AND s."rawSpeaker" != '会議録情報'
				AND s."rawSpeaker" NOT LIKE '%委員長%'
				AND s.id NOT IN (SELECT speech_id FROM kokkai_speech_embeddings)
			ORDER BY m.date DESC, s."speechOrder"
			LIMIT $1 OFFSET $2
		`;

		const result = await this.dbPool.query(query, [batchSize, offset]);
		return result.rows as SpeechData[];
	}

	async embedAndStoreBatch(speeches: SpeechData[]): Promise<void> {
		if (!this.dbPool || !Settings.embedModel) {
			throw new Error("Database or embedding model not initialized");
		}

		const values = [];
		const placeholders = [];

		for (let i = 0; i < speeches.length; i++) {
			const speech = speeches[i];

			try {
				// 埋め込み生成
				const embedding = await Settings.embedModel.getTextEmbedding(
					speech.speech,
				);

				// URLを生成
				const speechUrl = `https://kokkai.ndl.go.jp/txt/${speech.issueID}/${speech.speechOrder}`;

				// パラメータをvalues配列に追加
				const baseIndex = i * 12;
				values.push(
					`kokkai_${speech.id}`, // id
					speech.id, // speech_id
					speech.speaker || "Unknown",
					speech.speakerRole && speech.speakerRole.trim() !== ""
						? speech.speakerRole
						: null,
					speech.speakerGroup && speech.speakerGroup.trim() !== ""
						? speech.speakerGroup
						: null,
					speech.speech,
					speech.issueID || null,
					speech.meetingName || "Unknown Meeting",
					speech.date || "2024-01-01",
					speechUrl,
					speech.speechOrder || 0,
					pgvector.toSql(embedding),
				);

				// プレースホルダーを作成
				const placeholder = `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`;
				placeholders.push(placeholder);
			} catch (error) {
				console.error(`❌ Error processing speech ${speech.id}:`, error);
				this.progress.errors++;
				throw error;
			}
		}

		// バッチインサート実行
		const insertQuery = `
			INSERT INTO kokkai_speech_embeddings (
				id, speech_id, speaker, speaker_role, speaker_group, 
				speech_text, issue_id, meeting_name, date, speech_url, 
				speech_order, embedding
			) VALUES ${placeholders.join(", ")}
			ON CONFLICT (speech_id) DO NOTHING
		`;

		try {
			await this.dbPool.query(insertQuery, values);
		} catch (error) {
			console.error("❌ Error storing embeddings:", error);
			throw error;
		}
	}

	displayProgress(): void {
		const now = Date.now();
		const elapsed = (now - this.progress.startTime) / 1000;
		const rate = this.progress.processed / elapsed;
		const remaining = this.progress.total - this.progress.processed;
		const eta = remaining / rate;

		console.log(
			`📊 Progress: ${this.progress.processed}/${this.progress.total} (${(
				(this.progress.processed / this.progress.total) * 100
			).toFixed(1)}%)`,
		);
		console.log(`⚡ Rate: ${rate.toFixed(1)} docs/sec`);
		console.log(`⏰ ETA: ${Math.round(eta / 60)} minutes`);
		console.log(`❌ Errors: ${this.progress.errors}`);
		console.log(`🔄 Current Batch: ${this.progress.currentBatch}`);
		console.log("---");
	}

	async runEmbeddingBatch(
		batchSize: number = 50,
		maxBatches?: number,
	): Promise<void> {
		// 既処理済み件数を表示
		const processedCount = await this.getProcessedCount();
		console.log(`✅ Already processed: ${processedCount} speeches`);

		this.progress.total = await this.getTotalCount();
		this.progress.startTime = Date.now();

		if (maxBatches) {
			this.progress.total = Math.min(
				this.progress.total,
				maxBatches * batchSize,
			);
		}

		if (this.progress.total === 0) {
			console.log("🎉 All speeches have already been processed!");
			return;
		}

		console.log(
			`🎯 Starting embedding process for ${this.progress.total} remaining speeches`,
		);
		console.log(`📦 Batch size: ${batchSize}`);

		let offset = 0;
		let batchCount = 0;

		while (this.progress.processed < this.progress.total) {
			if (maxBatches && batchCount >= maxBatches) {
				console.log(`🛑 Reached maximum batch limit: ${maxBatches}`);
				break;
			}

			this.progress.currentBatch = batchCount + 1;

			try {
				console.log(`🔄 Processing batch ${this.progress.currentBatch}...`);

				// データ取得
				const speeches = await this.fetchUnprocessedSpeechBatch(
					offset,
					batchSize,
				);
				if (speeches.length === 0) {
					console.log("✅ No more speeches to process");
					break;
				}

				// 埋め込み生成・保存
				await this.embedAndStoreBatch(speeches);

				this.progress.processed += speeches.length;
				offset += batchSize;
				batchCount++;

				// 進捗表示
				this.displayProgress();

				// 少し待機（Ollamaサーバーへの負荷軽減）
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				console.error(
					`❌ Error in batch ${this.progress.currentBatch}:`,
					error,
				);
				this.progress.errors++;

				// エラーがあっても続行
				offset += batchSize;
				batchCount++;
			}
		}

		const totalTime = (Date.now() - this.progress.startTime) / 1000;
		console.log(`\n🎉 Embedding process completed!`);
		console.log(`📊 Total processed: ${this.progress.processed}`);
		console.log(`❌ Total errors: ${this.progress.errors}`);
		console.log(`⏱️ Total time: ${Math.round(totalTime / 60)} minutes`);
		console.log(
			`⚡ Average rate: ${(this.progress.processed / totalTime).toFixed(1)} docs/sec`,
		);
	}

	async searchSimilar(query: string, limit: number = 5): Promise<any[]> {
		if (!this.dbPool || !Settings.embedModel) {
			throw new Error("Database or embedding model not initialized");
		}

		// クエリの埋め込み生成
		const queryEmbedding = await Settings.embedModel.getTextEmbedding(query);

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
			ORDER BY embedding <=> $1
			LIMIT $2
		`;

		const result = await this.dbPool.query(searchQuery, [
			pgvector.toSql(queryEmbedding),
			limit,
		]);

		return result.rows;
	}

	async close(): Promise<void> {
		if (this.dbPool) {
			await this.dbPool.end();
			console.log("📊 Database connection closed");
		}
	}
}

async function main(): Promise<void> {
	const args = Deno.args;
	const batchSize = args[0] ? parseInt(args[0]) : 50;
	const maxBatches = args[1] ? parseInt(args[1]) : undefined;

	if (isNaN(batchSize) || batchSize <= 0) {
		console.error(
			"❌ Usage: deno run -A scripts/persistent-embed-speeches.ts [batchSize] [maxBatches]",
		);
		console.error(
			"   Example: deno run -A scripts/persistent-embed-speeches.ts 50 10",
		);
		Deno.exit(1);
	}

	const embedder = new PersistentSpeechEmbedder();

	try {
		await embedder.initialize();
		await embedder.runEmbeddingBatch(batchSize, maxBatches);

		console.log("\n🎯 Testing search with stored embeddings...");

		// テスト検索
		const testQuery = "防衛費について";
		console.log(`🔍 Test query: "${testQuery}"`);

		const results = await embedder.searchSimilar(testQuery, 5);

		console.log("📋 Search results:");
		results.forEach((result, index) => {
			console.log(
				`\n${index + 1}. ${result.speaker} (${result.speaker_group})`,
			);
			console.log(`   📅 ${result.date} - ${result.meeting_name}`);
			console.log(`   ⭐ Similarity: ${result.similarity_score.toFixed(3)}`);
			console.log(`   🔗 ${result.speech_url}`);
			console.log(`   💬 ${result.speech_text.substring(0, 200)}...`);
		});
	} catch (error) {
		console.error("❌ Error:", error.message);
		Deno.exit(1);
	} finally {
		await embedder.close();
	}
}

if (import.meta.main) {
	await main();
}
