import { loadEnv } from "../lib/config";
import { getAllTopics, getTopic, getTopicSubtopics } from "../lib/data";
import { ensureSubtopicsCached } from "../lib/subtopics-gen";

// One-time (idempotent) pass that generates + caches sub-areas for every topic
// that doesn't have them yet, so students never hit a first-open wait.
// Re-running only fills in gaps; existing subtopics are left untouched.
async function main() {
  loadEnv();
  const topics = getAllTopics();
  const pending = topics.filter((t) => getTopicSubtopics(t).length === 0);
  console.log(`[pregen] ${topics.length} topics total, ${pending.length} need sub-areas.`);

  let done = 0;
  let failed = 0;
  for (const t of pending) {
    const startedAt = Date.now();
    process.stdout.write(`[pregen] ${t.id} — ${t.name} … `);
    const ok = await ensureSubtopicsCached(t.id);
    const secs = Math.round((Date.now() - startedAt) / 1000);
    if (ok) {
      done++;
      const fresh = getTopic(t.id);
      console.log(`ok (${fresh ? getTopicSubtopics(fresh).length : "?"} areas, ${secs}s)`);
    } else {
      failed++;
      console.log(`FAILED (${secs}s)`);
    }
  }
  console.log(`[pregen] complete: ${done} generated, ${failed} failed, ${topics.length - pending.length} already had them.`);
}

main().catch((e) => {
  console.error("[pregen] error:", e);
  process.exit(1);
});
