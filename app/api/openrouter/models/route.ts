import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { fetchModelCatalog, rankModels, type OpenRouterModel } from "@/lib/openrouter";
import { getSystemSetting, setSystemSetting } from "@/lib/data";

export const dynamic = "force-dynamic";

const CACHE_KEY = "openrouter_models_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CachePayload = {
  fetchedAt: number;
  models: OpenRouterModel[];
};

function readCache(): CachePayload | null {
  const raw = getSystemSetting(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(models: OpenRouterModel[]): CachePayload {
  const payload: CachePayload = { fetchedAt: Date.now(), models };
  setSystemSetting(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

/**
 * GET — return the ranked OpenRouter model catalog.
 * Lazily refreshes from the OpenRouter API when the cache is older than TTL.
 * Any logged-in user can call this.
 */
export async function GET() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let cache = readCache();
  const stale = !cache || Date.now() - cache.fetchedAt > CACHE_TTL_MS;

  if (stale) {
    try {
      const models = await fetchModelCatalog();
      cache = writeCache(rankModels(models));
    } catch (err) {
      if (cache) {
        // Serve stale data rather than failing
        return NextResponse.json({ models: cache.models, fetchedAt: cache.fetchedAt, stale: true });
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to fetch OpenRouter models." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ models: cache!.models, fetchedAt: cache!.fetchedAt, stale: false });
}
