import { zodToJsonSchema } from "zod-to-json-schema";
import { getStudent, getSubject, getTopic, getMastery, listOpenGaps } from "@/lib/data";
import { retrieveContext, contextBlock } from "@/lib/rag";
import { bloomName } from "@/db/curriculum";
import { chatOnce } from "@/lib/ollama";
import { QuizQuestionSchema, type QuizQuestion } from "@/lib/schemas";

const quizFormat = zodToJsonSchema(QuizQuestionSchema) as object;

/**
 * Generate exactly one question for a topic using structured output, so the
 * "Quiz me"/"Diagnostic" actions reliably return a real question instead of a
 * free-form explanation (which small models sometimes produce).
 */
export async function generateQuizQuestion(args: {
  studentId: string;
  subjectId: string;
  topicId: string;
  kind?: "quiz" | "diagnostic";
}): Promise<QuizQuestion> {
  const student = getStudent(args.studentId);
  const subject = getSubject(args.subjectId);
  const topic = getTopic(args.topicId);
  if (!student || !subject || !topic) throw new Error("Unknown student, subject, or topic.");

  const masteryRow = getMastery(student.id, topic.id);
  const bloom = masteryRow?.bloomLevel ?? 1;
  const mastery = masteryRow?.mastery ?? 0;
  const gaps = listOpenGaps(student.id, topic.id);
  const retrieved = await retrieveContext(subject.id, topic.id, `${topic.name}: ${topic.description}`, 4);
  const ctx = contextBlock(retrieved);

  const kind = args.kind ?? "quiz";
  const system =
    kind === "diagnostic"
      ? `You are an assessment item writer. Produce exactly ONE open-ended diagnostic question that gauges what the student already knows about the topic. Keep it approachable. Do NOT answer it. Return ONLY JSON matching the schema.`
      : `You are an assessment item writer. Produce exactly ONE clear quiz question on the topic, calibrated to the student's level and target Bloom level. The question must be answerable and specific. Do NOT answer it. Do NOT add any preamble or commentary. Return ONLY JSON matching the schema.`;

  const gapsLine = gaps.length
    ? `\nKnown gaps to probe if natural: ${gaps.map((g) => g.misconception).join("; ")}`
    : "";
  const ctxLine = ctx
    ? `\n\nReference context (base the question on this; do not contradict it):\n${ctx}`
    : "";

  const user = `Subject: ${subject.name}
Topic: ${topic.name} — ${topic.description}
Student mastery of this topic: ${(mastery * 100).toFixed(0)}%
Target cognitive level (Bloom's): ${bloomName(bloom)} (level ${bloom}).
Calibrate difficulty to that mastery and Bloom level.${gapsLine}${ctxLine}

Write the question as JSON. Put the question text in "question", set "bloomLevel" to ${bloom}, and put a brief grading rubric in "idealAnswerOutline".`;

  const raw = await chatOnce(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, format: quizFormat }
  );

  const parsed = QuizQuestionSchema.safeParse(JSON.parse(raw));
  if (!parsed.success || !parsed.data.question.trim()) {
    throw new Error("The model did not return a usable question. Try again.");
  }
  return parsed.data;
}
