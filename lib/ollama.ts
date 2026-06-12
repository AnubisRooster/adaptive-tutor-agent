import { Ollama } from "ollama";
import { loadEnv, ollamaHost, tutorModel, embedModel, numCtx, numPredict } from "./config";
import { getSystemSetting } from "./data";

loadEnv();

const globalForOllama = globalThis as unknown as { __ollama?: Ollama };

export const ollama =
  globalForOllama.__ollama ?? new Ollama({ host: ollamaHost() });
if (process.env.NODE_ENV !== "production") globalForOllama.__ollama = ollama;

/**
 * Returns the active tutor model. Checks the DB system_settings first so the
 * model can be changed from the admin UI without restarting the server, falling
 * back to the TUTOR_MODEL env var (or the compiled-in default).
 */
export function activeTutorModel(): string {
  try {
    return getSystemSetting("tutor_model") ?? tutorModel();
  } catch {
    return tutorModel();
  }
}

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type HealthStatus = {
  ok: boolean;
  host: string;
  tutorModel: string;
  embedModel: string;
  models: string[];
  tutorModelAvailable: boolean;
  embedModelAvailable: boolean;
  error?: string;
};

/** Check whether Ollama is reachable and the configured models are pulled. */
export async function checkHealth(): Promise<HealthStatus> {
  const host = ollamaHost();
  const wantTutor = tutorModel();
  const wantEmbed = embedModel();
  try {
    const res = await ollama.list();
    const models = res.models.map((m) => m.name);
    const has = (want: string) =>
      models.some((m) => m === want || m.startsWith(`${want}:`) || m.split(":")[0] === want.split(":")[0]);
    return {
      ok: true,
      host,
      tutorModel: wantTutor,
      embedModel: wantEmbed,
      models,
      tutorModelAvailable: has(wantTutor),
      embedModelAvailable: has(wantEmbed),
    };
  } catch (err) {
    return {
      ok: false,
      host,
      tutorModel: wantTutor,
      embedModel: wantEmbed,
      models: [],
      tutorModelAvailable: false,
      embedModelAvailable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Stream a tutor response as an async iterator of text chunks. */
export async function* streamChat(
  messages: OllamaMessage[],
  opts: { temperature?: number } = {}
): AsyncGenerator<string> {
  const stream = await ollama.chat({
    model: activeTutorModel(),
    messages,
    stream: true,
    options: { temperature: opts.temperature ?? 0.6, num_ctx: numCtx(), num_predict: numPredict() },
  });
  for await (const part of stream) {
    if (part.message?.content) yield part.message.content;
  }
}

/**
 * Stream a structured (format-constrained) completion as text chunks. Same as
 * chatOnce but yields the JSON as it is generated, so callers can surface
 * progress instead of blocking on one long request.
 */
export async function* streamStructured(
  messages: OllamaMessage[],
  opts: { temperature?: number; format?: object } = {}
): AsyncGenerator<string> {
  const stream = await ollama.chat({
    model: activeTutorModel(),
    messages,
    stream: true,
    format: opts.format,
    options: { temperature: opts.temperature ?? 0.3, num_ctx: numCtx(), num_predict: numPredict() },
  });
  for await (const part of stream) {
    if (part.message?.content) yield part.message.content;
  }
}

/** One-shot chat completion (non-streaming). */
export async function chatOnce(
  messages: OllamaMessage[],
  opts: { temperature?: number; format?: object } = {}
): Promise<string> {
  const res = await ollama.chat({
    model: activeTutorModel(),
    messages,
    stream: false,
    format: opts.format,
    options: { temperature: opts.temperature ?? 0.6, num_ctx: numCtx(), num_predict: numPredict() },
  });
  return res.message.content;
}

/** Embed a single string; returns null if embeddings are unavailable. */
export async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await ollama.embeddings({ model: embedModel(), prompt: text });
    return res.embedding;
  } catch {
    return null;
  }
}
