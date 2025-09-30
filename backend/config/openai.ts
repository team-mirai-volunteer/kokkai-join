import OpenAI from "openai";
import { ensureEnv } from "../utils/env.js";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = ensureEnv("OPENROUTER_API_KEY");
    client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
  }
  return client;
}
