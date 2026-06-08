import { describe, it, expect } from "vitest";
import { GradeSchema, QuizQuestionSchema } from "@/lib/schemas";

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
