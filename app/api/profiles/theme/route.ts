import { NextResponse } from "next/server";
import { getActiveStudent } from "@/lib/session";
import { updateStudentTheme } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const student = await getActiveStudent();
  if (!student) return NextResponse.json({ error: "No active profile." }, { status: 401 });

  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const theme = body.theme;
  if (theme !== "system" && theme !== "light" && theme !== "dark") {
    return NextResponse.json({ error: "theme must be 'system', 'light', or 'dark'." }, { status: 400 });
  }

  updateStudentTheme(student.id, theme);
  return NextResponse.json({ ok: true });
}
