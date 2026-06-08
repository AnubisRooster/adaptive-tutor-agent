import { NextResponse } from "next/server";
import { listStudents, createStudent } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

// List profiles (never expose the PIN hash).
export async function GET() {
  const students = listStudents();
  return NextResponse.json({
    profiles: students.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      hasPin: !!s.pinHash,
      lastActiveAt: s.lastActiveAt,
    })),
  });
}

// Create a new profile and sign in as it.
export async function POST(req: Request) {
  let body: { name?: string; color?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (name.length < 1) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const pin = body.pin?.trim();
  if (pin && !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4-8 digits." }, { status: 400 });
  }
  const student = createStudent({ name, color: body.color, pin });
  const res = NextResponse.json({
    profile: { id: student.id, name: student.name, color: student.color, hasPin: !!student.pinHash },
  });
  res.cookies.set(SESSION_COOKIE, student.id, COOKIE_OPTS);
  return res;
}
