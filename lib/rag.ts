import { embed } from "@/lib/ollama";
import { getChunksForSubject } from "@/lib/data";
import type { KnowledgeChunk } from "@/db/schema";

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function parseEmbedding(chunk: KnowledgeChunk): number[] | null {
  if (!chunk.embedding) return null;
  try {
    const arr = JSON.parse(chunk.embedding);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export type RetrievedChunk = { text: string; source: string; topicId: string | null; score: number };

/**
 * Retrieve the top-k most relevant knowledge chunks for a query.
 * Uses embedding cosine similarity when available; otherwise falls back to
 * returning chunks for the current topic (so the tutor still has grounding).
 */
export async function retrieveContext(
  subjectId: string,
  topicId: string | null,
  query: string,
  k = 4
): Promise<RetrievedChunk[]> {
  const chunks = getChunksForSubject(subjectId);
  if (chunks.length === 0) return [];

  const queryVec = await embed(query);
  const embedded = chunks
    .map((c) => ({ chunk: c, vec: parseEmbedding(c) }))
    .filter((x): x is { chunk: KnowledgeChunk; vec: number[] } => x.vec !== null);

  if (queryVec && embedded.length > 0) {
    const scored = embedded
      .map(({ chunk, vec }) => {
        let score = cosine(queryVec, vec);
        // Gentle boost for chunks belonging to the current topic.
        if (topicId && chunk.topicId === topicId) score += 0.05;
        return { text: chunk.text, source: chunk.source, topicId: chunk.topicId, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  // Fallback: no embeddings available — prefer current-topic chunks.
  const fallback = chunks
    .filter((c) => (topicId ? c.topicId === topicId : true))
    .slice(0, k)
    .map((c) => ({ text: c.text, source: c.source, topicId: c.topicId, score: 0 }));
  if (fallback.length > 0) return fallback;
  return chunks.slice(0, k).map((c) => ({ text: c.text, source: c.source, topicId: c.topicId, score: 0 }));
}

/**
 * Render retrieved chunks into a prompt context block, bounded to `maxChars`.
 * Large ingested sources (e.g. full textbook chunks) can otherwise produce a
 * context big enough to overflow the model's window, which silently truncates
 * the prompt and breaks structured output. We add whole chunks until the budget
 * is reached, truncating the final one if needed.
 */
export function contextBlock(chunks: RetrievedChunk[], maxChars = 6000): string {
  if (chunks.length === 0) return "";
  const parts: string[] = [];
  let used = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const suffix = c.source ? ` (source: ${c.source})` : "";
    let body = c.text;
    const overhead = `[${i + 1}] `.length + suffix.length;
    const remaining = maxChars - used - overhead;
    if (remaining <= 0) break;
    if (body.length > remaining) body = body.slice(0, remaining).trimEnd() + "…";
    const entry = `[${i + 1}] ${body}${suffix}`;
    parts.push(entry);
    used += entry.length + 2; // account for the "\n\n" join
    if (used >= maxChars) break;
  }
  return parts.join("\n\n");
}
