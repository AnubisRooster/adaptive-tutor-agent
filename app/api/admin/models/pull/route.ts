import { getActiveStudent } from "@/lib/session";
import { ollama } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // pulling large models can take several minutes

// POST { model: string } — stream an ollama pull with progress updates.
// Streams newline-delimited JSON lines: { status, completed?, total?, percent? }
// On completion the last line is: { status: "done" }
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return new Response("No active profile.", { status: 401 });
  if (!student.isAdmin) return new Response("Admin only.", { status: 403 });

  const { model } = await req.json().catch(() => ({}));
  if (!model || typeof model !== "string") {
    return new Response("model is required.", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const pull = await ollama.pull({ model: model.trim(), stream: true });
        for await (const part of pull) {
          const percent =
            part.total && part.completed
              ? Math.round((part.completed / part.total) * 100)
              : null;
          send({ status: part.status, completed: part.completed, total: part.total, percent });
        }
        send({ status: "done" });
      } catch (err) {
        send({ status: "error", error: err instanceof Error ? err.message : String(err) });
      } finally {
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
