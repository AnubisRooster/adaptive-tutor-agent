import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getSubject, getTopic, createSource } from "@/lib/data";
import { ingestPdf } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// Upload a PDF to ground a subject/topic. Extraction + embedding run in the
// background; the client polls /api/sources for status.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const subjectId = String(form.get("subjectId") ?? "");
  const topicIdRaw = form.get("topicId");
  const topicId = topicIdRaw ? String(topicIdRaw) : null;
  const file = form.get("file");

  if (!subjectId || !getSubject(subjectId)) {
    return NextResponse.json({ error: "Unknown subject." }, { status: 400 });
  }
  if (topicId && !getTopic(topicId)) {
    return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is empty or exceeds 50 MB." }, { status: 400 });
  }

  const name = (file as File).name || "upload.pdf";
  if (!name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const source = createSource({ subjectId, topicId, kind: "pdf", name });

  // Fire-and-forget: process in the background, updating the source row. The
  // dev/start server is a long-running Node process, so this continues running.
  void ingestPdf({ sourceId: source.id, subjectId, topicId, sourceName: name, buffer });

  return NextResponse.json({ source }, { status: 202 });
}
