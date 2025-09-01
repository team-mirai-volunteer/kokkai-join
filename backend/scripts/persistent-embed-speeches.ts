#!/usr/bin/env -S deno run -A

// Standard library imports
import { load } from "@std/dotenv";

// Third-party library imports
import { Settings } from "npm:llamaindex";
import { OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

// Constants
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const EMBEDDING_MODEL_NAME = "bge-m3";
const EMBEDDING_DIMENSION = 1024;
const MAX_DB_CONNECTIONS = 20;
const MIN_SPEECH_LENGTH = 50;
const DEFAULT_BATCH_SIZE = 50;
const BATCH_PROCESSING_DELAY_MS = 1000;
const DISPLAY_CONTENT_LIMIT = 200;
const SEARCH_RESULT_LIMIT = 5;
const PLACEHOLDER_PARAMS_PER_RECORD = 12;
const UNKNOWN_SPEAKER = "Unknown";
const UNKNOWN_MEETING = "Unknown Meeting";
const DEFAULT_DATE = "2024-01-01";
const DEFAULT_SPEECH_ORDER = 0;

interface SpeechData {
  id: string;
  speechOrder: number;
  speaker: string;
  speakerRole: string | null; // PostgreSQL returns lowercase
  speakerGroup: string | null; // PostgreSQL returns lowercase
  speech: string;
  issueId: string; // PostgreSQL returns lowercase
  meetingName: string; // PostgreSQL returns lowercase
  date: string;
}

interface EmbeddingProgress {
  processed: number;
  total: number;
  currentBatch: number;
  startTime: number;
  errors: number;
  currentDateRange?: string;
}

interface SearchResult {
  speech_id: string;
  speaker: string | null;
  speaker_group: string | null;
  date: string | null;
  meeting_name: string | null;
  speech_text: string;
  speech_url: string | null;
  similarity_score: number;
}

// Type aliases for better readability
type SqlPlaceholder = string;
type BatchInsertValues = (string | number | null)[];

interface ProcessedSpeechEmbedding {
  values: BatchInsertValues;
  placeholder: SqlPlaceholder;
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

  // SQL Helpers
  private getSpeechFilterConditions(): string {
    return `
      s.speech IS NOT NULL 
      AND length(trim(s.speech)) > ${MIN_SPEECH_LENGTH}
      AND s."rawSpeaker" != '会議録情報'
      AND s."rawSpeaker" NOT LIKE '%委員長%'
    `;
  }

  private getUnprocessedSpeechCondition(): string {
    return `AND s.id NOT IN (SELECT speech_id FROM kokkai_speech_embeddings)`;
  }

  private generateSpeechUrl(issueId: string, speechOrder: number): string {
    return `https://kokkai.ndl.go.jp/txt/${issueId}/${speechOrder}`;
  }

  private async processSingleSpeechForEmbedding(
    speech: SpeechData,
    recordIndex: number,
  ): Promise<ProcessedSpeechEmbedding> {
    // 埋め込み生成
    const textEmbedding = await Settings.embedModel!.getTextEmbedding(
      speech.speech,
    );

    // URLを生成
    const speechUrl = this.generateSpeechUrl(
      speech.issueId,
      speech.speechOrder,
    );

    // パラメータをvalues配列に追加
    const baseIndex = recordIndex * PLACEHOLDER_PARAMS_PER_RECORD;
    const values = [
      `kokkai_${speech.id}`, // id
      speech.id, // speech_id
      speech.speaker || UNKNOWN_SPEAKER,
      speech.speakerRole && speech.speakerRole.trim() !== "" ? speech.speakerRole : null,
      speech.speakerGroup && speech.speakerGroup.trim() !== "" ? speech.speakerGroup : null,
      speech.speech,
      speech.issueId || null,
      speech.meetingName || UNKNOWN_MEETING,
      speech.date || DEFAULT_DATE,
      speechUrl,
      speech.speechOrder || DEFAULT_SPEECH_ORDER,
      pgvector.toSql(textEmbedding),
    ];

    // プレースホルダーを作成
    const placeholder = `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${
      baseIndex + 4
    }, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${
      baseIndex + 9
    }, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`;

    return { values, placeholder };
  }

  private buildBatchInsertQuery(placeholders: SqlPlaceholder[]): string {
    return `
      INSERT INTO kokkai_speech_embeddings (
        id, speech_id, speaker, speaker_role, speaker_group, 
        speech_text, issue_id, meeting_name, date, speech_url, 
        speech_order, embedding
      ) VALUES ${placeholders.join(", ")}
      ON CONFLICT (speech_id) DO NOTHING
    `;
  }

  async initialize(): Promise<void> {
    await load({ export: true });

    const databaseUrl = Deno.env.get("DATABASE_URL");
    const ollamaBaseUrl = Deno.env.get("OLLAMA_BASE_URL") || DEFAULT_OLLAMA_BASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    // Ollama埋め込み設定
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
        `Failed to initialize Ollama: ${(error as Error).message}`,
      );
    }

    // データベース接続
    this.dbPool = new Pool({
      connectionString: databaseUrl,
      max: MAX_DB_CONNECTIONS,
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
				embedding vector(${EMBEDDING_DIMENSION}),
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
			WHERE ${this.getSpeechFilterConditions()}
			${this.getUnprocessedSpeechCondition()}
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

  async fetchUnprocessedSpeechBatchByDateRange(
    startDate: string,
    limit: number,
  ): Promise<SpeechData[]> {
    if (!this.dbPool) {
      throw new Error("Database pool not initialized");
    }

    const query = `
			SELECT
				s.id,
				s."speechOrder",
				COALESCE(sp."displayName", s."rawSpeaker") as speaker,
				COALESCE(sr.name, s."rawSpeakerRole") as "speakerRole",
				s."rawSpeakerGroup" as "speakerGroup",
				s.speech,
				m."issueID" as "issueId",
				m."nameOfMeeting" as "meetingName",
				m.date::text as date
			FROM "Speech" s
			LEFT JOIN "Meeting" m ON s."meetingId" = m.id  
			LEFT JOIN "Speaker" sp ON s."speakerId" = sp.id
			LEFT JOIN "SpeakerRole" sr ON s."roleId" = sr.id
			WHERE ${this.getSpeechFilterConditions()}
			${this.getUnprocessedSpeechCondition()}
			AND m.date >= $1
			ORDER BY m.date ASC, s."speechOrder" ASC
			LIMIT $2
		`;

    const result = await this.dbPool.query(query, [startDate, limit]);

    return result.rows as SpeechData[];
  }

  async getTotalCountFromDate(startDate?: string): Promise<number> {
    if (!this.dbPool) {
      throw new Error("Database pool not initialized");
    }

    const dateFilter = startDate ? `AND m.date >= '${startDate}'` : "";
    const result = await this.dbPool.query(`
			SELECT COUNT(*) as count 
			FROM "Speech" s
			LEFT JOIN "Meeting" m ON s."meetingId" = m.id
			WHERE ${this.getSpeechFilterConditions()}
			${this.getUnprocessedSpeechCondition()}
			${dateFilter}
		`);

    return parseInt(result.rows[0].count);
  }

  async getLatestProcessedDate(): Promise<string | null> {
    if (!this.dbPool) {
      throw new Error("Database pool not initialized");
    }

    const result = await this.dbPool.query(`
			SELECT MAX(date) as latest_date
			FROM kokkai_speech_embeddings
			WHERE date IS NOT NULL
		`);

    return result.rows[0]?.latest_date || null;
  }

  async embedAndStoreSpeechBatch(speechBatch: SpeechData[]): Promise<void> {
    if (!this.dbPool || !Settings.embedModel) {
      throw new Error("Database or embedding model not initialized");
    }

    const allValues: BatchInsertValues = [];
    const placeholders: SqlPlaceholder[] = [];

    for (let i = 0; i < speechBatch.length; i++) {
      const currentSpeech = speechBatch[i];

      try {
        const { values, placeholder } = await this.processSingleSpeechForEmbedding(
          currentSpeech,
          i,
        );
        allValues.push(...values);
        placeholders.push(placeholder);
      } catch (error) {
        console.error(`❌ Error processing speech ${currentSpeech.id}:`, error);
        this.progress.errors++;
        throw error;
      }
    }

    // バッチインサート実行
    const insertQuery = this.buildBatchInsertQuery(placeholders);

    try {
      await this.dbPool.query(insertQuery, allValues);
    } catch (error) {
      console.error("❌ Error storing embeddings:", error);
      throw error;
    }
  }

  displayEmbeddingProgress(): void {
    const now = Date.now();
    const elapsed = (now - this.progress.startTime) / 1000;
    const rate = this.progress.processed / elapsed;
    const remaining = this.progress.total - this.progress.processed;
    const eta = remaining / rate;

    console.log(
      `📊 Progress: ${this.progress.processed}/${this.progress.total} (${
        (
          (this.progress.processed / this.progress.total) * 100
        ).toFixed(1)
      }%)`,
    );
    console.log(`⚡ Rate: ${rate.toFixed(1)} docs/sec`);
    console.log(`⏰ ETA: ${Math.round(eta / 60)} minutes`);
    console.log(`❌ Errors: ${this.progress.errors}`);
    console.log(`🔄 Current Batch: ${this.progress.currentBatch}`);
    if (this.progress.currentDateRange) {
      console.log(`📅 Current Date Range: ${this.progress.currentDateRange}`);
    }
    console.log("---");
  }

  async runEmbeddingBatchByDateRange(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startDate?: string,
    maxBatches?: number,
  ): Promise<void> {
    // 開始日付の決定
    let actualStartDate = startDate;
    if (!actualStartDate) {
      // 最新処理日付から継続
      const latestProcessed = await this.getLatestProcessedDate();
      if (latestProcessed) {
        // 1日後から開始（既処理の翌日）
        const nextDay = new Date(latestProcessed);
        nextDay.setDate(nextDay.getDate() + 1);
        actualStartDate = nextDay.toISOString().split("T")[0];
        console.log(
          `📅 Resuming from: ${actualStartDate} (day after latest processed: ${latestProcessed})`,
        );
      } else {
        // 処理済みデータがない場合はデフォルト日付から
        actualStartDate = "1990-01-01";
        console.log(`📅 Starting from default date: ${actualStartDate}`);
      }
    } else {
      console.log(`📅 Starting from specified date: ${actualStartDate}`);
    }

    // 既処理済み件数を表示
    const processedCount = await this.getProcessedCount();
    console.log(`✅ Already processed: ${processedCount} speeches`);

    this.progress.total = await this.getTotalCountFromDate(actualStartDate);
    this.progress.startTime = Date.now();

    if (maxBatches) {
      this.progress.total = Math.min(
        this.progress.total,
        maxBatches * batchSize,
      );
    }

    if (this.progress.total === 0) {
      console.log("🎉 No new speeches to process from the specified date!");
      return;
    }

    console.log(
      `🎯 Starting embedding process for ${this.progress.total} speeches from ${actualStartDate}`,
    );
    console.log(`📦 Batch size: ${batchSize}`);

    let batchCount = 0;
    let lastProcessedDate = "";

    while (this.progress.processed < this.progress.total) {
      if (maxBatches && batchCount >= maxBatches) {
        console.log(`🛑 Reached maximum batch limit: ${maxBatches}`);
        break;
      }

      this.progress.currentBatch = batchCount + 1;

      try {
        console.log(`🔄 Processing batch ${this.progress.currentBatch}...`);

        // データ取得（日付昇順で取得）
        const speeches = await this.fetchUnprocessedSpeechBatchByDateRange(
          actualStartDate,
          batchSize,
        );
        if (speeches.length === 0) {
          console.log("✅ No more speeches to process");
          break;
        }

        // 現在のバッチの日付範囲を設定
        const batchDates = speeches.map((s) => s.date).sort();
        const minDate = batchDates[0];
        const maxDate = batchDates[batchDates.length - 1];
        this.progress.currentDateRange = minDate === maxDate ? minDate : `${minDate} ~ ${maxDate}`;

        // 埋め込み生成・保存
        await this.embedAndStoreSpeechBatch(speeches);

        this.progress.processed += speeches.length;
        batchCount++;
        lastProcessedDate = maxDate;

        // 進捗とともに日付範囲をログ出力
        console.log(
          `✅ Batch ${this.progress.currentBatch} completed: ${speeches.length} speeches processed`,
        );
        console.log(
          `📅 Date range processed: ${this.progress.currentDateRange}`,
        );
        console.log(`🎯 Latest processed date: ${lastProcessedDate}`);

        // 進捗表示
        this.displayEmbeddingProgress();

        // 次回の開始日付を最新処理日の翌日に更新
        const nextDay = new Date(lastProcessedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        actualStartDate = nextDay.toISOString().split("T")[0];

        // 少し待機（Ollamaサーバーへの負荷軽減）
        await new Promise((resolve) => setTimeout(resolve, BATCH_PROCESSING_DELAY_MS));
      } catch (error) {
        console.error(
          `❌ Error in batch ${this.progress.currentBatch} (${this.progress.currentDateRange}):`,
          error,
        );
        this.progress.errors++;

        if (lastProcessedDate) {
          // エラーが発生した場合、最後に成功した日の翌日から再開
          const nextDay = new Date(lastProcessedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          actualStartDate = nextDay.toISOString().split("T")[0];
          console.log(
            `⚠️ Error occurred, next run should start from: ${actualStartDate}`,
          );
        }

        // エラーがあっても続行
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
    if (lastProcessedDate) {
      console.log(`📅 Last processed date: ${lastProcessedDate}`);
      const nextDay = new Date(lastProcessedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      console.log(
        `🔄 To resume, use: --start-date ${nextDay.toISOString().split("T")[0]}`,
      );
    }
  }

  async searchSimilar(
    query: string,
    limit: number = SEARCH_RESULT_LIMIT,
  ): Promise<SearchResult[]> {
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

function parseArgs(args: string[]): {
  batchSize: number;
  maxBatches?: number;
  limit?: number;
  startDate?: string;
  help: boolean;
} {
  const result = {
    batchSize: DEFAULT_BATCH_SIZE,
    maxBatches: undefined as number | undefined,
    limit: undefined as number | undefined,
    startDate: undefined as string | undefined,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        result.help = true;
        break;
      case "--start-date":
        if (i + 1 < args.length) {
          result.startDate = args[++i];
        }
        break;
      case "--batch-size":
        if (i + 1 < args.length) {
          result.batchSize = parseInt(args[++i]);
        }
        break;
      case "--max-batches":
        if (i + 1 < args.length) {
          result.maxBatches = parseInt(args[++i]);
        }
        break;
      case "--limit":
        if (i + 1 < args.length) {
          result.limit = parseInt(args[++i]);
        }
        break;
      default:
        // 位置引数としても解釈
        if (!isNaN(parseInt(arg))) {
          if (!result.batchSize || result.batchSize === DEFAULT_BATCH_SIZE) {
            result.batchSize = parseInt(arg);
          } else if (!result.maxBatches) {
            result.maxBatches = parseInt(arg);
          }
        }
        break;
    }
  }

  return result;
}

function showUsage(): void {
  console.log("🚀 Persistent Speech Embedder");
  console.log(
    "Generates embeddings for unprocessed speeches and stores them in PostgreSQL with pgvector.",
  );
  console.log("");
  console.log("📋 Usage:");
  console.log("  deno run -A scripts/persistent-embed-speeches.ts [options]");
  console.log("");
  console.log("🔧 Options:");
  console.log(
    "  --batch-size <number>     Number of speeches to process per batch (default: 10)",
  );
  console.log(
    "  --max-batches <number>    Maximum number of batches to process (optional)",
  );
  console.log(
    "  --limit <number>          Maximum total number of records to process (optional)",
  );
  console.log(
    "  --start-date <YYYY-MM-DD> Start processing from this date (optional)",
  );
  console.log("  --help, -h               Show this help message");
  console.log("");
  console.log("📅 Processing Method:");
  console.log(
    "  • If no --start-date is provided, resumes from the day after the latest processed date",
  );
  console.log("  • Processes speeches in chronological order (oldest first)");
  console.log(
    "  • Shows progress with date ranges for easy resumption after interruption",
  );
  console.log("  • Automatically calculates next start date for resumption");
  console.log("");
  console.log("📖 Examples:");
  console.log(
    "  # Process 10 speeches per batch, starting from latest processed date + 1 day",
  );
  console.log("  deno run -A scripts/persistent-embed-speeches.ts");
  console.log("");
  console.log("  # Process 20 speeches per batch, maximum 5 batches");
  console.log(
    "  deno run -A scripts/persistent-embed-speeches.ts --batch-size 20 --max-batches 5",
  );
  console.log("");
  console.log("  # Start processing from a specific date");
  console.log(
    "  deno run -A scripts/persistent-embed-speeches.ts --start-date 2023-01-01",
  );
  console.log("");
  console.log("  # Process exactly 100 records from 2025-01-01");
  console.log(
    "  deno run -A scripts/persistent-embed-speeches.ts --start-date 2025-01-01 --limit 100",
  );
  console.log("");
  console.log("🔄 Resumption:");
  console.log(
    "  After interruption, the script will show the recommended --start-date for next run.",
  );
  console.log(
    "  Copy the suggested command to resume from where you left off.",
  );
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(Deno.args);

  if (parsedArgs.help) {
    showUsage();
    return;
  }

  if (isNaN(parsedArgs.batchSize) || parsedArgs.batchSize <= 0) {
    console.error("❌ Invalid batch size. Must be a positive number.");
    showUsage();
    Deno.exit(1);
  }

  const embedder = new PersistentSpeechEmbedder();

  try {
    await embedder.initialize();
    // --limitが指定されている場合、バッチサイズとmaxBatchesを調整
    let effectiveBatchSize = parsedArgs.batchSize;
    let effectiveMaxBatches = parsedArgs.maxBatches;

    if (parsedArgs.limit) {
      if (parsedArgs.limit <= parsedArgs.batchSize) {
        // limitがバッチサイズより小さい場合、バッチサイズをlimitに設定
        effectiveBatchSize = parsedArgs.limit;
        effectiveMaxBatches = 1;
      } else if (!parsedArgs.maxBatches) {
        // limitがバッチサイズより大きい場合、maxBatchesを計算
        effectiveMaxBatches = Math.ceil(parsedArgs.limit / parsedArgs.batchSize);
      }
      console.log(
        `📊 Processing up to ${parsedArgs.limit} records (batch size: ${effectiveBatchSize}, max batches: ${effectiveMaxBatches})`,
      );
    }

    await embedder.runEmbeddingBatchByDateRange(
      effectiveBatchSize,
      parsedArgs.startDate,
      effectiveMaxBatches,
    );

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
      console.log(
        `   💬 ${result.speech_text.substring(0, DISPLAY_CONTENT_LIMIT)}...`,
      );
    });
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
    Deno.exit(1);
  } finally {
    await embedder.close();
  }
}

if (import.meta.main) {
  await main();
}
