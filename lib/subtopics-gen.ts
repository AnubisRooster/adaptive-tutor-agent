import { zodToJsonSchema } from "zod-to-json-schema";
import { chatOnce } from "@/lib/ollama";
import { getSubject, getTopic, type Subtopic } from "@/lib/data";
import { retrieveContext, contextBlock } from "@/lib/rag";
import { SubtopicsSchema } from "@/lib/schemas";

const subtopicsFormat = zodToJsonSchema(SubtopicsSchema) as object;

const SYSTEM = `You design the sub-structure of a learning topic for an adaptive tutor.
Given a subject and one of its topics, list the distinct sub-areas, themes, or
key questions a student could drill into within that topic. Order them roughly
from foundational to advanced. Each sub-area should be a coherent thing a tutor
could teach and quiz on its own. Keep names short (a few words) and descriptions
to a single clear sentence. Produce 5 to 8 sub-areas unless the topic is unusually
narrow. Ground them in the reference material when provided. Return ONLY JSON
matching the schema.`;

/**
 * Generate the list of sub-areas for a topic, grounded in any ingested material
 * for that subject/topic. Does not persist; the caller decides whether to cache.
 */
export async function generateSubtopics(topicId: string): Promise<Subtopic[]> {
  const topic = getTopic(topicId);
  if (!topic) throw new Error("Unknown topic.");
  const subject = getSubject(topic.subjectId);
  if (!subject) throw new Error("Unknown subject.");

  const retrieved = await retrieveContext(subject.id, topic.id, `${topic.name}: ${topic.description}`, 4);
  const ctx = contextBlock(retrieved);
  const ctxLine = ctx ? `\n\nReference material (base the sub-areas on this where relevant):\n${ctx}` : "";

  const user = `Subject: ${subject.name} — ${subject.description}
Topic: ${topic.name} — ${topic.description}${ctxLine}

List the sub-areas a student could drill into, as JSON.`;

  const raw = await chatOnce(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { temperature: 0.4, format: subtopicsFormat }
  );

  const parsed = SubtopicsSchema.safeParse(JSON.parse(raw));
  if (!parsed.success || parsed.data.subtopics.length === 0) {
    throw new Error("The model did not return usable sub-areas. Try again.");
  }
  // De-dupe by name and clamp lengths.
  const seen = new Set<string>();
  const list: Subtopic[] = [];
  for (const s of parsed.data.subtopics) {
    const name = s.name.trim().slice(0, 120);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    list.push({ name, description: s.description.trim().slice(0, 300) });
  }
  return list;
}
