import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getOrCreateSession, addMessage } from "@/lib/data";
import { generateQuizQuestion } from "@/lib/quiz-gen";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  subjectId?: string;
  topicId?: string;
  kind?: "quiz" | "diagnostic";
};

// Generate one structured question for the current topic. Persisted as an
// assistant message so the conversation resumes correctly.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { subjectId, topicId } = body;
  if (!subjectId || !topicId) {
    return NextResponse.json({ error: "subjectId and topicId required." }, { status: 400 });
  }

  try {
    const q = await generateQuizQuestion({
      studentId: student.id,
      subjectId,
      topicId,
      kind: body.kind === "diagnostic" ? "diagnostic" : "quiz",
    });
    const session = getOrCreateSession(student.id, subjectId);
    addMessage({ sessionId: session.id, studentId: student.id, role: "assistant", content: q.question, topicId });
    return NextResponse.json({ question: q.question, bloomLevel: q.bloomLevel });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate a question. Is Ollama running?" },
      { status: 500 }
    );
  }
}
