import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSubject, updateSubject, deleteSubject } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await params;
  if (!getSubject(id)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  let body: { name?: string; description?: string; framing?: string; orderIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  updateSubject(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await params;
  if (!getSubject(id)) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  deleteSubject(id);
  return NextResponse.json({ ok: true });
}
