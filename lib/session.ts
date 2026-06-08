import { cookies } from "next/headers";
import { getStudent } from "@/lib/data";
import type { Student } from "@/db/schema";

export const SESSION_COOKIE = "tutor_sid";

/** Read the active student id from the request cookie (Next 15: async cookies). */
export async function getStudentId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Resolve the active student, or null if no/invalid cookie. */
export async function getActiveStudent(): Promise<Student | null> {
  const id = await getStudentId();
  if (!id) return null;
  return getStudent(id) ?? null;
}
