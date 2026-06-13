import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { streamStructured, resolveLlmConfig } from "@/lib/llm";
import { curriculumMessages, curriculumFormat, parseCurriculumDraft } from "@/lib/curriculum-gen";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Propose a subject + topic graph with the local model. No writes.
// Streams newline-delimited JSON so the client can show progress:
//   {"type":"progress","chars":N,"topics":M}
//   {"type":"draft","draft":{...}}   (final, on success)
//   {"type":"error","error":"..."}   (final, on failure)
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: { subjectName?: string; sampleText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const subjectName = (body.subjectName ?? "").trim();
  if (subjectName.length < 2) {
    return NextResponse.json({ error: "Please provide a subject name." }, { status: 400 });
  }

  const cfg = resolveLlmConfig(student);
  const messages = curriculumMessages({ subjectName, sampleText: body.sampleText });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      let buf = "";
      try {
        for await (const token of streamStructured(cfg, messages, { temperature: 0.3, format: curriculumFormat })) {
          buf += token;
          // Approximate topic count from the number of "name" keys seen so far
          // (subject.name + each topic name); good enough for a progress hint.
          const names = (buf.match(/"name"\s*:/g) || []).length;
          const topics = Math.max(0, names - 1);
          send({ type: "progress", chars: buf.length, topics });
        }
        const draft = parseCurriculumDraft(buf);
        send({ type: "draft", draft });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Failed to draft curriculum. Is Ollama running?",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
