import { describe, it, expect } from "vitest";
import { GradeSchema, QuizQuestionSchema, CurriculumDraftSchema, SubtopicsSchema } from "@/lib/schemas";

describe("GradeSchema", () => {
  it("accepts a well-formed grade", () => {
    const parsed = GradeSchema.safeParse({
      correct: true,
      score: 0.9,
      misconceptions: [],
      masteryDelta: 0.2,
      nextRecommendation: "advance",
      feedbackForStudent: "Great work!",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects masteryDelta outside [-0.3, 0.3]", () => {
    const parsed = GradeSchema.safeParse({
      correct: false,
      score: 0.1,
      misconceptions: ["x"],
      masteryDelta: 0.9,
      nextRecommendation: "reinforce",
      feedbackForStudent: "Keep trying.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid nextRecommendation value", () => {
    const parsed = GradeSchema.safeParse({
      correct: false,
      score: 0.5,
      misconceptions: [],
      masteryDelta: 0,
      nextRecommendation: "explode",
      feedbackForStudent: "Hmm.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const parsed = GradeSchema.safeParse({ correct: true });
    expect(parsed.success).toBe(false);
  });
});

describe("QuizQuestionSchema", () => {
  it("accepts a valid quiz question", () => {
    const parsed = QuizQuestionSchema.safeParse({
      question: "What is validity?",
      bloomLevel: 2,
      idealAnswerOutline: "An argument is valid if...",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bloomLevel out of range", () => {
    const parsed = QuizQuestionSchema.safeParse({
      question: "Q",
      bloomLevel: 9,
      idealAnswerOutline: "...",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("CurriculumDraftSchema", () => {
  it("accepts a valid draft with prerequisite indexes", () => {
    const parsed = CurriculumDraftSchema.safeParse({
      subject: { name: "Chemistry", description: "The study of matter.", framing: "Build intuition first." },
      topics: [
        { name: "Atoms", description: "Structure of atoms.", prerequisiteIndexes: [] },
        { name: "Bonding", description: "How atoms bond.", prerequisiteIndexes: [0] },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a draft with no topics", () => {
    const parsed = CurriculumDraftSchema.safeParse({
      subject: { name: "X", description: "d", framing: "f" },
      topics: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a draft missing the subject", () => {
    const parsed = CurriculumDraftSchema.safeParse({
      topics: [{ name: "A", description: "d", prerequisiteIndexes: [] }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("SubtopicsSchema", () => {
  it("accepts a valid set of sub-areas", () => {
    const parsed = SubtopicsSchema.safeParse({
      subtopics: [
        { name: "Validity", description: "When the conclusion follows from the premises." },
        { name: "Soundness", description: "Valid plus true premises." },
        { name: "Fallacies", description: "Common errors in reasoning." },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects fewer than 3 sub-areas", () => {
    const parsed = SubtopicsSchema.safeParse({
      subtopics: [{ name: "Validity", description: "..." }],
    });
    expect(parsed.success).toBe(false);
  });
});
