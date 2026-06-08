import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { listSources } from "@/lib/data";

export const dynamic = "force-dynamic";

// List ingestion status (optionally for one subject) so the UI can poll progress.
export async function GET(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId") ?? undefined;
  return NextResponse.json({ sources: listSources(subjectId) });
}
