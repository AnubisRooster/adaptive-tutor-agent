/**
 * End-to-end smoke tests against a running server (start it with `npm run dev`
 * or `npm start` first). Exercises the full request/response plumbing for
 * profiles, state gating, messages, grading, and streaming chat.
 *
 * Chat/grade fall back gracefully when Ollama is offline, so these still verify
 * the end-to-end wiring even without a model installed.
 *
 * Usage: npm run test:e2e   (optionally set E2E_BASE=http://host:3000)
 */

const BASE = process.env.E2E_BASE || "http://localhost:3000";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function cookieFrom(res: Response): string | null {
  const all = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  const raw = all && all.length ? all[0] : res.headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0]; // "tutor_sid=<id>"
}

async function main() {
  console.log(`E2E against ${BASE}\n`);

  // 1. Health (200 when Ollama is up, 503 when not — both are valid responses).
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    check("health endpoint responds with status JSON", [200, 503].includes(res.status) && typeof body.host === "string", `status ${res.status}`);
  } catch (e) {
    check("health endpoint reachable", false, String(e));
    console.error("\nIs the server running? Start it with `npm run dev`.");
    process.exit(1);
  }

  // 2. Profiles list.
  {
    const res = await fetch(`${BASE}/api/profiles`);
    const body = await res.json();
    check("GET /api/profiles returns a list", res.status === 200 && Array.isArray(body.profiles));
  }

  // 3. State is gated without a profile cookie.
  {
    const res = await fetch(`${BASE}/api/state`);
    check("GET /api/state without cookie is 401", res.status === 401, `status ${res.status}`);
  }

  // 4. Create a profile (signs in, sets cookie).
  let cookie = "";
  let studentId = "";
  {
    const res = await fetch(`${BASE}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Tester", color: "#06b6d4", pin: "4321" }),
    });
    const body = await res.json();
    cookie = cookieFrom(res) ?? "";
    studentId = body.profile?.id ?? "";
    check("POST /api/profiles creates a PIN-protected profile + cookie", res.status === 200 && body.profile?.hasPin === true && cookie.startsWith("tutor_sid="));
  }

  const auth = { Cookie: cookie } as Record<string, string>;

  // 5. State with cookie returns full curriculum.
  {
    const res = await fetch(`${BASE}/api/state`, { headers: auth });
    const body = await res.json();
    const ok =
      res.status === 200 &&
      Array.isArray(body.subjects) &&
      body.subjects.length === 8 &&
      body.subjects.every((s: { topics: unknown[]; recommendedTopicId: string | null }) => Array.isArray(s.topics) && s.topics.length > 0 && s.recommendedTopicId);
    check("GET /api/state returns 8 subjects with topics + recommendations", ok, `status ${res.status}`);
  }

  // 6. Messages for a subject (empty session initially).
  {
    const res = await fetch(`${BASE}/api/messages?subjectId=philosophy`, { headers: auth });
    const body = await res.json();
    check("GET /api/messages returns a session and message array", res.status === 200 && typeof body.sessionId === "string" && Array.isArray(body.messages));
  }

  // 7. Grade an answer (model offline -> graceful fallback grade).
  {
    const res = await fetch(`${BASE}/api/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        subjectId: "philosophy",
        topicId: "philosophy.logic",
        question: "What makes an argument valid?",
        answer: "The conclusion must follow necessarily from the premises.",
      }),
    });
    const body = await res.json();
    const ok =
      res.status === 200 &&
      body.grade &&
      typeof body.grade.score === "number" &&
      typeof body.mastery === "number" &&
      body.next?.topicId;
    check("POST /api/grade returns a structured grade + next step", ok, `status ${res.status}`);
  }

  // 8. Streaming chat (model offline -> apology text, still 200 + persisted).
  {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        subjectId: "philosophy",
        topicId: "philosophy.logic",
        mode: "teach",
        history: [{ role: "user", content: "Teach me about validity." }],
      }),
    });
    const text = await res.text();
    check("POST /api/chat streams a 200 text response", res.status === 200 && text.length > 0, `status ${res.status}`);

    const after = await (await fetch(`${BASE}/api/messages?subjectId=philosophy`, { headers: auth })).json();
    check("chat turn is persisted to the session", after.messages.length >= 2, `messages=${after.messages.length}`);
  }

  // 9. Re-select with wrong then correct PIN.
  {
    const wrong = await fetch(`${BASE}/api/profiles/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, pin: "0000" }),
    });
    check("wrong PIN is rejected with 403", wrong.status === 403, `status ${wrong.status}`);

    const right = await fetch(`${BASE}/api/profiles/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, pin: "4321" }),
    });
    check("correct PIN signs in with 200", right.status === 200, `status ${right.status}`);
  }

  // 10. Sign out.
  {
    const res = await fetch(`${BASE}/api/profiles/select`, { method: "DELETE", headers: auth });
    const body = await res.json();
    check("DELETE /api/profiles/select signs out", res.status === 200 && body.ok === true);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
