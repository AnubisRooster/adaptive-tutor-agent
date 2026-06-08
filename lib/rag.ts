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

export function contextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[${i + 1}] ${c.text}${c.source ? ` (source: ${c.source})` : ""}`)
    .join("\n\n");
}
