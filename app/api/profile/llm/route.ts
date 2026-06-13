import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { getStudentLlm, updateStudentLlm } from "@/lib/data";
import { validateApiKey } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

/** Mask an API key: show only the last 4 characters. */
function maskKey(key: string): string {
  if (key.length <= 4) return "****";
  return "****" + key.slice(-4);
}

/**
 * GET — return the current user's LLM provider settings (key is masked).
 * Response: { provider, model, hasKey, keyHint }
 */
export async function GET() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  const llm = getStudentLlm(student);
  return NextResponse.json({
    provider: llm.llmProvider,
    model: llm.openrouterModel ?? null,
    hasKey: !!llm.openrouterApiKey,
    keyHint: llm.openrouterApiKey ? maskKey(llm.openrouterApiKey) : null,
  });
}

/**
 * POST — update the current user's LLM provider settings.
 * Body (all optional): { provider, model, apiKey, clearKey }
 *   provider: "local" | "openrouter"
 *   model: OpenRouter model ID (e.g. "google/gemma-3-27b-it:free")
 *   apiKey: raw key string (stored server-side only, never echoed back)
 *   clearKey: true → delete the stored key and revert to local
 */
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: {
    provider?: string;
    model?: string;
    apiKey?: string;
    clearKey?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Clear key — revert to local
  if (body.clearKey) {
    updateStudentLlm(student.id, {
      llmProvider: "local",
      openrouterApiKey: null,
      openrouterModel: null,
    });
    return NextResponse.json({ ok: true, provider: "local" });
  }

  const patch: Parameters<typeof updateStudentLlm>[1] = {};

  if (body.provider === "local" || body.provider === "openrouter") {
    patch.llmProvider = body.provider;
  }
  if (body.model !== undefined) {
    patch.openrouterModel = body.model || null;
  }
  if (body.apiKey !== undefined) {
    const trimmed = body.apiKey.trim();
    if (trimmed) {
      // Optional: validate the key before storing it.
      const valid = await validateApiKey(trimmed);
      if (!valid) {
        return NextResponse.json(
          { error: "The API key was rejected by OpenRouter. Please check it and try again." },
          { status: 422 }
        );
      }
      patch.openrouterApiKey = trimmed;
    }
  }

  if (Object.keys(patch).length > 0) {
    updateStudentLlm(student.id, patch);
  }

  // Re-read to confirm
  const updated = getStudentLlm({ ...student, ...patch } as typeof student);
  return NextResponse.json({
    ok: true,
    provider: updated.llmProvider,
    model: updated.openrouterModel ?? null,
    hasKey: !!updated.openrouterApiKey,
    keyHint: updated.openrouterApiKey ? maskKey(updated.openrouterApiKey) : null,
  });
}
