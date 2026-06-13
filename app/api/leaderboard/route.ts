import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { listLeaderboard } from "@/lib/data";
import { levelForXp } from "@/lib/gamify";

export const dynamic = "force-dynamic";

/**
 * GET — return opted-in profiles ranked by XP then streak.
 * Any logged-in user can call this.
 */
export async function GET() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  const profiles = listLeaderboard();
  const entries = profiles.map((p, i) => {
    const info = levelForXp(p.xp ?? 0);
    return {
      rank: i + 1,
      name: p.name,
      color: p.color,
      xp: p.xp ?? 0,
      level: info.level,
      title: info.title,
      streak: p.streakCount ?? 0,
      isYou: p.id === student.id,
    };
  });

  return NextResponse.json({ entries });
}
