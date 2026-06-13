import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { setShareStats } from "@/lib/data";

export const dynamic = "force-dynamic";

/** POST { shareStats: boolean } — toggle leaderboard opt-in for the active profile. */
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: { shareStats?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body.shareStats !== "boolean") {
    return NextResponse.json({ error: "shareStats (boolean) is required." }, { status: 400 });
  }

  setShareStats(student.id, body.shareStats);
  return NextResponse.json({ ok: true, shareStats: body.shareStats });
}
