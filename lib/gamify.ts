/**
 * Gamification engine: XP, learner levels, daily streaks, and achievement badges.
 *
 * Pure functions (levelForXp, computeStreak, xpForQuiz) are fully unit-testable.
 * Orchestrators (awardForGrade, awardForTeach) call lib/data to persist state.
 */

import {
  getStudent,
  addXp,
  setStreak,
  grantAchievement,
  listAchievements,
  countClearedGaps,
  countMasteredTopics,
  listTouchedSubjectIds,
  getMasteryMap,
} from "@/lib/data";
import type { Grade } from "@/lib/schemas";

// ---------- Levels ----------

export type LevelInfo = {
  level: number;
  title: string;
  levelFloorXp: number;
  nextLevelXp: number;
};

const LEVELS: { xp: number; title: string }[] = [
  { xp: 0,     title: "Novice" },
  { xp: 50,    title: "Apprentice" },
  { xp: 150,   title: "Student" },
  { xp: 350,   title: "Scholar" },
  { xp: 700,   title: "Adept" },
  { xp: 1200,  title: "Expert" },
  { xp: 2000,  title: "Master" },
  { xp: 3200,  title: "Sage" },
  { xp: 5000,  title: "Luminary" },
];

export function levelForXp(xp: number): LevelInfo {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { idx = i; break; }
  }
  return {
    level: idx + 1,
    title: LEVELS[idx].title,
    levelFloorXp: LEVELS[idx].xp,
    nextLevelXp: idx + 1 < LEVELS.length ? LEVELS[idx + 1].xp : LEVELS[idx].xp,
  };
}

// ---------- XP awards ----------

/** XP earned when a subtopic teaching turn completes. */
export const XP_TEACH = 5;

/**
 * XP earned for answering a quiz question.
 * Scales with partial-credit score and Bloom level so higher-order thinking
 * rewards more — but stays non-zero even for a wrong answer (effort matters).
 */
export function xpForQuiz({
  score,
  bloomLevel,
  gapCleared,
}: {
  score: number;
  bloomLevel: number;
  gapCleared: boolean;
}): number {
  const base = Math.round(5 + score * 15);        // 5–20 based on partial credit
  const bloomBonus = (bloomLevel - 1) * 2;        // 0–10 for Bloom 1–6
  const gapBonus = gapCleared ? 10 : 0;
  return base + bloomBonus + gapBonus;
}

// ---------- Streak ----------

/**
 * Compute the new streak given previous state and today's date string (YYYY-MM-DD).
 * - Same day: no change (already counted today).
 * - Yesterday: streak extends by 1.
 * - Any gap (or no prior day): resets to 1.
 */
export function computeStreak(
  prevCount: number,
  prevDay: string | null,
  today: string
): { count: number; day: string } {
  if (!prevDay) return { count: 1, day: today };
  if (prevDay === today) return { count: prevCount, day: today };
  const prev = new Date(prevDay + "T00:00:00Z");
  const cur  = new Date(today  + "T00:00:00Z");
  const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
  if (diffDays === 1) return { count: prevCount + 1, day: today };
  return { count: 1, day: today };
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Achievements ----------

import { ACHIEVEMENTS, type AchievementDef, type AchievementSnapshot } from "@/lib/gamify-catalog";

export type GamifyResult = {
  xpGained: number;
  totalXp: number;
  prevLevel: LevelInfo;
  newLevel: LevelInfo;
  leveledUpLevel: boolean;
  newBadges: AchievementDef[];
  streak: number;
};

// ---------- Orchestrators ----------

function buildSnapshot(studentId: string, currentStreak: number): AchievementSnapshot {
  const masteryMap = getMasteryMap(studentId);
  let bestScore = 0;
  let maxBloom = 1;
  for (const m of masteryMap.values()) {
    if (m.bloomLevel > maxBloom) maxBloom = m.bloomLevel;
    // Extract best per-subtopic score from progress JSON.
    try {
      const prog = JSON.parse(m.progress ?? "{}") as Record<string, { lastScore?: number | null }>;
      for (const entry of Object.values(prog)) {
        if (entry.lastScore != null && entry.lastScore > bestScore) bestScore = entry.lastScore;
      }
    } catch { /* ignore */ }
  }
  return {
    masteredTopicsCount: countMasteredTopics(studentId),
    clearedGapsCount: countClearedGaps(studentId),
    streakCount: currentStreak,
    touchedSubjectsCount: listTouchedSubjectIds(studentId).length,
    bestScore,
    maxBloom,
  };
}

function checkAndGrantAchievements(
  studentId: string,
  snapshot: AchievementSnapshot
): AchievementDef[] {
  const earned = new Set(listAchievements(studentId).map((a) => a.code));
  const newBadges: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!earned.has(def.code) && def.predicate(snapshot)) {
      const granted = grantAchievement(studentId, def.code);
      if (granted) newBadges.push(def);
    }
  }
  return newBadges;
}

/**
 * Award XP + check streaks/achievements after a quiz answer is graded.
 * Returns the gamification result to be sent back to the client.
 */
export function awardForGrade(
  studentId: string,
  opts: {
    grade: Grade;
    bloomLevel: number;
    gapCleared: boolean;
  }
): GamifyResult {
  const student = getStudent(studentId);
  const prevXp = student?.xp ?? 0;
  const prevLevel = levelForXp(prevXp);

  const xpGained = xpForQuiz({
    score: opts.grade.score ?? (opts.grade.correct ? 1 : 0),
    bloomLevel: opts.bloomLevel,
    gapCleared: opts.gapCleared,
  });

  const totalXp = addXp(studentId, xpGained);
  const newLevel = levelForXp(totalXp);

  const today = todayUtc();
  const prev = computeStreak(student?.streakCount ?? 0, student?.streakLastDay ?? null, today);
  setStreak(studentId, prev.count, prev.day);

  const snapshot = buildSnapshot(studentId, prev.count);
  const newBadges = checkAndGrantAchievements(studentId, snapshot);

  return {
    xpGained,
    totalXp,
    prevLevel,
    newLevel,
    leveledUpLevel: newLevel.level > prevLevel.level,
    newBadges,
    streak: prev.count,
  };
}

/**
 * Award a small XP bonus when a subtopic teaching turn completes.
 * Returns minimal info (just xp total); celebrations are shown on next state poll.
 */
export function awardForTeach(studentId: string): { totalXp: number; streak: number } {
  const student = getStudent(studentId);
  const totalXp = addXp(studentId, XP_TEACH);

  const today = todayUtc();
  const prev = computeStreak(student?.streakCount ?? 0, student?.streakLastDay ?? null, today);
  setStreak(studentId, prev.count, prev.day);

  return { totalXp, streak: prev.count };
}

/** Build the full gamify summary for a student (used by /api/state). */
export function gamifySummary(studentId: string): {
  xp: number;
  level: number;
  title: string;
  levelFloorXp: number;
  nextLevelXp: number;
  streak: number;
  shareStats: boolean;
  badges: { code: string; title: string; description: string; emoji: string; earnedAt: number }[];
} {
  const student = getStudent(studentId);
  const xp = student?.xp ?? 0;
  const info = levelForXp(xp);
  const earned = listAchievements(studentId);
  const badgeMap = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));
  const badges = earned.map((a) => {
    const def = badgeMap.get(a.code);
    return {
      code: a.code,
      title: def?.title ?? a.code,
      description: def?.description ?? "",
      emoji: def?.emoji ?? "🏅",
      earnedAt: a.earnedAt,
    };
  });
  return {
    xp,
    level: info.level,
    title: info.title,
    levelFloorXp: info.levelFloorXp,
    nextLevelXp: info.nextLevelXp,
    streak: student?.streakCount ?? 0,
    shareStats: student?.shareStats ?? false,
    badges,
  };
}
