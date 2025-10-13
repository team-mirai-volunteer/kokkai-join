// Database utility functions

import type {
  DatabaseRow,
  EmbeddingThreshold,
  SpeechResult,
  SqlQuery,
} from "../types/kokkai.js";
import { UNKNOWN_VALUE } from "../config/constants.js";

/**
 * Build vector search SQL query with optional structured filtering
 */
export function buildVectorSearchQuery(
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

/**
 * Convert database row to SpeechResult object
 */
export function convertDatabaseRowToSpeechResult(
  row: DatabaseRow,
): SpeechResult {
  return {
    speechId: row.speech_id,
    speaker: row.speaker || UNKNOWN_VALUE,
    party: row.speaker_group || UNKNOWN_VALUE,
    date: row.date || "",
    meeting: row.meeting_name || UNKNOWN_VALUE,
    content: row.speech_text || "",
    url: row.speech_url || "",
    score: parseFloat(row.similarity_score) || 0.0,
  };
}

/**
 * Build filter condition for structured search
 */
export function buildFilterCondition(
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
