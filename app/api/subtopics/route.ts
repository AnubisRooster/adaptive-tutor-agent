import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getTopic, getTopicSubtopics, setTopicSubtopics } from "@/lib/data";
import { generateSubtopics } from "@/lib/subtopics-gen";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Return the sub-areas for a topic, generating + caching them on first use (or
// when refresh=true). Subtopics are shared globally across profiles.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: { topicId?: string; refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const topicId = String(body.topicId ?? "");
  const topic = getTopic(topicId);
  if (!topic) return NextResponse.json({ error: "Unknown topic." }, { status: 400 });

  const cached = getTopicSubtopics(topic);
  if (cached.length > 0 && !body.refresh) {
    return NextResponse.json({ subtopics: cached, cached: true });
  }

  try {
    const subtopics = await generateSubtopics(topicId);
    setTopicSubtopics(topicId, subtopics);
    return NextResponse.json({ subtopics, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate sub-areas. Is Ollama running?" },
      { status: 500 }
    );
  }
}
