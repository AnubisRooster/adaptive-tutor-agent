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

  const res = await fetch(parsed.toString(), {
    headers: {
      "User-Agent": "AdaptiveTutor/1.0 (+local knowledge ingestion)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) {
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
