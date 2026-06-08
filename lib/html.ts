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

  // Preserve paragraph/line structure before stripping the remaining tags.
  body = body.replace(BLOCK_TAGS, "\n");
  const text = decodeEntities(stripTags(body))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  let out = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return out.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Fetch a web page and return its title + extracted plain text. */
export async function fetchUrlText(url: string): Promise<{ title: string; text: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }

  // Use realistic browser headers — many sites (e.g. behind Cloudflare) reject
  // bot-style user agents with a 403.
  const res = await fetch(parsed.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new Error(
        `That site blocked the request (HTTP ${res.status}). It likely requires a login or blocks automated access — try copying the text and using "Paste text" instead.`,
      );
    }
    if (res.status === 429) {
      throw new Error("That site is rate-limiting requests (HTTP 429). Try again later or paste the text instead.");
    }
    if (res.status === 404) {
      throw new Error("Page not found (HTTP 404). Double-check the URL.");
    }
    throw new Error(`Failed to fetch URL (HTTP ${res.status}).`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (contentType.includes("text/html") || /<html[\s>]/i.test(raw)) {
    const { title, text } = extractTextFromHtml(raw);
    return { title: title || parsed.hostname, text };
  }
  // Plain text or other text-based content: use as-is.
  return { title: parsed.hostname, text: raw };
}
