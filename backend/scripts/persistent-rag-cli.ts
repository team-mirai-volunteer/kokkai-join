#!/usr/bin/env -S deno run -A

// Standard library imports
import { load } from "@std/dotenv";

// Third-party library imports
import { Settings } from "npm:llamaindex";
import { Ollama, OllamaEmbedding } from "npm:@llamaindex/ollama";
import { Pool } from "npm:pg";
import pgvector from "npm:pgvector/pg";

// Constants
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const EMBEDDING_MODEL_NAME = "bge-m3";
const LLM_MODEL_NAME = "gpt-oss:20b";
const MAX_DB_CONNECTIONS = 10;
const DEFAULT_TOP_K_RESULTS = 20;
const STRUCTURED_FILTER_LIMIT = 1000;
const VECTOR_SIMILARITY_THRESHOLD_STRUCTURED = 0.8;
const VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY = 0.6;
const VECTOR_SIMILARITY_THRESHOLD_FALLBACK = 0.7;
const CHAIN_OF_AGENTS_CHUNK_SIZE = 3;
const CHAIN_OF_AGENTS_MIN_RESULTS = 3;
const MID_CONSOLIDATION_CHUNK_SIZE = 3;
const MID_CONSOLIDATION_THRESHOLD = 5;
const CONTENT_PREVIEW_LENGTH = 300;
const UNKNOWN_VALUE = "?";
const DEFAULT_DATE_VALUE = "2024-01-01";

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

interface KokkaiEntities {
	speakers?: string[]; // 議員名 (例: ["岸田文雄", "枝野幸男"])
	parties?: string[]; // 政党名 (例: ["自民党", "立憲民主党"])
	dateRange?: {
		// 期間指定
		start: string; // ISO日付文字列 "2024-01-01"
		end: string; // ISO日付文字列 "2024-12-31"
	};
	meetings?: string[]; // 会議名 (例: ["予算委員会", "法務委員会"])
	topics?: string[]; // 議題・キーワード (例: ["防衛費", "子育て支援"])
	positions?: string[]; // 役職 (例: ["総理大臣", "外務大臣"])
}

interface QueryPlan {
	originalQuestion: string; // 元の質問
	subqueries: string[]; // 分解されたサブクエリ
	entities: KokkaiEntities; // 抽出されたエンティティ
	enabledStrategies: string[]; // 使用する検索戦略 ["vector", "structured", "statistical"]
	confidence: number; // プラン信頼度 (0-1)
	estimatedComplexity: number; // 処理複雑度予測 (1-5)
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

// Type aliases for better readability
type PromptText = string;
type SqlQuery = string;
type QueryParameter = string | number;
type EmbeddingThreshold = number;

interface SubSummaryResult {
	chunkIndex: number;
	summary: string;
	sourceCount: number;
}

class PersistentKokkaiRAGCLI {
	private dbPool: Pool | null = null;

	// SQL Query Helpers
	private buildVectorSearchQuery(
		useStructuredFilter: boolean,
		threshold: EmbeddingThreshold,
	): SqlQuery {
		const baseSelect = `
      SELECT 
        speech_id, speaker, speaker_group, date, meeting_name,
        speech_text, speech_url,
        (1 - (embedding <=> $1)) as similarity_score
      FROM kokkai_speech_embeddings`;

		if (useStructuredFilter) {
			return `${baseSelect}
        WHERE speech_id = ANY($2::text[])
          AND embedding <=> $1 < ${threshold}
        ORDER BY embedding <=> $1
        LIMIT $3`;
		} else {
			return `${baseSelect}
        WHERE embedding <=> $1 < ${threshold}
        ORDER BY embedding <=> $1
        LIMIT $2`;
		}
	}

	private convertDatabaseRowToSpeechResult(row: DatabaseRow): SpeechResult {
		return {
			speechId: row.speech_id,
			speaker: row.speaker || UNKNOWN_VALUE,
			party: row.speaker_group || UNKNOWN_VALUE,
			date: row.date || DEFAULT_DATE_VALUE,
			meeting: row.meeting_name || UNKNOWN_VALUE,
			content: row.speech_text || "",
			url: row.speech_url || "",
			score: parseFloat(row.similarity_score) || 0.0,
		};
	}

	private buildFilterCondition(
		fieldName: string,
		values: string[],
		params: string[],
	): string {
		const conditions = values.map((_, i) => {
			const paramIndex = params.length + 1;
			params.push(`%${values[i]}%`);
			return `(e.${fieldName} ILIKE $${paramIndex})`;
		});
		return `(${conditions.join(" OR ")})`;
	}

	// Answer Generation Helpers
	private formatSpeechResultsForPrompt(results: SpeechResult[]): string {
		return results
			.map(
				(result, index) =>
					`【発言 ${index + 1}】
議員: ${result.speaker} (${result.party})
日付: ${result.date}
会議: ${result.meeting}
内容: ${result.content}
出典: ${result.url}
関連度: ${result.score.toFixed(3)}`,
			)
			.join("\n\n");
	}

	private createSubSummaryPrompt(
		query: string,
		context: string,
		chunkIndex: number,
		totalChunks: number,
	): PromptText {
		return `以下の国会議事録から、質問「${query}」に関連する重要な情報を観点別に整理して要約してください。

国会議事録（チャンク${chunkIndex + 1}/${totalChunks}）:
${context}

要約要件:
1. 観点別に整理（例：賛成意見、反対意見、具体的施策、懸念事項など）
2. 各観点に対して、発言者名、所属政党、日付、出典URLを保持
3. 具体的な数値や政策名を正確に記載
4. 発言内容は20-50字程度に要約
5. 500文字以内で簡潔にまとめる

要約:`;
	}

	private async generateSubSummary(
		chunk: SpeechResult[],
		chunkIndex: number,
		totalChunks: number,
		query: string,
	): Promise<SubSummaryResult> {
		const context = this.formatSpeechResultsForPrompt(chunk);
		const subPrompt = this.createSubSummaryPrompt(
			query,
			context,
			chunkIndex,
			totalChunks,
		);

		try {
			const response = await Settings.llm!.complete({ prompt: subPrompt });
			return {
				chunkIndex: chunkIndex + 1,
				summary: response.text,
				sourceCount: chunk.length,
			};
		} catch (error) {
			console.error(`❌ Sub-summary ${chunkIndex + 1} failed:`, error);
			return {
				chunkIndex: chunkIndex + 1,
				summary: "要約生成に失敗しました",
				sourceCount: chunk.length,
			};
		}
	}

	private createMidConsolidationPrompt(
		query: string,
		midChunk: string[],
		startIndex: number,
	): PromptText {
		return `以下の要約を統合して、質問「${query}」に対する中間要約を作成してください。

要約群:
${midChunk.map((s, idx) => `【要約${startIndex + idx + 1}】\n${s}`).join("\n\n")}

統合要件:
1. 観点別の整理を維持（賛成/反対、施策/課題など）
2. 重複を排除し、重要な情報を保持
3. 発言者情報と出典URLを必ず維持
4. 各観点の要点を明確にする
5. 800文字以内でまとめる

統合要約:`;
	}

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

		console.log("🚀 Persistent Kokkai RAG CLI initialized successfully");
	}

	// 1. Planner（計画係）の実装
	async createQueryPlan(userQuestion: string): Promise<QueryPlan> {
		if (!Settings.llm) {
			throw new Error("LLM not initialized");
		}

		console.log("🧠 Planning query strategy...");

		const systemPrompt = `国会議事録検索システムのプランナーとして、以下の質問を分析してください。

質問: "${userQuestion}"

以下のJSON形式で出力してください（\`\`\`json等は不要）：
{
  "subqueries": [
    "質問を効果的に検索するための分解されたサブクエリ1",
    "サブクエリ2"
  ],
  "entities": {
    "speakers": ["議員名があれば具体的に。総理→岸田文雄等"],
    "parties": ["政党名があれば"],
    "topics": ["主要キーワード", "関連語・同義語"],
    "meetings": ["特定の委員会や会議があれば"],
    "positions": ["役職があれば具体的に"],
    "dateRange": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  },
  "enabledStrategies": ["vector", "structured"],
  "confidence": 0.8,
  "estimatedComplexity": 2
}

ルール:
1. subqueriesは質問を効果的に分解したもの（1-3個）
2. entitiesは国会議事録検索に有効な情報のみ抽出
3. enabledStrategiesは["vector", "structured", "statistical"]から選択
4. confidenceは解析の信頼度(0-1)
5. estimatedComplexityは処理の複雑さ(1-5)

例：
質問「岸田総理の防衛費についての発言」
→ speakers: ["岸田文雄", "内閣総理大臣"]
→ topics: ["防衛費", "防衛予算", "防衛関係費", "国防費"]
→ subqueries: ["岸田総理 防衛費", "内閣総理大臣 防衛予算"]`;

		try {
			const response = await Settings.llm.complete({ prompt: systemPrompt });
			const planText = response.text.trim();

			// JSONパース試行
			let planData;
			try {
				planData = JSON.parse(planText);
			} catch (parseError) {
				throw new Error(
					`Failed to parse LLM response as JSON: ${
						(parseError as Error).message
					}\nResponse: ${planText}`,
				);
			}

			// QueryPlan形式に変換
			const plan: QueryPlan = {
				originalQuestion: userQuestion,
				subqueries: planData.subqueries || [userQuestion],
				entities: {
					speakers: planData.entities?.speakers || [],
					parties: planData.entities?.parties || [],
					topics: planData.entities?.topics || [],
					meetings: planData.entities?.meetings || [],
					positions: planData.entities?.positions || [],
					dateRange: planData.entities?.dateRange,
				},
				enabledStrategies: planData.enabledStrategies || ["vector"],
				confidence: planData.confidence || 0.5,
				estimatedComplexity: planData.estimatedComplexity || 2,
			};

			console.log(`📋 Query plan created:`);
			console.log(`   Original Question: ${JSON.stringify(plan)}`);
			console.log(`   Subqueries: ${plan.subqueries.length}`);
			console.log(`   Speakers: ${plan.entities.speakers?.length || 0}`);
			console.log(`   Topics: ${plan.entities.topics?.length || 0}`);
			console.log(`   Strategies: ${plan.enabledStrategies.join(", ")}`);
			console.log(`   Confidence: ${plan.confidence.toFixed(2)}`);

			return plan;
		} catch (error) {
			console.error("❌ Planning error:", error);
			throw error;
		}
	}

	// 構造化フィルタリング
	private async applyStructuredFilter(
		entities: KokkaiEntities,
	): Promise<string[]> {
		if (!this.dbPool) {
			throw new Error("Database not initialized");
		}

		const conditions = [];
		const params: string[] = [];

		// 議員名での絞り込み
		if (entities.speakers && entities.speakers.length > 0) {
			conditions.push(
				this.buildFilterCondition("speaker", entities.speakers, params),
			);
		}

		// 政党での絞り込み
		if (entities.parties && entities.parties.length > 0) {
			conditions.push(
				this.buildFilterCondition("speaker_group", entities.parties, params),
			);
		}

		// 会議名での絞り込み
		if (entities.meetings && entities.meetings.length > 0) {
			conditions.push(
				this.buildFilterCondition("meeting_name", entities.meetings, params),
			);
		}

		// 役職での絞り込み
		if (entities.positions && entities.positions.length > 0) {
			conditions.push(
				this.buildFilterCondition("speaker_role", entities.positions, params),
			);
		}

		// 日付範囲での絞り込み
		if (entities.dateRange) {
			const startParamIndex = params.length + 1;
			const endParamIndex = params.length + 2;
			params.push(entities.dateRange.start, entities.dateRange.end);
			conditions.push(
				`(e.date >= $${startParamIndex} AND e.date <= $${endParamIndex})`,
			);
		}

		if (conditions.length === 0) {
			return []; // フィルタ条件なし
		}

		const query = `
			SELECT DISTINCT e.speech_id 
			FROM kokkai_speech_embeddings e
			WHERE ${conditions.join(" AND ")}
			LIMIT ${STRUCTURED_FILTER_LIMIT}
		`;

		try {
			const result = await this.dbPool.query(query, params);
			console.log(
				`📋 Structured filter applied: ${result.rows.length} candidates`,
			);
			return result.rows.map((row: { speech_id: string }) => row.speech_id);
		} catch (error) {
			console.error("❌ Structured filter error:", error);
			return [];
		}
	}

	// プランベースの検索実行
	async executeSearchPlan(
		queryPlan: QueryPlan,
		maxResults: number = DEFAULT_TOP_K_RESULTS,
	): Promise<SpeechResult[]> {
		if (!this.dbPool || !Settings.embedModel) {
			throw new Error("Database or embedding model not initialized");
		}

		console.log(`🔍 Executing search plan...`);

		try {
			let allResults: SpeechResult[] = [];

			// 各サブクエリを実行
			for (const subquery of queryPlan.subqueries) {
				console.log(`🔎 Processing subquery: "${subquery}"`);

				// 拡張クエリ作成（トピック関連語を追加）
				let enhancedQuery = subquery;
				if (queryPlan.entities.topics && queryPlan.entities.topics.length > 0) {
					enhancedQuery = `${subquery} ${queryPlan.entities.topics.join(" ")}`;
				}

				// ベクトル検索実行
				const queryEmbedding =
					await Settings.embedModel.getTextEmbedding(enhancedQuery);

				let searchQuery: SqlQuery;
				let queryParams: QueryParameter[];

				// 構造化フィルタの適用
				if (queryPlan.enabledStrategies.includes("structured")) {
					const candidateIds = await this.applyStructuredFilter(
						queryPlan.entities,
					);

					if (candidateIds.length > 0) {
						// 構造化フィルタ + ベクトル検索
						searchQuery = this.buildVectorSearchQuery(
							true,
							VECTOR_SIMILARITY_THRESHOLD_STRUCTURED,
						);
						queryParams = [
							pgvector.toSql(queryEmbedding),
							candidateIds,
							maxResults,
						];
					} else {
						// フォールバック: ベクトル検索のみ
						searchQuery = this.buildVectorSearchQuery(
							false,
							VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY,
						);
						queryParams = [pgvector.toSql(queryEmbedding), maxResults];
					}
				} else {
					// ベクトル検索のみ
					searchQuery = this.buildVectorSearchQuery(
						false,
						VECTOR_SIMILARITY_THRESHOLD_FALLBACK,
					);
					queryParams = [pgvector.toSql(queryEmbedding), maxResults];
				}

				const result = await this.dbPool.query(searchQuery, queryParams);

				// 結果をSpeechResult形式に変換
				const subqueryResults: SpeechResult[] = result.rows.map(
					this.convertDatabaseRowToSpeechResult.bind(this),
				);

				allResults = allResults.concat(subqueryResults);
			}

			// 重複除去とスコア順ソート
			const uniqueResults = Array.from(
				new Map(allResults.map((r) => [r.speechId, r])).values(),
			)
				.sort((a, b) => b.score - a.score)
				.slice(0, maxResults);

			console.log(
				`✅ Plan execution completed: ${uniqueResults.length} unique results`,
			);
			return uniqueResults;
		} catch (error) {
			console.error("❌ Plan search error:", error);
			throw error;
		}
	}

	// 従来の簡単な検索（後方互換性）
	async search(
		userQuery: string,
		maxResults: number = DEFAULT_TOP_K_RESULTS,
	): Promise<SpeechResult[]> {
		// プランナーを使用した検索に切り替え
		const queryPlan = await this.createQueryPlan(userQuery);
		return this.executeSearchPlan(queryPlan, maxResults);
	}

	// Chain of Agents (CoA)による多段要約生成
	async generateAnswer(
		query: string,
		results: SpeechResult[],
	): Promise<string> {
		if (!Settings.llm) {
			throw new Error("LLM not initialized");
		}

		console.log(`\n🤖 Generating answer using Chain of Agents...`);
		console.log(`📊 Total results to process: ${results.length}`);

		// 結果が少ない場合は従来の処理
		if (results.length <= CHAIN_OF_AGENTS_MIN_RESULTS) {
			return this.generateSimpleAnswer(query, results);
		}

		// Chain of Agents: 多段階での要約処理
		const CHUNK_SIZE = CHAIN_OF_AGENTS_CHUNK_SIZE; // 各サブ要約で処理する件数
		const chunks: SpeechResult[][] = [];

		// 結果をチャンクに分割
		for (let i = 0; i < results.length; i += CHUNK_SIZE) {
			chunks.push(results.slice(i, i + CHUNK_SIZE));
		}

		console.log(`📦 Split into ${chunks.length} chunks for processing`);

		// Step 1: 各チャンクを並行処理でサブ要約
		console.log(`⚙️ Step 1: Generating sub-summaries...`);
		const subSummaryPromises = chunks.map((chunk, chunkIndex) =>
			this.generateSubSummary(chunk, chunkIndex, chunks.length, query),
		);

		const subSummaries = await Promise.all(subSummaryPromises);
		console.log(`✅ Generated ${subSummaries.length} sub-summaries`);

		// Step 2: サブ要約が多い場合は中間統合
		let finalSummaries = subSummaries.map((s) => s.summary);
		if (subSummaries.length > MID_CONSOLIDATION_THRESHOLD) {
			console.log(`⚙️ Step 2: Intermediate consolidation...`);
			const midChunkSize = MID_CONSOLIDATION_CHUNK_SIZE;
			const midSummaries: string[] = [];

			for (let i = 0; i < finalSummaries.length; i += midChunkSize) {
				const midChunk = finalSummaries.slice(i, i + midChunkSize);
				const midPrompt = this.createMidConsolidationPrompt(query, midChunk, i);

				try {
					const response = await Settings.llm!.complete({ prompt: midPrompt });
					midSummaries.push(response.text);
				} catch (error) {
					console.error(`❌ Mid-level consolidation failed:`, error);
					midSummaries.push(midChunk.join("\n"));
				}
			}

			finalSummaries = midSummaries;
			console.log(
				`✅ Consolidated to ${midSummaries.length} intermediate summaries`,
			);
		}

		// Step 3: 最終統合と回答生成
		console.log(`⚙️ Step 3: Final answer generation...`);
		const finalContext = finalSummaries
			.map((s, idx) => `【要約${idx + 1}】\n${s}`)
			.join("\n\n");

		const finalPrompt = `以下の要約情報を基に、質問に対する構造化された回答を作成してください。

質問: ${query}

要約情報:
${finalContext}

【必須の出力フォーマット】

## 全体のまとめ
（質問に対する結論を3-5行で簡潔に記載。根拠URLは不要）

## 観点別の詳細

### [観点名を記載（例：防衛費増額への賛成意見）]
#### 要約
（この観点の要約を2-3行で記載）

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
| 〇〇 | 〇〇党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/xxx/xxx |
| △△ | △△党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/yyy/yyy |

---

### [別の観点名を記載（例：財源確保に関する議論）]
#### 要約
（この観点の要約を2-3行で記載）

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
| □□ | □□党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/zzz/zzz |

（必要な観点数だけ繰り返し）

【注意事項】
1. 観点名は内容に応じた具体的な名前にする（「観点1」のような番号付けは不要）
2. 全体のまとめは最初に配置し、根拠URLは含めない
3. 詳細表の「内容」は要約とし、発言の直接引用は避ける
4. 各発言には必ず対応する出典URLを記載
5. 1つの表で発言情報と根拠URLを完結させる

回答:`;

		try {
			const response = await Settings.llm.complete({ prompt: finalPrompt });
			console.log(`✅ Final answer generated successfully`);
			return response.text;
		} catch (error) {
			console.error("❌ Final answer generation error:", error);
			return this.generateSimpleAnswer(query, results);
		}
	}

	// 従来のシンプルな回答生成（フォールバック用）
	private async generateSimpleAnswer(
		query: string,
		results: SpeechResult[],
	): Promise<string> {
		const context = this.formatSpeechResultsForPrompt(results);

		const prompt = `以下の国会議事録から、質問に対して正確で詳細な回答を作成してください。

質問: ${query}

国会議事録:
${context}

回答要件:
1. 発言者名と所属政党を明記する
2. 発言の日付と会議名を含める
3. 具体的な内容を引用する
4. 出典URLを提示する
5. 複数の発言がある場合は比較・整理する際も、各要点に対応する出典URLを明記する
6. まとめ部分でも、根拠となった発言の出典URLを含める
7. 事実に基づいて回答し、推測は避ける

重要: 議論の比較・整理やまとめの各項目にも、必ず根拠となった発言の出典URL（例: https://kokkai.ndl.go.jp/txt/...）を併記してください。

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
   内容: ${result.content.substring(0, CONTENT_PREVIEW_LENGTH)}...
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

	// 検索結果の関連性を評価してノイズを除去
	async evaluateRelevance(
		query: string,
		results: SpeechResult[],
	): Promise<SpeechResult[]> {
		if (!Settings.llm) {
			console.warn("⚠️ LLM not initialized for relevance evaluation");
			return results;
		}

		console.log("\n🔍 Evaluating relevance of search results...");

		// 並行処理で各結果の関連性を評価
		const evaluationPromises = results.map(async (result) => {
			try {
				const prompt = `質問: ${query}

以下の国会議事録の内容が質問に関連しているか評価してください。

発言者: ${result.speaker}
発言内容: ${result.content}

以下の形式で回答してください：
- 関連性: (高/中/低/無関係)
- 理由: (簡潔に1行で)

回答:`;

				const response = await Settings.llm.complete({ prompt });

				const evaluation = response.text;

				// 関連性の判定
				if (evaluation.includes("無関係")) {
					return null;
				} else if (evaluation.includes("低")) {
					// 低関連性の場合はスコアを調整
					result.score *= 0.5;
				} else if (evaluation.includes("中")) {
					result.score *= 0.8;
				}
				// 高関連性はそのまま

				return result;
			} catch (error) {
				console.error(`❌ Error evaluating result: ${error}`);
				return result; // エラーの場合は元の結果を返す
			}
		});

		// 並行実行して結果を取得
		const evaluatedResults = await Promise.all(evaluationPromises);

		// nullを除外（無関係と判定されたもの）
		const filteredResults = evaluatedResults.filter(
			(result): result is SpeechResult => result !== null,
		);

		// スコアで再ソート
		filteredResults.sort((a, b) => b.score - a.score);

		console.log(
			`✅ Filtered ${results.length} results to ${filteredResults.length} relevant results`,
		);

		return filteredResults;
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
