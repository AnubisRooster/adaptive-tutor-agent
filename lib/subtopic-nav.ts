/**
 * Pure navigation helpers for subtopic-level progression.
 * No React, no server imports — fully unit-testable.
 */

export type SubtopicItem = { name: string; description: string };
export type SubtopicProgressEntry = {
  taught: boolean;
  quizzed: boolean;
  lastScore: number | null;
};
export type ProgressMap = Record<string, SubtopicProgressEntry>;

/**
 * Return the first subtopic that hasn't been quizzed yet, or null if all are
 * quizzed (or the list is empty).
 *
 * Priority order:
 *   1. Not taught and not quizzed (completely fresh).
 *   2. Taught but not yet quizzed (progress exists, quiz pending).
 *
 * This ensures we suggest genuinely new content before revisiting taught-but-
 * unquizzed subtopics (though in practice taught-but-not-quizzed is the common
 * post-teach state).
 */
export function findNextSubtopic(
  items: SubtopicItem[],
  progressMap: ProgressMap
): SubtopicItem | null {
  if (items.length === 0) return null;

  // First pass: find the first not-yet-quizzed item (preserving list order).
  for (const item of items) {
    const entry = progressMap[item.name];
    if (!entry || !entry.quizzed) return item;
  }

  return null;
}

/**
 * Return whether all subtopics in the list have been quizzed.
 */
export function allQuizzed(items: SubtopicItem[], progressMap: ProgressMap): boolean {
  if (items.length === 0) return false;
  return items.every((item) => progressMap[item.name]?.quizzed === true);
}
