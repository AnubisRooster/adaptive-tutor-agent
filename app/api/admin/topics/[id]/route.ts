import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getTopic, updateTopic, deleteTopic } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await params;
  if (!getTopic(id)) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  let body: { name?: string; description?: string; orderIndex?: number; prerequisites?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  // Don't allow a topic to require itself.
  if (Array.isArray(body.prerequisites)) body.prerequisites = body.prerequisites.filter((p) => p !== id);
  updateTopic(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await params;
  if (!getTopic(id)) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  deleteTopic(id);
  return NextResponse.json({ ok: true });
}
