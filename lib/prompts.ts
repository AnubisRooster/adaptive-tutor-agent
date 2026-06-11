import type { Student, Subject, Topic, Mastery, Gap } from "@/db/schema";
import { bloomName } from "@/db/curriculum";

export type TutorMode = "teach" | "quiz" | "review" | "diagnostic";

function masteryBand(m: number): string {
  if (m < 0.2) return "novice (just starting)";
  if (m < 0.45) return "beginner";
  if (m < 0.7) return "developing";
  if (m < 0.85) return "proficient";
  return "advanced";
}

const TONE_GUIDE: Record<string, string> = {
  encouraging: "Warm, patient, and encouraging. Celebrate progress and normalize mistakes as part of learning.",
  direct: "Clear and concise. Encouraging but to-the-point.",
  playful: "Friendly and a little playful, using vivid analogies, while staying accurate.",
};

const BASE_RULES = `You are an expert, caring personal tutor and mentor. Your goals, in order:
1. Meet the student exactly at their current level (their Zone of Proximal Development): never far above or below it.
2. Teach ONE idea at a time. Keep turns focused and not overwhelming.
3. Coach Socratically: when the student is stuck or wrong, ask a guiding question or give a hint before revealing the full answer.
4. Encourage a growth mindset: praise effort and strategy, treat errors as useful information, never demean.
5. Check for understanding frequently with a short question, and adapt to the answer.
6. Be accurate. If you are unsure, say so rather than inventing facts. Prefer the provided reference context when relevant.
7. Use clear formatting (short paragraphs, lists, and fenced code blocks for code).
8. FORMAT ALL MATH AND SCIENCE NOTATION SO IT RENDERS (the app uses KaTeX + mhchem):
   - Inline math/symbols: wrap in \\( … \\). Display/standalone equations: wrap in \\[ … \\].
   - Chemistry — ALWAYS use mhchem \\ce{…}: e.g. \\ce{H2O}, \\ce{CO2}, \\ce{2H2 + O2 -> 2H2O}, \\ce{CH3COOH}, ions like \\ce{SO4^2-}, states like \\ce{NaCl(aq)}. Never write subscripts/superscripts as plain text (write \\ce{H2O}, not H2O or H₂O).
   - Math: use proper notation, e.g. \\( x^2 \\), \\( \\frac{a}{b} \\), \\( \\sqrt{2} \\), \\( \\Delta H \\), \\[ E = mc^2 \\].
   - Use math delimiters ONLY for genuine math/science expressions and symbols. Do NOT wrap plain numbers, quantities, units, money, or ordinary words in them: write "36.0 g of water is 2.0 moles", NOT "$36.0$ g of water is $2.0$ moles". Prefer \\( … \\) over $…$ for inline math.
   - NEVER double-wrap delimiters. Write \\( 0.174\\ \\text{mol} \\), NOT $\\( 0.174\\ \\text{mol} \\)$ — mixing $ with \\( \\) or \\[ \\] is forbidden.
   - NEVER use $\\text{X}$ to label standalone letters or element symbols in prose. Write the symbol as plain text (H, Cl, Na) or as part of a full formula with \\ce{…}. $\\text{…}$ may only appear INSIDE an \\( … \\) or \\[ … \\] expression that already contains math, e.g. \\( 0.1\\text{ mol} \\).
   - Do NOT put LaTeX/\\ce{} inside code fences or backticks — those render literally.`;

export type Focus = { name: string; description?: string };

export type SubtopicProgressEntry = {
  taught: boolean;
  quizzed: boolean;
  lastScore: number | null;
};

export function buildTutorSystemPrompt(args: {
  student: Student;
  subject: Subject;
  topic: Topic;
  masteryRow?: Mastery;
  openGaps: Gap[];
  contextText: string;
  mode: TutorMode;
  focus?: Focus;
}): string {
  const { student, subject, topic, masteryRow, openGaps, contextText, mode, focus } = args;
  const m = masteryRow?.mastery ?? 0;
  const bloom = masteryRow?.bloomLevel ?? 1;
  const tone = TONE_GUIDE[student.tonePref] ?? TONE_GUIDE.encouraging;
  const phase = masteryRow?.phase ?? "learn";

  const modeLine =
    mode === "quiz"
      ? "MODE: QUIZ. Ask exactly one focused question at the student's current Bloom level, then stop and wait. Do not answer it yourself."
      : mode === "review"
        ? "MODE: REVIEW. Revisit the open gaps below with fresh explanations and a quick check."
        : mode === "diagnostic"
          ? "MODE: DIAGNOSTIC. Ask one open-ended question to gauge what the student already knows about this topic. Keep it approachable."
          : "MODE: TEACH. Explain the next small step for this topic, then ask one short question to check understanding.";

  const gapsBlock =
    openGaps.length > 0
      ? `\nKnown open gaps for this student on this topic (revisit gently):\n${openGaps
          .map((g) => `- ${g.misconception}`)
          .join("\n")}`
      : "";

  const contextBlock = contextText
    ? `\nReference context (ground your explanation in this; do not contradict it):\n${contextText}`
    : "";

  const focusBlock = focus
    ? `\nFOCUS: The student chose to drill into the sub-area "${focus.name}"${
        focus.description ? ` (${focus.description})` : ""
      } within this topic. Center this turn specifically on that sub-area; do not drift to the rest of the topic unless it's needed to support it.`
    : "";

  // Phase & progress checklist so the tutor teaches sequentially and proposes
  // moving to quizzing/mastery at the right moment.
  let phaseBlock = "";
  try {
    const prog = JSON.parse(masteryRow?.progress ?? "{}") as Record<string, SubtopicProgressEntry>;
    const entries = Object.entries(prog);
    if (entries.length > 0) {
      const checklistLines = entries.map(([name, s]) => {
        const icon = s.quizzed ? "✔" : s.taught ? "📖" : "○";
        const score = s.lastScore !== null ? ` (score ${Math.round(s.lastScore * 100)}%)` : "";
        return `  ${icon} ${name}${score}`;
      });
      const phaseLabel =
        phase === "learn" ? "LEARN — teach the remaining sub-areas"
        : phase === "quiz" ? "QUIZ — test the student on taught sub-areas"
        : phase === "mastery" ? "MASTERY — comprehensive check; address any remaining gaps"
        : "COMPLETE — topic fully mastered";
      phaseBlock = `\nTopic phase: ${phaseLabel}\nSub-area checklist (○=not started, 📖=taught, ✔=quizzed):\n${checklistLines.join("\n")}\nWhen mode is TEACH, work through un-started sub-areas in order. When all are taught, gently suggest moving to the quiz phase.`;
    }
  } catch {
    // ignore JSON parse errors
  }

  return `${BASE_RULES}

Tone: ${tone}

Subject: ${subject.name} — ${subject.description}
Subject approach: ${subject.framing}

Current topic: ${topic.name} — ${topic.description}
Student: ${student.name}.
Estimated mastery of this topic: ${(m * 100).toFixed(0)}% (${masteryBand(m)}).
Target cognitive level (Bloom's): ${bloomName(bloom)} (level ${bloom}).
Calibrate difficulty to that mastery and Bloom level. If mastery is low, build from fundamentals with simple language and concrete examples. If high, push toward analysis, evaluation, and synthesis.
${modeLine}${focusBlock}${phaseBlock}${gapsBlock}${contextBlock}`;
}

// Evaluator: grade a single answer. Returns guidance that the system uses to
// update mastery and gaps. The JSON shape is enforced via the Ollama `format`
// parameter (GradeSchema), so the prompt only needs to describe the task.
export function buildGradeMessages(args: {
  subject: Subject;
  topic: Topic;
  bloomLevel: number;
  question: string;
  answer: string;
  contextText: string;
}) {
  const { subject, topic, bloomLevel, question, answer, contextText } = args;
  const system = `You are a rigorous but fair assessment engine for a tutoring system.
Evaluate the student's answer to a ${subject.name} question on the topic "${topic.name}" at Bloom's level ${bloomName(
    bloomLevel
  )}.
Judge correctness on substance, not phrasing. Award partial credit. Identify specific misconceptions (not vague ones).
Recommend the next step:
- "advance" if the answer is strong and they seem ready for harder material,
- "reinforce" if partially correct and they should practice this topic more,
- "prerequisite" if the answer reveals a missing earlier concept.
Set masteryDelta sensibly: a confident correct answer ~ +0.15 to +0.25; partial ~ -0.05 to +0.1; clearly wrong ~ -0.1 to -0.2.
Write feedbackForStudent directly TO the student: warm, specific, and growth-oriented. Return ONLY JSON.`;

  const ctx = contextText ? `\n\nReference material:\n${contextText}` : "";
  const user = `Question:\n${question}\n\nStudent's answer:\n${answer}${ctx}\n\nReturn the grade as JSON.`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
