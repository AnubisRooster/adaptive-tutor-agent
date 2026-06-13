/**
 * Provider-agnostic LLM dispatch layer.
 *
 * Routes chat/quiz/grading calls to either local Ollama or OpenRouter,
 * based on each student's stored preferences. Embeddings always use
 * local Ollama (via lib/ollama.ts) regardless of provider setting.
 */

import type { Student } from "@/db/schema";
import { getStudentLlm } from "@/lib/data";
import { streamChat as ollamaStreamChat, streamStructured as ollamaStreamStructured, chatOnce as ollamaChatOnce, activeTutorModel } from "@/lib/ollama";
import { openrouterChatStream, openrouterChatOnce } from "@/lib/openrouter";
import { tutorModel } from "@/lib/config";

export type LlmProvider = "local" | "openrouter";

export type LlmConfig = {
  provider: LlmProvider;
  model: string;
  apiKey?: string;
};

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOpts = {
  temperature?: number;
  format?: object;
};

/**
 * Resolve the LLM configuration for a given student.
 * Falls back to local Ollama + the globally active tutor model when
 * the student has no OpenRouter config (or has provider set to "local").
 */
export function resolveLlmConfig(student: Student): LlmConfig {
  const llm = getStudentLlm(student);
  if (llm.llmProvider === "openrouter" && llm.openrouterApiKey && llm.openrouterModel) {
    return {
      provider: "openrouter",
      model: llm.openrouterModel,
      apiKey: llm.openrouterApiKey,
    };
  }
  // Default: local Ollama, respecting the globally-set active model override.
  return {
    provider: "local",
    model: activeTutorModel(),
  };
}

/**
 * Convenience: resolve config from just a student ID (used by generator libs
 * that receive studentId rather than the full Student object).
 */
export function resolveLlmConfigById(studentId: string): LlmConfig {
  const { getStudent } = require("@/lib/data") as typeof import("@/lib/data");
  const student = getStudent(studentId);
  if (!student) {
    return { provider: "local", model: activeTutorModel() };
  }
  return resolveLlmConfig(student);
}

/** Stream a free-form chat response, yielding text chunks. */
export async function* streamChat(
  cfg: LlmConfig,
  messages: LlmMessage[],
  opts: ChatOpts = {}
): AsyncGenerator<string> {
  if (cfg.provider === "openrouter" && cfg.apiKey) {
    yield* openrouterChatStream(cfg.apiKey, cfg.model, messages, opts);
  } else {
    yield* ollamaStreamChat(messages, opts);
  }
}

/**
 * Stream a structured (JSON-constrained) response, yielding text chunks.
 * OpenRouter maps format to response_format; Ollama uses its native format param.
 */
export async function* streamStructured(
  cfg: LlmConfig,
  messages: LlmMessage[],
  opts: ChatOpts = {}
): AsyncGenerator<string> {
  // OpenRouter's structured output is non-streaming for reliability on most models;
  // we emit the full response as one chunk after chatOnce completes.
  if (cfg.provider === "openrouter" && cfg.apiKey) {
    const result = await openrouterChatOnce(cfg.apiKey, cfg.model, messages, opts);
    yield result;
  } else {
    yield* ollamaStreamStructured(messages, opts);
  }
}

/** One-shot (non-streaming) chat completion. */
export async function chatOnce(
  cfg: LlmConfig,
  messages: LlmMessage[],
  opts: ChatOpts = {}
): Promise<string> {
  if (cfg.provider === "openrouter" && cfg.apiKey) {
    return openrouterChatOnce(cfg.apiKey, cfg.model, messages, opts);
  }
  return ollamaChatOnce(messages, opts);
}

/**
 * Return a stable fallback config using local Ollama.
 * Used by CLI scripts (pregen-subtopics, etc.) that have no user context.
 */
export function localFallbackConfig(): LlmConfig {
  return { provider: "local", model: tutorModel() };
}
