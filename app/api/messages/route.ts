import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getOrCreateSession, getRecentMessages } from "@/lib/data";

export const dynamic = "force-dynamic";

// Load recent conversation for a subject so the student can resume.
export async function GET(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId required." }, { status: 400 });

  const session = getOrCreateSession(student.id, subjectId);
  const messages = getRecentMessages(session.id, 30)
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content, topicId: m.topicId, createdAt: m.createdAt }));

  return NextResponse.json({ sessionId: session.id, messages });
}
