import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listChunks, getChunk, deleteChunk } from "@/lib/data";

export const dynamic = "force-dynamic";

const PREVIEW = 600;

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId required." }, { status: 400 });
  const topicParam = url.searchParams.get("topicId");
  // topicId omitted = all chunks in subject; topicId=__none = subject-level chunks.
  const topicId = topicParam === null ? undefined : topicParam === "__none" ? null : topicParam;
  const chunks = listChunks(subjectId, topicId).map((c) => ({
    id: c.id,
    topicId: c.topicId,
    source: c.source,
    sourceId: c.sourceId,
    embedded: !!c.embedding,
    length: c.text.length,
    preview: c.text.slice(0, PREVIEW),
  }));
  return NextResponse.json({ chunks });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !getChunk(id)) return NextResponse.json({ error: "Chunk not found." }, { status: 404 });
  deleteChunk(id);
  return NextResponse.json({ ok: true });
}
