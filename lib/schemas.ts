import { z } from "zod";

// Structured grading produced by the Evaluator role (temperature 0).
export const GradeSchema = z.object({
  correct: z.boolean().describe("Whether the student's answer is essentially correct"),
  score: z.number().min(0).max(1).describe("Partial-credit score from 0 to 1"),
  misconceptions: z
    .array(z.string())
    .describe("Specific misunderstandings revealed by the answer; empty if none"),
  masteryDelta: z
    .number()
    .min(-0.3)
    .max(0.3)
    .describe("Suggested change to mastery for this topic, between -0.3 and 0.3"),
  nextRecommendation: z
    .enum(["advance", "reinforce", "prerequisite"])
    .describe("advance = ready for harder material; reinforce = practice same topic; prerequisite = needs an earlier concept first"),
  feedbackForStudent: z
    .string()
    .describe("Warm, specific, encouraging feedback addressed directly to the student"),
});
export type Grade = z.infer<typeof GradeSchema>;

// An LLM-proposed curriculum for a brand-new subject. Prerequisites are given
// as indexes into the topics array (more reliable for small models than ids),
// and resolved to topic ids when the subject is saved.
export const CurriculumDraftSchema = z.object({
  subject: z.object({
    name: z.string().describe("The subject's display name"),
    description: z.string().describe("One-sentence description of the subject"),
    framing: z
      .string()
      .describe("Guidance on how a tutor should teach this subject (tone, approach, emphasis)"),
  }),
  topics: z
    .array(
      z.object({
        name: z.string().describe("Topic name"),
        description: z.string().describe("One-sentence description of the topic"),
        prerequisiteIndexes: z
          .array(z.number().int())
          .describe("Indexes (0-based) of earlier topics in this array that should be learned first"),
      })
    )
    .min(1)
    .describe("Topics ordered from foundational to advanced"),
});
export type CurriculumDraft = z.infer<typeof CurriculumDraftSchema>;

// A single quiz question generated for the current topic + Bloom level.
export const QuizQuestionSchema = z.object({
  question: z.string().describe("The question text"),
  bloomLevel: z.number().int().min(1).max(6),
  idealAnswerOutline: z
    .string()
    .describe("Brief outline of what a strong answer includes (used later for grading)"),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
