const BLOCK_TAGS =
  /<\/(p|div|section|article|header|footer|h[1-6]|li|tr|br|blockquote|pre|figcaption)>/gi;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
};

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

/** Human-friendly message for a failed HTTP status. */
export function httpErrorMessage(status: number): string {
  if (status === 403 || status === 401) {
    return `That site blocked the request (HTTP ${status}). It likely requires a login or blocks automated access — try copying the text and using "Paste text" instead.`;
  }
  if (status === 429) {
    return "That site is rate-limiting requests (HTTP 429). Try again later or paste the text instead.";
  }
  if (status === 404) {
    return "Page not found (HTTP 404). Double-check the URL.";
  }
  return `Failed to fetch URL (HTTP ${status}).`;
}

export type RawFetch = {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  finalUrl: string;
};

/** Validate + normalize an http(s) URL, throwing a friendly error otherwise. */
export function parseHttpUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  return parsed;
}

/**
 * Fetch a URL with realistic browser headers. Never throws on a non-2xx
 * response — returns the status so callers decide how to handle it (single-page
 * ingestion surfaces an error; the crawler just skips the page).
 */
export async function fetchRaw(url: string): Promise<RawFetch> {
  const parsed = parseHttpUrl(url);
  const res = await fetch(parsed.toString(), { headers: BROWSER_HEADERS, redirect: "follow" });
  const contentType = res.headers.get("content-type") ?? "";
  const body = res.ok ? await res.text() : "";
  return { ok: res.ok, status: res.status, contentType, body, finalUrl: res.url || parsed.toString() };
}

/** Fetch a web page and return its title + extracted plain text. */
export async function fetchUrlText(url: string): Promise<{ title: string; text: string }> {
  const parsed = parseHttpUrl(url);
  const res = await fetchRaw(parsed.toString());
  if (!res.ok) throw new Error(httpErrorMessage(res.status));
  if (res.contentType.includes("text/html") || /<html[\s>]/i.test(res.body)) {
    const { title, text } = extractTextFromHtml(res.body);
    return { title: title || parsed.hostname, text };
  }
  return { title: parsed.hostname, text: res.body };
}

/** Extract a readable plain-text approximation from an HTML document. */
export function extractTextFromHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(stripTags(titleMatch[1])).trim() : "";

  let body = html;
  // Drop non-content regions entirely.
  body = body.replace(/<script[\s\S]*?<\/script>/gi, " ");
  body = body.replace(/<style[\s\S]*?<\/style>/gi, " ");
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  body = body.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<head[\s\S]*?<\/head>/gi, " ");
  body = body.replace(/<nav[\s\S]*?<\/nav>/gi, " ");

  // Preserve paragraph/line structure before stripping the remaining tags.
  body = body.replace(BLOCK_TAGS, "\n");
  const text = decodeEntities(stripTags(body))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

/** Collect absolute href URLs from an HTML document, resolved against baseUrl. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const re = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const abs = new URL(href, baseUrl);
      abs.hash = "";
      out.add(abs.toString());
    } catch {
      /* ignore malformed hrefs */
    }
  }
  return [...out];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  let out = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return out.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}
