/**
 * Achievement definitions — client-safe (no server imports).
 * Imported by both lib/gamify.ts (server) and components/ (client).
 */

export type AchievementDef = {
  code: string;
  title: string;
  description: string;
  emoji: string;
};

export type AchievementSnapshot = {
  masteredTopicsCount: number;
  clearedGapsCount: number;
  streakCount: number;
  touchedSubjectsCount: number;
  bestScore: number;
  maxBloom: number;
};

export const ACHIEVEMENTS: (AchievementDef & { predicate: (s: AchievementSnapshot) => boolean })[] = [
  {
    code: "first_mastery",
    title: "First Mastery",
    description: "Master your first topic.",
    emoji: "🎯",
    predicate: (s) => s.masteredTopicsCount >= 1,
  },
  {
    code: "mastery_5",
    title: "Five-Star Scholar",
    description: "Master 5 topics.",
    emoji: "⭐",
    predicate: (s) => s.masteredTopicsCount >= 5,
  },
  {
    code: "mastery_20",
    title: "Deep Diver",
    description: "Master 20 topics.",
    emoji: "🏆",
    predicate: (s) => s.masteredTopicsCount >= 20,
  },
  {
    code: "streak_3",
    title: "On a Roll",
    description: "Keep a 3-day learning streak.",
    emoji: "🔥",
    predicate: (s) => s.streakCount >= 3,
  },
  {
    code: "streak_7",
    title: "Week Warrior",
    description: "Keep a 7-day learning streak.",
    emoji: "🔥",
    predicate: (s) => s.streakCount >= 7,
  },
  {
    code: "streak_30",
    title: "Unstoppable",
    description: "Keep a 30-day learning streak.",
    emoji: "⚡",
    predicate: (s) => s.streakCount >= 30,
  },
  {
    code: "gap_buster",
    title: "Gap Buster",
    description: "Clear 5 knowledge gaps.",
    emoji: "🔬",
    predicate: (s) => s.clearedGapsCount >= 5,
  },
  {
    code: "gap_buster_20",
    title: "Gap Demolisher",
    description: "Clear 20 knowledge gaps.",
    emoji: "💥",
    predicate: (s) => s.clearedGapsCount >= 20,
  },
  {
    code: "perfectionist",
    title: "Perfectionist",
    description: "Score 100% on a quiz question.",
    emoji: "💯",
    predicate: (s) => s.bestScore >= 1.0,
  },
  {
    code: "bloom_climber",
    title: "Bloom Climber",
    description: "Reach Bloom level 5 (Evaluate) on any topic.",
    emoji: "🌸",
    predicate: (s) => s.maxBloom >= 5,
  },
  {
    code: "bloom_peak",
    title: "Peak Thinker",
    description: "Reach Bloom level 6 (Create) on any topic.",
    emoji: "🧠",
    predicate: (s) => s.maxBloom >= 6,
  },
  {
    code: "polymath",
    title: "Polymath",
    description: "Study 3 or more subjects.",
    emoji: "📚",
    predicate: (s) => s.touchedSubjectsCount >= 3,
  },
];
