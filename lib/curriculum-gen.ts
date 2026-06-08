import { zodToJsonSchema } from "zod-to-json-schema";
import { chatOnce } from "@/lib/ollama";
import { CurriculumDraftSchema, type CurriculumDraft } from "@/lib/schemas";
import type { OllamaMessage } from "@/lib/ollama";

const SYSTEM = `You are a curriculum designer for an adaptive tutoring system.
Given a subject, propose a focused learning path of 6 to 10 topics, ordered from
foundational to advanced. Each topic should be a coherent unit that can be taught
and quizzed. Set prerequisiteIndexes to the indexes of earlier topics that a
student should master first (use earlier positions only; the first topic usually
has none). Keep names short and descriptions to a single clear sentence. Write the
subject "framing" as concise guidance to a tutor on how best to teach this subject.
Return ONLY JSON matching the schema.`;

/** The JSON schema passed to Ollama's `format` to constrain the output. */
export const curriculumFormat = zodToJsonSchema(CurriculumDraftSchema) as object;

/** Build the chat messages for a curriculum draft, optionally grounded in source text. */
export function curriculumMessages(args: { subjectName: string; sampleText?: string }): OllamaMessage[] {
  const sample = args.sampleText?.trim().slice(0, 6000);
  const user = sample
    ? `Subject: ${args.subjectName}\n\nThe following is an excerpt from a textbook for this subject. Base the topics on what it actually covers:\n\n"""\n${sample}\n"""\n\nPropose the curriculum as JSON.`
    : `Subject: ${args.subjectName}\n\nPropose the curriculum as JSON.`;
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}

/** Validate raw model output into a draft, clamping prerequisite indexes. */
export function parseCurriculumDraft(raw: string): CurriculumDraft {
  const parsed = CurriculumDraftSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("The model returned an unexpected curriculum format. Try again.");
  }
  const topics = parsed.data.topics.map((t, i) => ({
    ...t,
    prerequisiteIndexes: Array.from(new Set(t.prerequisiteIndexes)).filter(
      (p) => Number.isInteger(p) && p >= 0 && p < i
    ),
  }));
  return { subject: parsed.data.subject, topics };
}

/**
 * Non-streaming draft (kept for completeness / tests). The route uses the
 * streaming path so the UI can show progress.
 */
export async function generateCurriculumDraft(args: {
  subjectName: string;
  sampleText?: string;
}): Promise<CurriculumDraft> {
  const raw = await chatOnce(curriculumMessages(args), {
    temperature: 0.3,
    format: curriculumFormat,
  });
  return parseCurriculumDraft(raw);
}
