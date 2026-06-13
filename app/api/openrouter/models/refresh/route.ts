import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { fetchModelCatalog, rankModels } from "@/lib/openrouter";
import { setSystemSetting } from "@/lib/data";
import type { OpenRouterModel } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

const CACHE_KEY = "openrouter_models_cache";

/**
 * POST — force-refresh the OpenRouter model catalog cache.
 * Any logged-in user can trigger this (e.g. via "Refresh" button in the picker).
 */
export async function POST() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  try {
    const models = await fetchModelCatalog();
    const ranked = rankModels(models);
    const payload: { fetchedAt: number; models: OpenRouterModel[] } = {
      fetchedAt: Date.now(),
      models: ranked,
    };
    setSystemSetting(CACHE_KEY, JSON.stringify(payload));
    return NextResponse.json({ models: ranked, fetchedAt: payload.fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to refresh OpenRouter models." },
      { status: 502 }
    );
  }
}
