import { NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getActiveStudent } from "@/lib/session";
import { getSubject, getTopic, getMastery, getOrCreateSession, addMessage } from "@/lib/data";
import { retrieveContext, contextBlock } from "@/lib/rag";
import { buildGradeMessages } from "@/lib/prompts";
import { GradeSchema, type Grade } from "@/lib/schemas";
import { chatOnce, resolveLlmConfig } from "@/lib/llm";
import { applyGrade } from "@/lib/adaptive";

export const dynamic = "force-dynamic";

type Body = {
  subjectId: string;
  topicId: string;
  question: string;
  answer: string;
  // If the quiz was focused on a specific subtopic, the UI sends it here so
  // applyGrade can record per-subtopic quizzed status.
  focus?: { name: string };
};

const FALLBACK: Grade = {
  correct: false,
  score: 0.5,
  misconceptions: [],
  masteryDelta: 0,
  nextRecommendation: "reinforce",
  feedbackForStudent:
    "I had trouble grading that automatically, but let's keep going — tell me more about your reasoning.",
};

export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { subjectId, topicId, question, answer } = body;
  const focusSubtopic = body.focus?.name;
  const subject = getSubject(subjectId);
  const topic = getTopic(topicId);
  if (!subject || !topic) return NextResponse.json({ error: "Unknown subject/topic." }, { status: 400 });
  if (!answer?.trim()) return NextResponse.json({ error: "Answer required." }, { status: 400 });

  const bloomLevel = getMastery(student.id, topicId)?.bloomLevel ?? 1;
  const retrieved = await retrieveContext(subjectId, topicId, `${question}\n${answer}`, 3);
  const messages = buildGradeMessages({
    subject,
    topic,
    bloomLevel,
    question: question || "(no explicit question — evaluate the student's statement)",
    answer,
    contextText: contextBlock(retrieved),
  });

  const cfg = resolveLlmConfig(student);
  let grade: Grade = FALLBACK;
  try {
    const raw = await chatOnce(cfg, messages, { temperature: 0, format: zodToJsonSchema(GradeSchema) as object });
    const parsed = GradeSchema.safeParse(JSON.parse(raw));
    if (parsed.success) grade = parsed.data;
  } catch (err) {
    console.error("[grade] model/parse error:", err);
  }

  const result = applyGrade(student.id, topicId, grade, focusSubtopic);

  // Persist the answer and the tutor's feedback for resume.
  const session = getOrCreateSession(student.id, subjectId);
  addMessage({ sessionId: session.id, studentId: student.id, role: "user", content: answer, topicId });
  addMessage({
    sessionId: session.id,
    studentId: student.id,
    role: "assistant",
    content: grade.feedbackForStudent,
    topicId,
  });

  return NextResponse.json({
    grade,
    mastery: result.mastery.mastery,
    bloomLevel: result.mastery.bloomLevel,
    phase: result.mastery.phase,
    leveledUp: result.leveledUp,
    next: result.next,
  });
}
