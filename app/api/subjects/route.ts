import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { createSubject, createTopics, uniqueSubjectId, slugify, getSubject } from "@/lib/data";
import { ensureSubtopicsCached } from "@/lib/subtopics-gen";

export const dynamic = "force-dynamic";

type TopicInput = {
  name: string;
  description?: string;
  prerequisiteIndexes?: number[];
};
type Body = {
  name?: string;
  description?: string;
  framing?: string;
  topics?: TopicInput[];
};

// Create a new shared subject and its topic graph from an (edited) draft.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
  }
  const topics = (body.topics ?? []).filter((t) => (t.name ?? "").trim().length > 0);
  if (topics.length === 0) {
    return NextResponse.json({ error: "Add at least one topic." }, { status: 400 });
  }

  const subjectId = uniqueSubjectId(name);

  // Assign stable, unique topic ids within the subject.
  const usedSlugs = new Set<string>();
  const topicIds = topics.map((t, i) => {
    let slug = slugify(t.name) || `topic-${i + 1}`;
    let candidate = slug;
    let n = 2;
    while (usedSlugs.has(candidate)) candidate = `${slug}-${n++}`;
    usedSlugs.add(candidate);
    return `${subjectId}.${candidate}`;
  });

  createSubject({
    id: subjectId,
    name,
    description: body.description ?? "",
    framing: body.framing ?? "",
  });

  createTopics(
    topics.map((t, i) => ({
      id: topicIds[i],
      subjectId,
      name: t.name,
      description: t.description ?? "",
      // Resolve prerequisite indexes to ids, keeping only valid earlier topics.
      prerequisites: (t.prerequisiteIndexes ?? [])
        .filter((p) => Number.isInteger(p) && p >= 0 && p < i)
        .map((p) => topicIds[p]),
      orderIndex: i,
    }))
  );

  // Pre-generate sub-areas for each new topic in the background so the subject
  // arrives with drill-down options (no first-open wait). Sequential to avoid
  // overloading the local model; errors are swallowed per topic.
  void (async () => {
    for (const id of topicIds) {
      await ensureSubtopicsCached(id);
    }
  })();

  const subject = getSubject(subjectId);
  return NextResponse.json({ subject }, { status: 201 });
}
