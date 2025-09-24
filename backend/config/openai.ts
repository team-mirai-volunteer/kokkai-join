import OpenAI from "openai";
import { ensureEnv } from "../utils/env.ts";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = ensureEnv("OPENAI_API_KEY");
    client = new OpenAI({ apiKey });
  }
  return client;
}
