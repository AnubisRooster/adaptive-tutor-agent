import { fetchRaw } from "@/lib/html";

export type Robots = {
  isAllowed: (pathname: string) => boolean;
  crawlDelayMs: number;
};

// Permissive fallback used when robots.txt is missing or unreadable.
const ALLOW_ALL: Robots = { isAllowed: () => true, crawlDelayMs: 0 };

/**
 * Fetch and parse the origin's robots.txt for our user agent. We honor the
 * union of the `*` group and any group whose agent token matches our UA, taking
 * the most restrictive interpretation (a path is disallowed if any applicable
 * rule disallows it). Supports `*` and `$` wildcards in paths.
 */
export async function loadRobots(origin: string, agent = "adaptivetutor"): Promise<Robots> {
  let body = "";
  try {
    const res = await fetchRaw(`${origin}/robots.txt`);
    if (!res.ok || !res.body.trim()) return ALLOW_ALL;
    // Some servers return an HTML error page with a 200; ignore those.
    if (/<html[\s>]/i.test(res.body)) return ALLOW_ALL;
    body = res.body;
  } catch {
    return ALLOW_ALL;
  }

  const lines = body.split(/\r?\n/);
  type Group = { agents: string[]; disallow: string[]; allow: string[]; delay?: number };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current) {
      lastWasAgent = false;
      if (field === "disallow") current.disallow.push(value);
      else if (field === "allow") current.allow.push(value);
      else if (field === "crawl-delay") {
        const n = Number(value);
        if (!Number.isNaN(n)) current.delay = n;
      }
    }
  }

  const applicable = groups.filter((g) => g.agents.includes("*") || g.agents.some((a) => agent.includes(a) || a.includes(agent)));
  if (applicable.length === 0) return ALLOW_ALL;

  const disallow: string[] = [];
  const allow: string[] = [];
  let delaySec = 0;
  for (const g of applicable) {
    disallow.push(...g.disallow.filter(Boolean));
    allow.push(...g.allow.filter(Boolean));
    if (g.delay) delaySec = Math.max(delaySec, g.delay);
  }

  const toRegex = (pattern: string): RegExp => {
    let re = "";
    for (const ch of pattern) {
      if (ch === "*") re += ".*";
      else if (ch === "$") re += "$";
      else re += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp("^" + re);
  };
  const disallowRes = disallow.map(toRegex);
  const allowRes = allow.map(toRegex);

  return {
    crawlDelayMs: Math.min(delaySec * 1000, 10_000), // cap to keep crawls bounded
    isAllowed: (pathname: string) => {
      const blocked = disallowRes.some((r) => r.test(pathname));
      if (!blocked) return true;
      // An explicit Allow rule can override a Disallow.
      return allowRes.some((r) => r.test(pathname));
    },
  };
}
