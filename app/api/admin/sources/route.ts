import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listSources, getSource, deleteSource, getChunksForSource, setChunkEmbedding, updateSource } from "@/lib/data";
import { embed } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId") ?? undefined;
  return NextResponse.json({ sources: listSources(subjectId) });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !getSource(id)) return NextResponse.json({ error: "Source not found." }, { status: 404 });
  deleteSource(id);
  return NextResponse.json({ ok: true });
}

// Re-embed a source's chunks that are missing embeddings (e.g. if Ollama was
// down during the original ingest).
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const source = id ? getSource(id) : undefined;
  if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });

  const chunks = getChunksForSource(source.id);
  let embedded = chunks.filter((c) => c.embedding).length;
  updateSource(source.id, { status: "embedding", chunkCount: chunks.length, embeddedCount: embedded });

  let failed = 0;
  for (const c of chunks) {
    if (c.embedding) continue;
    const vec = await embed(c.text);
    if (vec) {
      setChunkEmbedding(c.id, vec);
      embedded += 1;
      updateSource(source.id, { embeddedCount: embedded });
    } else {
      failed += 1;
    }
  }
  updateSource(source.id, {
    status: failed > 0 && embedded < chunks.length ? "error" : "done",
    embeddedCount: embedded,
    error: failed > 0 ? `${failed} chunk(s) failed to embed — is Ollama running?` : null,
  });
  return NextResponse.json({ ok: true, embedded, total: chunks.length, failed });
}
