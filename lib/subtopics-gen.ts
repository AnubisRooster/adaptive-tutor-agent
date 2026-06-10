import { zodToJsonSchema } from "zod-to-json-schema";
import { chatOnce } from "@/lib/ollama";
import { getSubject, getTopic, getTopicSubtopics, setTopicSubtopics, type Subtopic } from "@/lib/data";
import { retrieveContext, contextBlock } from "@/lib/rag";
import { SubtopicsSchema } from "@/lib/schemas";

const subtopicsFormat = zodToJsonSchema(SubtopicsSchema) as object;

// Remove markdown code fences (```json ... ```) that some models wrap JSON in,
// even when there is surrounding prose. Returns the inner text trimmed.
function stripCodeFences(text: string): string {
  let t = text.trim();
  const open = t.match(/```[a-zA-Z0-9]*\s*/);
  if (open) {
    t = t.slice((open.index ?? 0) + open[0].length);
    const close = t.lastIndexOf("```");
    if (close >= 0) t = t.slice(0, close);
  }
  return t.trim();
}

// Scan for the first balanced top-level JSON object, ignoring braces that occur
// inside string literals. Handles responses with leading/trailing prose.
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseStructuredJson(raw: string): unknown {
  const cleaned = stripCodeFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to balanced-brace extraction.
  }

  const candidate = extractFirstJsonObject(cleaned) ?? extractFirstJsonObject(raw);
  if (candidate) {
    return JSON.parse(candidate);
  }

  throw new Error("The model returned invalid JSON.");
}

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

  // Small models occasionally emit prose or malformed JSON; retry once before
  // giving up. Lower the temperature on the retry to favor compliant output.
  let parsed: ReturnType<typeof SubtopicsSchema.safeParse> | null = null;
  let lastRaw = "";
  for (let attempt = 0; attempt < 2 && (!parsed || !parsed.success); attempt++) {
    lastRaw = await chatOnce(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      { temperature: attempt === 0 ? 0.4 : 0.1, format: subtopicsFormat }
    );
    try {
      parsed = SubtopicsSchema.safeParse(parseStructuredJson(lastRaw));
    } catch {
      parsed = null;
    }
  }

  if (!parsed || !parsed.success || parsed.data.subtopics.length === 0) {
    console.error("[subtopics] failed to parse model output:", JSON.stringify(lastRaw).slice(0, 600));
    throw new Error("The model returned invalid JSON.");
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

/**
 * Generate + cache sub-areas for a topic if it doesn't already have them.
 * Safe to call in the background (e.g. after subject creation or in a batch
 * pass); errors are swallowed so a single failure doesn't abort the caller.
 * Returns true if it generated (or already had) subtopics.
 */
export async function ensureSubtopicsCached(topicId: string): Promise<boolean> {
  const topic = getTopic(topicId);
  if (!topic) return false;
  if (getTopicSubtopics(topic).length > 0) return true;
  try {
    const subs = await generateSubtopics(topicId);
    setTopicSubtopics(topicId, subs);
    return true;
  } catch {
    return false;
  }
}
