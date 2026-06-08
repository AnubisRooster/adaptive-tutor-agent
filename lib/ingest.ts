import { extractPdfText } from "@/lib/pdf";
import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/ollama";
import { insertKnowledgeChunk, updateSource } from "@/lib/data";

type IngestTarget = {
  sourceId: string;
  subjectId: string;
  topicId: string | null;
  sourceName: string;
};

/**
 * Shared core: chunk already-extracted text, embed each chunk (falling back to
 * text-only storage if embeddings are unavailable, just like the seed script),
 * and store the chunks. Updates the source row's status/counts as it goes so the
 * UI can poll progress.
 */
async function storeChunks(target: IngestTarget, text: string): Promise<void> {
  const { sourceId, subjectId, topicId, sourceName } = target;
  if (!text.trim()) {
    updateSource(sourceId, { status: "error", error: "No usable text found to ingest." });
    return;
  }

  const chunks = chunkText(text);
  updateSource(sourceId, { status: "embedding", chunkCount: chunks.length, embeddedCount: 0 });

  let embeddedCount = 0;
  let embeddingsWork = true;
  for (const chunk of chunks) {
    let vec: number[] | null = null;
    if (embeddingsWork) {
      vec = await embed(chunk);
      if (vec) embeddedCount++;
      else embeddingsWork = false; // stop trying after the first failure
    }
    insertKnowledgeChunk({
      subjectId,
      topicId,
      source: sourceName,
      sourceId,
      text: chunk,
      embedding: vec,
    });
    if (embeddedCount % 10 === 0) updateSource(sourceId, { embeddedCount });
  }

  updateSource(sourceId, { status: "done", embeddedCount });
}

/**
 * Process an uploaded PDF for a source row: extract text, then chunk/embed/store
 * via the shared core. Designed to run in the background (not awaited by the
 * request handler), so it swallows errors into the source row rather than
 * throwing.
 */
export async function ingestPdf(args: IngestTarget & { buffer: ArrayBuffer }): Promise<void> {
  const { sourceId, buffer, ...target } = args;
  try {
    // Extraction is the slow first phase for large PDFs; surface it explicitly.
    updateSource(sourceId, { status: "extracting" });
    const { text } = await extractPdfText(buffer);
    await storeChunks({ sourceId, ...target }, text);
  } catch (err) {
    updateSource(sourceId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Ingest already-available plain text (pasted notes, or text already extracted
 * from a fetched web page) for a source row. Runs in the background like
 * ingestPdf and records errors on the source row.
 */
export async function ingestText(args: IngestTarget & { text: string }): Promise<void> {
  const { text, ...target } = args;
  try {
    await storeChunks(target, text);
  } catch (err) {
    updateSource(target.sourceId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
