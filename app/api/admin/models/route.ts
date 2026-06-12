import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { ollama, activeTutorModel } from "@/lib/ollama";
import { getSystemSetting, setSystemSetting } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET — list all locally-pulled models + the active model.
// Public: any logged-in user can see this (needed for the learn-page badge).
export async function GET() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  try {
    const res = await ollama.list();
    const models = res.models.map((m) => m.name).sort();
    return NextResponse.json({ models, active: activeTutorModel() });
  } catch {
    return NextResponse.json({ models: [], active: activeTutorModel() });
  }
}

// POST { model: string } — set the active tutor model. Admin-only.
export async function POST(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });
  if (!student.isAdmin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { model } = await req.json().catch(() => ({}));
  if (!model || typeof model !== "string") {
    return NextResponse.json({ error: "model is required." }, { status: 400 });
  }

  setSystemSetting("tutor_model", model.trim());
  return NextResponse.json({ active: model.trim() });
}

// DELETE — clear the DB override, reverting to the .env default.
export async function DELETE() {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });
  if (!student.isAdmin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  // Remove the override by setting to empty string sentinel, or use the env default.
  const { tutorModel } = await import("@/lib/config");
  setSystemSetting("tutor_model", tutorModel());
  return NextResponse.json({ active: tutorModel() });
}
