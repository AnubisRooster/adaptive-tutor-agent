import {
  getMastery,
  getMasteryMap,
  upsertMastery,
  getTopic,
  listTopics,
  topicPrerequisites,
  addGap,
  clearGapsForTopic,
  markSubtopicQuizzed,
} from "@/lib/data";
import type { Grade } from "@/lib/schemas";
import type { Mastery, Topic } from "@/db/schema";

const MASTERED = 0.8;

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

export type ApplyGradeResult = {
  mastery: Mastery;
  leveledUp: boolean;
  next: NextStep;
};

export type NextStep = {
  topicId: string;
  topicName: string;
  reason: "advance" | "reinforce" | "prerequisite";
  note: string;
};

/**
 * Apply a structured grade to a student's mastery for a topic.
 * BKT-style: nudge mastery by the model's suggested delta with light smoothing,
 * advance Bloom level once a topic is reliably mastered, and record/clear gaps.
 * If a focusSubtopic is provided (from the quiz UI), updates per-subtopic progress too.
 */
export function applyGrade(
  studentId: string,
  topicId: string,
  grade: Grade,
  focusSubtopic?: string
): ApplyGradeResult {
  const topic = getTopic(topicId);
  const prev = getMastery(studentId, topicId);
  const prevMastery = prev?.mastery ?? 0;
  let bloom = prev?.bloomLevel ?? 1;

  // Smoothed update: blend old mastery with the graded outcome so single
  // answers don't swing the estimate too hard.
  const outcome = clamp(prevMastery + grade.masteryDelta);
  const newMastery = clamp(prevMastery * 0.6 + outcome * 0.4);

  let leveledUp = false;
  if (newMastery >= MASTERED && grade.nextRecommendation === "advance" && bloom < 6) {
    bloom += 1;
    leveledUp = true;
  }

  const updated = upsertMastery(studentId, topicId, {
    mastery: newMastery,
    bloomLevel: bloom,
    attempts: (prev?.attempts ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (grade.correct ? 1 : 0),
  });

  // Per-subtopic quizzed status.
  if (focusSubtopic) {
    markSubtopicQuizzed(studentId, topicId, focusSubtopic, grade.score ?? (grade.correct ? 1 : 0));
  }

  // Track and clear gaps.
  for (const m of grade.misconceptions) {
    if (m && m.trim().length > 0) addGap(studentId, topicId, m.trim());
  }
  if (newMastery >= MASTERED) clearGapsForTopic(studentId, topicId);

  const next = selectNextTopic(studentId, topicId, grade.nextRecommendation, newMastery, topic);
  return { mastery: updated, leveledUp, next };
}

/** Choose what to focus on next given the recommendation and mastery state. */
export function selectNextTopic(
  studentId: string,
  currentTopicId: string,
  recommendation: Grade["nextRecommendation"],
  currentMastery: number,
  currentTopic?: Topic
): NextStep {
  const topic = currentTopic ?? getTopic(currentTopicId);
  if (!topic) {
    return { topicId: currentTopicId, topicName: currentTopicId, reason: "reinforce", note: "Keep practicing." };
  }
  const masteryMap = getMasteryMap(studentId);
  const masteryOf = (id: string) => masteryMap.get(id)?.mastery ?? 0;

  if (recommendation === "prerequisite") {
    const prereqs = topicPrerequisites(topic);
    let weakest: Topic | undefined;
    let weakestScore = Infinity;
    for (const pid of prereqs) {
      const score = masteryOf(pid);
      if (score < weakestScore) {
        const t = getTopic(pid);
        if (t) {
          weakest = t;
          weakestScore = score;
        }
      }
    }
    if (weakest) {
      return {
        topicId: weakest.id,
        topicName: weakest.name,
        reason: "prerequisite",
        note: `Let's shore up "${weakest.name}" first — it underpins this.`,
      };
    }
    return { topicId: topic.id, topicName: topic.name, reason: "reinforce", note: "Let's revisit the basics here." };
  }

  if (recommendation === "advance" && currentMastery >= MASTERED) {
    // Move to the next topic in the subject whose prerequisites are satisfied.
    const subjectTopics = listTopics(topic.subjectId);
    const after = subjectTopics
      .filter((t) => t.orderIndex > topic.orderIndex)
      .find((t) => topicPrerequisites(t).every((p) => masteryOf(p) >= 0.5));
    if (after) {
      return {
        topicId: after.id,
        topicName: after.name,
        reason: "advance",
        note: `Great progress — ready to move on to "${after.name}".`,
      };
    }
  }

  return {
    topicId: topic.id,
    topicName: topic.name,
    reason: "reinforce",
    note: "Let's practice this a bit more to lock it in.",
  };
}

/** Pick a sensible starting topic for a subject: earliest not-yet-mastered. */
export function recommendStartTopic(studentId: string, subjectId: string): Topic | undefined {
  const subjectTopics = listTopics(subjectId);
  const masteryMap = getMasteryMap(studentId);
  const notMastered = subjectTopics.find((t) => (masteryMap.get(t.id)?.mastery ?? 0) < 0.8);
  return notMastered ?? subjectTopics[0];
}
