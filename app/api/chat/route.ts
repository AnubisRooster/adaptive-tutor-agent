import { getActiveStudent } from "@/lib/session";
import { buildTutorTurn } from "@/lib/orchestrator";
import { streamChat, resolveLlmConfig } from "@/lib/llm";
import { getOrCreateSession, addMessage, markSubtopicTaught } from "@/lib/data";
import { awardForTeach } from "@/lib/gamify";
import type { TutorMode } from "@/lib/prompts";

export const dynamic = "force-dynamic";

type Body = {
  subjectId: string;
  topicId: string;
  mode?: TutorMode;
  history: { role: "user" | "assistant"; content: string }[];
  focus?: { name: string; description?: string };
};

export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return new Response("No active profile.", { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  const { subjectId, topicId } = body;
  const mode: TutorMode = body.mode ?? "teach";
  const history = Array.isArray(body.history) ? body.history : [];
  if (!subjectId || !topicId) return new Response("subjectId and topicId required.", { status: 400 });

  const cfg = resolveLlmConfig(student);
  const session = getOrCreateSession(student.id, subjectId);

  // Persist the latest student message (if any) for resume + context.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser) {
    addMessage({ sessionId: session.id, studentId: student.id, role: "user", content: lastUser.content, topicId });
  }

  const focus = body.focus?.name ? { name: body.focus.name, description: body.focus.description } : undefined;

  let built;
  try {
    built = await buildTutorTurn({ studentId: student.id, subjectId, topicId, mode, history, focus });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to start tutor.", { status: 400 });
  }

  // When the tutor teaches a specific sub-area, mark it taught immediately
  // (before the response finishes) so the progress bar advances right away.
  if (mode === "teach" && focus?.name) {
    markSubtopicTaught(student.id, topicId, focus.name);
    awardForTeach(student.id);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const token of streamChat(cfg, built.messages, { temperature: 0.6 })) {
          full += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        const msg =
          cfg.provider === "openrouter"
            ? "\n\n_(Couldn't reach OpenRouter. Check your API key and model selection in Model Settings.)_"
            : "\n\n_(I couldn't reach the local model. Make sure Ollama is running on the host and the tutor model is pulled.)_";
        full += msg;
        controller.enqueue(encoder.encode(msg));
        console.error("[chat] stream error:", err);
      } finally {
        if (full.trim()) {
          addMessage({ sessionId: session.id, studentId: student.id, role: "assistant", content: full, topicId });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
