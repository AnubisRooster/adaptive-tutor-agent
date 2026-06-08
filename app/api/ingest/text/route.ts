import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getSubject, getTopic, createSource } from "@/lib/data";
import { ingestText } from "@/lib/ingest";
import { fetchUrlText, fetchRaw, parseHttpUrl, httpErrorMessage } from "@/lib/html";
import { crawlSite, MAX_CRAWL_PAGES, MAX_CRAWL_DEPTH } from "@/lib/crawl";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_CHARS = 2_000_000; // ~2 MB of text

// Ingest knowledge from pasted text or a web URL. Chunking + embedding run in
// the background; the client polls /api/sources for status.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: {
    subjectId?: string;
    topicId?: string | null;
    kind?: string;
    text?: string;
    url?: string;
    name?: string;
    crawl?: boolean;
    maxPages?: number;
    maxDepth?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const subjectId = String(body.subjectId ?? "");
  const topicId = body.topicId ? String(body.topicId) : null;

  if (!subjectId || !getSubject(subjectId)) {
    return NextResponse.json({ error: "Unknown subject." }, { status: 400 });
  }
  if (topicId && !getTopic(topicId)) {
    return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
  }

  const url = body.url?.trim();
  const isUrl = !!url;

  // Crawl mode: ingest a whole same-site section starting from the URL.
  if (isUrl && body.crawl) {
    let start;
    try {
      start = parseHttpUrl(url!);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid URL." }, { status: 400 });
    }
    // Fetch the start page synchronously so obvious failures surface immediately.
    let seed;
    try {
      seed = await fetchRaw(start.toString());
    } catch {
      return NextResponse.json({ error: "Could not reach that URL." }, { status: 400 });
    }
    if (!seed.ok) {
      return NextResponse.json({ error: httpErrorMessage(seed.status) }, { status: 400 });
    }
    const maxPages = Math.max(1, Math.min(Number(body.maxPages) || 50, MAX_CRAWL_PAGES));
    const maxDepth = Math.max(0, Math.min(Number(body.maxDepth) || 3, MAX_CRAWL_DEPTH));
    const name = (body.name?.trim() || `${start.hostname} (site crawl, up to ${maxPages} pages)`).slice(0, 200);
    const source = createSource({ subjectId, topicId, kind: "crawl", name });
    void crawlSite({ sourceId: source.id, subjectId, topicId, startUrl: start.toString(), maxPages, maxDepth, seed });
    return NextResponse.json({ source }, { status: 202 });
  }

  let text = "";
  let name = "";

  if (isUrl) {
    // Fetch + extract synchronously so we can report fetch errors immediately;
    // chunking/embedding still happens in the background.
    try {
      const fetched = await fetchUrlText(url!);
      text = fetched.text;
      name = (body.name?.trim() || fetched.title || url!).slice(0, 200);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to fetch URL." },
        { status: 400 },
      );
    }
    if (!text.trim()) {
      return NextResponse.json(
        { error: "No readable text could be extracted from that page." },
        { status: 400 },
      );
    }
  } else {
    text = String(body.text ?? "");
    if (!text.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }
    name = (body.name?.trim() || "Pasted notes").slice(0, 200);
  }

  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Text exceeds the 2 MB limit." }, { status: 400 });
  }

  const source = createSource({ subjectId, topicId, kind: isUrl ? "url" : "text", name });

  // Fire-and-forget: process in the background, updating the source row.
  void ingestText({ sourceId: source.id, subjectId, topicId, sourceName: name, text });

  return NextResponse.json({ source }, { status: 202 });
}
