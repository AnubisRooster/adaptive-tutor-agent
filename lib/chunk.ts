// Shared text chunker used by both the seed script and runtime ingestion so
// the knowledge base is split identically no matter how content arrives.
// Splits on blank lines (paragraphs) and packs paragraphs into chunks near a
// target size, carrying a small overlap so context isn't lost at boundaries.
export function chunkText(text: string, target = 700, overlap = 120): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > target && buf.length > 0) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}
