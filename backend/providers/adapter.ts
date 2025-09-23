import type { DocumentResult } from "../types/knowledge.ts";
import type { SpeechResult } from "../types/kokkai.ts";
import { DEFAULT_DATE_VALUE, UNKNOWN_VALUE } from "../config/constants.ts";

export function documentToSpeech(doc: DocumentResult): SpeechResult {
  const extras = doc.extras as Record<string, unknown> | undefined;
  const speaker = (extras?.["speaker"] as string) || UNKNOWN_VALUE;
  const party = (extras?.["party"] as string) || UNKNOWN_VALUE;
  const meeting = (extras?.["meeting"] as string) || (doc.title || UNKNOWN_VALUE);
  return {
    speechId: doc.id,
    speaker,
    party,
    date: doc.date || DEFAULT_DATE_VALUE,
    meeting,
    content: doc.content || "",
    url: doc.url || "",
    score: typeof doc.score === "number" ? doc.score : 0,
  };
}
