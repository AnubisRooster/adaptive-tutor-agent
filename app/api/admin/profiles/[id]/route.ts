import { NextResponse } from "next/server";
import { requireAdmin, adminProfileDetail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await params;
  const detail = adminProfileDetail(id);
  if (!detail) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json(detail);
}
