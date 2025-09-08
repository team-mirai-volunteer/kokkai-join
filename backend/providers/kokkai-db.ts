// Adapter from Kokkai DB search results to normalized DocumentResult

import type { SpeechResult } from "../types/kokkai.ts";
import type { DocumentResult } from "../types/knowledge.ts";

export function mapSpeechToDocument(r: SpeechResult): DocumentResult {
  return {
    id: r.speechId,
    title: r.meeting || undefined,
    content: r.content,
    url: r.url || undefined,
    date: r.date || undefined,
    author: r.speaker ? `${r.speaker} (${r.party})` : undefined,
    score: r.score,
    source: { providerId: "kokkai-db", type: "kokkai-db" },
    extras: {
      speaker: r.speaker,
      party: r.party,
      meeting: r.meeting,
    },
  };
}

