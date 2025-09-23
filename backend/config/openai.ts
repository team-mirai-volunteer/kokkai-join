import OpenAI from "openai";
import { ensureEnv } from "../utils/env.ts";

export type LLMTask =
  | "query_planning"
  | "relevance_evaluation"
  | "answer_generation"
  | "section_synthesis"
  | "generic";

const DEFAULT_MODEL = Deno.env.get("LLM_MODEL") ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const TASK_MODEL_ENV: Record<Exclude<LLMTask, "generic">, string[]> = {
  query_planning: ["LLM_MODEL_QUERY_PLANNING", "OPENAI_MODEL_QUERY_PLANNING"],
  relevance_evaluation: ["LLM_MODEL_RELEVANCE", "OPENAI_MODEL_RELEVANCE"],
  answer_generation: ["LLM_MODEL_ANSWER", "OPENAI_MODEL_ANSWER"],
  section_synthesis: ["LLM_MODEL_SECTION", "OPENAI_MODEL_SECTION"],
};

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = ensureEnv("OPENAI_API_KEY");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function resolveModel(
  task: LLMTask | undefined,
  override?: string,
): string {
  if (override && override.trim().length > 0) return override;
  if (task && task !== "generic") {
    const envKeys = TASK_MODEL_ENV[task];
    for (const key of envKeys) {
      const value = key ? Deno.env.get(key) : undefined;
      if (value && value.trim().length > 0) {
        return value;
      }
    }
  }
  return DEFAULT_MODEL;
}

type ChatCompletionsCreateParams = Parameters<
  OpenAI["chat"]["completions"]["create"]
>[0];
type ChatCompletionResponse = Awaited<
  ReturnType<OpenAI["chat"]["completions"]["create"]>
>;

export type ChatCompletionParams =
  & Omit<
    ChatCompletionsCreateParams,
    "model"
  >
  & {
    model?: ChatCompletionsCreateParams["model"];
    task?: LLMTask;
  };

async function createChatCompletion(
  params: ChatCompletionParams,
): Promise<ChatCompletionResponse> {
  const { task = "generic", model, ...rest } = params;
  const messages = params.messages;
  const payload: ChatCompletionsCreateParams = {
    ...rest,
    messages,
    model: resolveModel(task, model),
  };
  try {
    return await getOpenAIClient().chat.completions.create(payload);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`[OpenAI] ${error.message}`);
    }
    throw error;
  }
}

export const openaiClient = {
  chat: {
    completions: {
      create: createChatCompletion,
    },
  },
};

export function getDefaultModel(): string {
  return DEFAULT_MODEL;
}
