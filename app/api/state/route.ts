import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import {
  listSubjects,
  listTopics,
  getMasteryMap,
  listOpenGaps,
  getAllTopics,
  topicPrerequisites,
} from "@/lib/data";
import { resolveLlmConfig } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  const masteryMap = getMasteryMap(student.id);
  const allTopics = getAllTopics();
  const topicName = new Map(allTopics.map((t) => [t.id, t.name]));

  const subjects = listSubjects().map((s) => {
    const topics = listTopics(s.id).map((t) => {
      const m = masteryMap.get(t.id);
      const prereqs = topicPrerequisites(t);
      const unlocked = prereqs.every((p) => (masteryMap.get(p)?.mastery ?? 0) >= 0.5);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        orderIndex: t.orderIndex,
        prerequisites: prereqs,
        mastery: m?.mastery ?? 0,
        bloomLevel: m?.bloomLevel ?? 1,
        attempts: m?.attempts ?? 0,
        unlocked,
        phase: m?.phase ?? "learn",
        // Parse once here; already stored as JSON string in DB.
        progress: (() => {
          try { return JSON.parse(m?.progress ?? "{}"); } catch { return {}; }
        })(),
      };
    });
    const avg = topics.length
      ? topics.reduce((a, t) => a + t.mastery, 0) / topics.length
      : 0;
    const recommended = topics.find((t) => t.unlocked && t.mastery < 0.8) ?? topics[0];
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      averageMastery: avg,
      recommendedTopicId: recommended?.id ?? null,
      topics,
    };
  });

  const gaps = listOpenGaps(student.id).map((g) => ({
    id: g.id,
    topicId: g.topicId,
    topicName: topicName.get(g.topicId) ?? g.topicId,
    misconception: g.misconception,
    detectedAt: g.detectedAt,
  }));

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      color: student.color,
      isAdmin: student.isAdmin,
      pacePref: student.pacePref,
      tonePref: student.tonePref,
      themePref: student.themePref ?? "system",
    },
    subjects,
    gaps,
    activeModel: resolveLlmConfig(student).model,
    activeProvider: resolveLlmConfig(student).provider,
  });
}
