// Vector search service for Kokkai RAG system

import { Pool } from "pg";
import pgvector from "pgvector/pg";
import type {
  KokkaiEntities,
  QueryParameter,
  QueryPlan,
  SpeechResult,
  SqlQuery,
} from "../types/kokkai.js";
import {
  buildFilterCondition,
  buildVectorSearchQuery,
  convertDatabaseRowToSpeechResult,
} from "../utils/database.js";
import {
  EmbeddingProvider,
  EmbeddingProviderFactory,
} from "../providers/embedding.js";
import {
  DEFAULT_TOP_K_RESULTS,
  STRUCTURED_FILTER_LIMIT,
  VECTOR_SIMILARITY_THRESHOLD_FALLBACK,
  VECTOR_SIMILARITY_THRESHOLD_STRUCTURED,
  VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY,
} from "../config/constants.js";

/**
 * Service responsible for vector search operations
 */
export class VectorSearchService {
  private dbPool: Pool;
  private embedProvider: EmbeddingProvider;

  constructor(pool: Pool) {
    this.dbPool = pool;
    this.embedProvider = EmbeddingProviderFactory.createFromEnv();
  }

  /**
   * Apply structured filtering to get candidate IDs
   */
  private async applyStructuredFilter(
    entities: KokkaiEntities,
  ): Promise<string[]> {
    const conditions = [];
    const params: string[] = [];

    // 議員名での絞り込み
    if (entities.speakers && entities.speakers.length > 0) {
      conditions.push(
        buildFilterCondition("speaker", entities.speakers, params),
      );
    }

    // 政党での絞り込み
    if (entities.parties && entities.parties.length > 0) {
      conditions.push(
        buildFilterCondition("speaker_group", entities.parties, params),
      );
    }

    // 会議名での絞り込み
    if (entities.meetings && entities.meetings.length > 0) {
      conditions.push(
        buildFilterCondition("meeting_name", entities.meetings, params),
      );
    }

    // 役職での絞り込み
    if (entities.positions && entities.positions.length > 0) {
      conditions.push(
        buildFilterCondition("speaker_role", entities.positions, params),
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

  /**
   * Execute search plan using vector similarity and optional structured filtering
   */
  async executeSearchPlan(
    queryPlan: QueryPlan,
    maxResults: number = DEFAULT_TOP_K_RESULTS,
  ): Promise<SpeechResult[]> {
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
          await this.embedProvider.getTextEmbedding(enhancedQuery);

        let searchQuery: SqlQuery;
        let queryParams: QueryParameter[];

        // 構造化フィルタの適用
        if (queryPlan.enabledStrategies.includes("structured")) {
          const candidateIds = await this.applyStructuredFilter(
            queryPlan.entities,
          );

          if (candidateIds.length > 0) {
            // 構造化フィルタ + ベクトル検索
            searchQuery = buildVectorSearchQuery(
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
            searchQuery = buildVectorSearchQuery(
              false,
              VECTOR_SIMILARITY_THRESHOLD_VECTOR_ONLY,
            );
            queryParams = [pgvector.toSql(queryEmbedding), maxResults];
          }
        } else {
          // ベクトル検索のみ
          searchQuery = buildVectorSearchQuery(
            false,
            VECTOR_SIMILARITY_THRESHOLD_FALLBACK,
          );
          queryParams = [pgvector.toSql(queryEmbedding), maxResults];
        }

        const result = await this.dbPool.query(searchQuery, queryParams);

        // 結果をSpeechResult形式に変換
        const subqueryResults: SpeechResult[] = result.rows.map(
          convertDatabaseRowToSpeechResult,
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

  /**
   * Simple search method for backward compatibility
   */
  async simpleSearch(
    query: string,
    maxResults: number = DEFAULT_TOP_K_RESULTS,
  ): Promise<SpeechResult[]> {
    const queryEmbedding = await this.embedProvider.getTextEmbedding(query);
    const searchQuery = buildVectorSearchQuery(
      false,
      VECTOR_SIMILARITY_THRESHOLD_FALLBACK,
    );
    const queryParams = [pgvector.toSql(queryEmbedding), maxResults];

    const result = await this.dbPool.query(searchQuery, queryParams);
    return result.rows.map(convertDatabaseRowToSpeechResult);
  }
}
