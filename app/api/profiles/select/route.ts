import { NextResponse } from "next/server";
import { getStudent, verifyPin, touchStudent } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

// Sign in to an existing profile (with PIN if one is set).
export async function POST(req: Request) {
  let body: { studentId?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const student = body.studentId ? getStudent(body.studentId) : undefined;
  if (!student) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (!verifyPin(student, body.pin)) {
    return NextResponse.json({ error: "Incorrect PIN.", needsPin: true }, { status: 403 });
  }
  touchStudent(student.id);
  const res = NextResponse.json({
    profile: { id: student.id, name: student.name, color: student.color },
  });
  res.cookies.set(SESSION_COOKIE, student.id, COOKIE_OPTS);
  return res;
}

// Sign out (clear the cookie).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
