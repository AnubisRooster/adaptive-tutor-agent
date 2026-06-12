import fs from "node:fs";
import path from "node:path";

/**
 * Minimal, dependency-free .env loader. Next.js loads .env automatically for the
 * web app, but standalone `tsx` scripts (migrate/seed) do not, so we parse it
 * ourselves. Existing process.env values always win.
 */
let loaded = false;
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function ollamaHost(): string {
  return process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
}

export function tutorModel(): string {
  return process.env.TUTOR_MODEL || "gemma4:e4b-it-qat";
}

export function embedModel(): string {
  return process.env.EMBED_MODEL || "nomic-embed-text";
}

/**
 * Context window (in tokens) requested from Ollama. Ollama defaults to a small
 * window (often 4096); when a RAG-grounded prompt exceeds it, the input is
 * silently truncated from the front, cutting off instructions/schema and
 * producing degenerate output. We request a larger window by default.
 */
export function numCtx(): number {
  const raw = Number(process.env.OLLAMA_NUM_CTX);
  return Number.isFinite(raw) && raw > 0 ? raw : 6144;
}

/**
 * Maximum tokens the model will generate per response. Capping this prevents
 * runaway verbose answers (800+ token lectures) without affecting structured
 * outputs (quiz/grade/subtopics), which are always much shorter. Override via
 * OLLAMA_NUM_PREDICT in .env if you need longer responses.
 */
export function numPredict(): number {
  const raw = Number(process.env.OLLAMA_NUM_PREDICT);
  return Number.isFinite(raw) && raw > 0 ? raw : 512;
}

export function databasePath(): string {
  return process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "tutor.db");
}
