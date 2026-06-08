import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/ollama";
import { insertKnowledgeChunk, updateSource } from "@/lib/data";
import { extractLinks, extractTextFromHtml, fetchRaw, parseHttpUrl, type RawFetch } from "@/lib/html";
import { loadRobots } from "@/lib/robots";

export const MAX_CRAWL_PAGES = 150;
export const MAX_CRAWL_DEPTH = 4;
const DEFAULT_DELAY_MS = 600; // politeness delay between requests
const PER_PAGE_CHUNK_CAP = 60; // avoid one huge page dominating the budget

// File extensions that aren't worth fetching as HTML pages.
const SKIP_EXT =
  /\.(pdf|docx?|pptx?|xlsx?|zip|gz|tar|rar|7z|png|jpe?g|gif|svg|webp|ico|bmp|mp4|webm|mov|avi|mp3|wav|ogg|css|js|mjs|json|xml|rss|woff2?|ttf|eot|exe|dmg|apk)(\?|#|$)/i;

// Obvious non-content paths to skip.
const SKIP_PATH = /\/(login|logout|signin|signup|register|cart|checkout|account|admin)(\/|$)/i;

const sameSite = (a: URL, b: URL): boolean => {
  const norm = (h: string) => h.replace(/^www\./i, "").toLowerCase();
  return norm(a.hostname) === norm(b.hostname);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Bounded, polite, same-site BFS crawler. Fetches HTML pages starting from
 * startUrl, extracts readable text, chunks + embeds it, and stores chunks tied
 * to the given source row. Updates the source's status/counts as it goes for
 * the polling UI. Runs in the background; errors are recorded on the source.
 */
export async function crawlSite(args: {
  sourceId: string;
  subjectId: string;
  topicId: string | null;
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  seed?: RawFetch; // already-fetched start page, to avoid a refetch
}): Promise<void> {
  const { sourceId, subjectId, topicId } = args;
  const maxPages = Math.max(1, Math.min(args.maxPages || 50, MAX_CRAWL_PAGES));
  const maxDepth = Math.max(0, Math.min(args.maxDepth || 3, MAX_CRAWL_DEPTH));

  try {
    const start = parseHttpUrl(args.startUrl);
    updateSource(sourceId, { status: "crawling", chunkCount: 0, embeddedCount: 0 });

    const robots = await loadRobots(start.origin);
    const delayMs = Math.max(DEFAULT_DELAY_MS, robots.crawlDelayMs);

    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: start.toString(), depth: 0 }];
    visited.add(start.toString());

    let pagesFetched = 0;
    let totalChunks = 0;
    let embeddedCount = 0;
    let embeddingsWork = true;
    let seed = args.seed;

    while (queue.length > 0 && pagesFetched < maxPages) {
      const { url, depth } = queue.shift()!;
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        continue;
      }
      if (!robots.isAllowed(parsed.pathname)) continue;

      // Fetch (reuse seed for the start page).
      let res: RawFetch;
      if (seed) {
        res = seed;
        seed = undefined;
      } else {
        await sleep(delayMs);
        try {
          res = await fetchRaw(url);
        } catch {
          continue;
        }
      }
      if (!res.ok) continue;
      const isHtml = res.contentType.includes("text/html") || /<html[\s>]/i.test(res.body);
      if (!isHtml) continue;

      pagesFetched++;
      const { title, text } = extractTextFromHtml(res.body);
      // Include the path so chunks from different pages are distinguishable
      // (many sites reuse the same <title> across pages).
      const path = parsed.pathname + parsed.search;
      const pageName = (title ? `${title} [${path}]` : `${parsed.hostname}${path}`).slice(0, 200);

      if (text.trim()) {
        const chunks = chunkText(text).slice(0, PER_PAGE_CHUNK_CAP);
        totalChunks += chunks.length;
        for (const chunk of chunks) {
          let vec: number[] | null = null;
          if (embeddingsWork) {
            vec = await embed(chunk);
            if (vec) embeddedCount++;
            else embeddingsWork = false;
          }
          insertKnowledgeChunk({ subjectId, topicId, source: pageName, sourceId, text: chunk, embedding: vec });
        }
        updateSource(sourceId, { status: "crawling", chunkCount: totalChunks, embeddedCount });
      }

      // Enqueue same-site links within the depth budget.
      if (depth < maxDepth) {
        for (const link of extractLinks(res.body, res.finalUrl || url)) {
          if (visited.size >= maxPages * 8) break; // safety bound on the frontier
          let lu: URL;
          try {
            lu = new URL(link);
          } catch {
            continue;
          }
          const norm = lu.toString();
          if (visited.has(norm)) continue;
          if (!sameSite(lu, start)) continue;
          if (SKIP_EXT.test(lu.pathname) || SKIP_PATH.test(lu.pathname)) continue;
          if (!robots.isAllowed(lu.pathname)) continue;
          visited.add(norm);
          queue.push({ url: norm, depth: depth + 1 });
        }
      }
    }

    if (pagesFetched === 0) {
      updateSource(sourceId, { status: "error", error: "No readable pages were crawled from that URL." });
      return;
    }
    updateSource(sourceId, { status: "done", chunkCount: totalChunks, embeddedCount });
  } catch (err) {
    updateSource(sourceId, { status: "error", error: err instanceof Error ? err.message : String(err) });
  }
}
