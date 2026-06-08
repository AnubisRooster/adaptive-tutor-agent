import { NextResponse } from "next/server";
import { requireAdmin, adminCurriculum } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ subjects: adminCurriculum() });
}
