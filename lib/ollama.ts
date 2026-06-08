import { Ollama } from "ollama";
import { loadEnv, ollamaHost, tutorModel, embedModel } from "./config";

loadEnv();

const globalForOllama = globalThis as unknown as { __ollama?: Ollama };

export const ollama =
  globalForOllama.__ollama ?? new Ollama({ host: ollamaHost() });
if (process.env.NODE_ENV !== "production") globalForOllama.__ollama = ollama;

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
    model: tutorModel(),
    messages,
    stream: true,
    options: { temperature: opts.temperature ?? 0.6 },
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
    model: tutorModel(),
    messages,
    stream: false,
    format: opts.format,
    options: { temperature: opts.temperature ?? 0.6 },
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
