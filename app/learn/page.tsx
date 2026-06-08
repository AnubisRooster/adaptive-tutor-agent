"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HealthBadge from "@/components/HealthBadge";
import MarkdownLite from "@/components/MarkdownLite";
import { AddSubjectModal, AddMaterialModal } from "@/components/ContentModals";

const BLOOM = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

type Subtopic = { name: string; description: string };
type SubtopicState = { status: "loading" | "ready" | "error"; items: Subtopic[]; error?: string };
type Focus = { topicId: string; name: string; description: string };
type Topic = {
  id: string;
  name: string;
  description: string;
  orderIndex: number;
  prerequisites: string[];
  mastery: number;
  bloomLevel: number;
  attempts: number;
  unlocked: boolean;
};
type Subject = {
  id: string;
  name: string;
  description: string;
  averageMastery: number;
  recommendedTopicId: string | null;
  topics: Topic[];
};
type Gap = { id: string; topicId: string; topicName: string; misconception: string };
type StateData = {
  student: { id: string; name: string; color: string; isAdmin?: boolean };
  subjects: Subject[];
  gaps: Gap[];
};
type NextStep = { topicId: string; topicName: string; reason: string; note: string };
type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  badge?: { score: number; mastery: number; leveledUp: boolean; next: NextStep };
};

export default function LearnPage() {
  const router = useRouter();
  const [data, setData] = useState<StateData | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [subtopics, setSubtopics] = useState<Record<string, SubtopicState>>({});
  const [focus, setFocus] = useState<Focus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subject = useMemo(() => data?.subjects.find((s) => s.id === subjectId), [data, subjectId]);
  const topic = useMemo(() => subject?.topics.find((t) => t.id === topicId), [subject, topicId]);
  const topicGaps = useMemo(() => data?.gaps.filter((g) => g.topicId === topicId) ?? [], [data, topicId]);
  const subjectProgress = useMemo(() => {
    if (!subject) return null;
    const total = subject.topics.length;
    const mastered = subject.topics.filter((t) => t.mastery >= 0.8).length;
    const started = subject.topics.filter((t) => t.attempts > 0).length;
    return { total, mastered, started, avg: Math.round((subject.averageMastery ?? 0) * 100) };
  }, [subject]);

  const loadState = useCallback(async () => {
    const res = await fetch("/api/state");
    if (res.status === 401) {
      router.push("/");
      return null;
    }
    const d: StateData = await res.json();
    setData(d);
    return d;
  }, [router]);

  // Initial load: pick first subject + its recommended topic.
  useEffect(() => {
    (async () => {
      const d = await loadState();
      if (!d || d.subjects.length === 0) return;
      const first = d.subjects[0];
      setSubjectId(first.id);
      setTopicId(first.recommendedTopicId ?? first.topics[0]?.id ?? "");
      await loadMessages(first.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadMessages(sid: string) {
    const res = await fetch(`/api/messages?subjectId=${encodeURIComponent(sid)}`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    const d = await res.json();
    setMessages((d.messages ?? []).map((m: ChatMsg) => ({ role: m.role, content: m.content })));
  }

  async function onSelectSubject(sid: string) {
    if (sid === subjectId) {
      setNavOpen(false);
      return;
    }
    setSubjectId(sid);
    setPendingQuestion(null);
    setFocus(null);
    const s = data?.subjects.find((x) => x.id === sid);
    setTopicId(s?.recommendedTopicId ?? s?.topics[0]?.id ?? "");
    await loadMessages(sid);
  }

  async function handleSubjectCreated(newSubjectId: string) {
    setShowAddSubject(false);
    const d = await loadState();
    const s = d?.subjects.find((x) => x.id === newSubjectId);
    if (s) {
      setSubjectId(s.id);
      setTopicId(s.recommendedTopicId ?? s.topics[0]?.id ?? "");
      setPendingQuestion(null);
      setMessages([]);
    }
  }

  const loadSubtopics = useCallback(async (tid: string, refresh = false) => {
    setSubtopics((prev) => ({ ...prev, [tid]: { status: "loading", items: prev[tid]?.items ?? [] } }));
    try {
      const res = await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: tid, refresh }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(d.subtopics)) {
        setSubtopics((prev) => ({ ...prev, [tid]: { status: "error", items: [], error: d.error ?? "Couldn't load sub-areas." } }));
        return;
      }
      setSubtopics((prev) => ({ ...prev, [tid]: { status: "ready", items: d.subtopics } }));
    } catch {
      setSubtopics((prev) => ({ ...prev, [tid]: { status: "error", items: [], error: "Couldn't reach the model." } }));
    }
  }, []);

  function toggleExpand(tid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) {
        next.delete(tid);
      } else {
        next.add(tid);
        if (!subtopics[tid] || subtopics[tid].status === "error") loadSubtopics(tid);
      }
      return next;
    });
  }

  function selectSubtopic(tid: string, st: Subtopic) {
    setTopicId(tid);
    setPendingQuestion(null);
    setFocus({ topicId: tid, name: st.name, description: st.description });
    setNavOpen(false);
    streamTutor("teach", `Please teach me about "${st.name}" within this topic.`, { topicId: tid, name: st.name, description: st.description });
  }

  function historyForApi() {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async function streamTutor(
    mode: "teach" | "quiz" | "review" | "diagnostic",
    userContent?: string,
    focusArg?: Focus
  ) {
    const tid = focusArg?.topicId ?? topicId;
    if (busy || !subjectId || !tid) return;
    setBusy(true);
    const history = historyForApi();
    if (userContent) {
      history.push({ role: "user", content: userContent });
      setMessages((m) => [...m, { role: "user", content: userContent }]);
    }
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    const activeFocus = focusArg ?? (focus && focus.topicId === tid ? focus : null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId: tid,
          mode,
          history,
          ...(activeFocus ? { focus: { name: activeFocus.name, description: activeFocus.description } } : {}),
        }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        updateLastAssistant(txt || "Something went wrong reaching the tutor.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        updateLastAssistant(acc);
      }
    } catch {
      updateLastAssistant("I couldn't reach the local model. Is Ollama running on the host?");
    } finally {
      setBusy(false);
    }
  }

  async function askQuiz(kind: "quiz" | "diagnostic") {
    if (busy || !subjectId || !topicId) return;
    setBusy(true);
    setPendingQuestion(null);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    const activeFocus = focus && focus.topicId === topicId ? focus : null;
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId,
          kind,
          ...(activeFocus ? { focus: { name: activeFocus.name, description: activeFocus.description } } : {}),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.question) {
        updateLastAssistant(d.error ?? "I couldn't come up with a question — try again.");
        return;
      }
      updateLastAssistant(d.question);
      setPendingQuestion(d.question);
    } catch {
      updateLastAssistant("I couldn't reach the local model. Is Ollama running on the host?");
    } finally {
      setBusy(false);
    }
  }

  function updateLastAssistant(content: string) {
    setMessages((m) => {
      const copy = [...m];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "assistant") {
          copy[i] = { ...copy[i], content };
          break;
        }
      }
      return copy;
    });
  }

  async function gradeAnswer(answer: string) {
    if (busy || !subjectId || !topicId) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: answer }]);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, topicId, question: pendingQuestion ?? "", answer }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: d.error ?? "Could not grade that." }]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: d.grade.feedbackForStudent,
          badge: { score: d.grade.score, mastery: d.mastery, leveledUp: d.leveledUp, next: d.next },
        },
      ]);
      setPendingQuestion(null);
      const refreshed = await loadState();
      // If the engine recommends a different topic, gently switch focus.
      if (refreshed && d.next?.topicId && d.next.topicId !== topicId) {
        const exists = refreshed.subjects.some((s) => s.topics.some((t) => t.id === d.next.topicId));
        if (exists) setTopicId(d.next.topicId);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Grading failed — is the model running?" }]);
    } finally {
      setBusy(false);
    }
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (pendingQuestion) {
      gradeAnswer(text);
    } else {
      streamTutor("teach", text);
    }
  }

  async function switchProfile() {
    await fetch("/api/profiles/select", { method: "DELETE" });
    router.push("/");
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 md:hidden"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="truncate text-base font-bold sm:text-lg">Adaptive Tutor</h1>
          <HealthBadge />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: data.student.color }}
            >
              {data.student.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[8rem] truncate sm:inline">{data.student.name}</span>
          </span>
          {data.student.isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-lg border border-amber-600/60 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            >
              Admin
            </button>
          )}
          <button onClick={switchProfile} className="rounded-lg border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800">
            Switch
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Mobile drawer backdrop */}
        {navOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setNavOpen(false)} aria-hidden />
        )}
        {/* Sidebar: overlay drawer on mobile, static column on desktop */}
        <aside
          className={`${
            navOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-40 w-80 max-w-[85%] transform overflow-y-auto border-r border-slate-800 bg-slate-950 p-4 transition-transform duration-200 md:static md:z-auto md:max-w-none md:translate-x-0 md:shrink-0 md:bg-transparent md:transition-none`}
        >
          <div className="mb-3 flex items-center justify-between md:hidden">
            <span className="text-sm font-semibold text-slate-200">Menu</span>
            <button
              onClick={() => setNavOpen(false)}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects</h2>
            <button
              onClick={() => { setShowAddSubject(true); setNavOpen(false); }}
              className="text-xs text-indigo-400 hover:text-indigo-300"
              title="Create a new subject"
            >
              + Add
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {data.subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSubject(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  s.id === subjectId ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {subject && subjectProgress && (
            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Progress</span>
                <span className="text-slate-400">
                  {subjectProgress.mastered}/{subjectProgress.total} mastered
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${subjectProgress.total ? (subjectProgress.mastered / subjectProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                {subjectProgress.avg}% avg mastery · {subjectProgress.started}/{subjectProgress.total} started
                {subjectProgress.mastered === subjectProgress.total && subjectProgress.total > 0 ? (
                  <span className="ml-1 text-emerald-400">· subject complete 🎉</span>
                ) : (
                  <> · master a topic by passing its quizzes (≥80%)</>
                )}
              </div>
            </div>
          )}

          {subject && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {subject.name} — Topics
                </h2>
                <button
                  onClick={() => { setShowAddMaterial(true); setNavOpen(false); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  title="Upload a PDF to ground this subject"
                >
                  + Material
                </button>
              </div>
              <div className="space-y-1.5">
                {subject.topics.map((t) => {
                  const isOpen = expanded.has(t.id);
                  const sub = subtopics[t.id];
                  return (
                    <div
                      key={t.id}
                      className={`rounded-lg border transition ${
                        t.id === topicId ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800"
                      }`}
                    >
                      <div className="flex items-stretch">
                        <button
                          onClick={() => { setTopicId(t.id); setPendingQuestion(null); setFocus(null); setNavOpen(false); }}
                          className="flex-1 rounded-l-lg p-2.5 text-left hover:bg-slate-800/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-200">
                              {t.name}
                              {!t.unlocked && <span className="ml-1 text-slate-500" title="Prerequisites not yet met">🔒</span>}
                            </span>
                            <span className="text-[10px] text-slate-500">{BLOOM[(t.bloomLevel ?? 1) - 1]}</span>
                          </div>
                          <MasteryBar value={t.mastery} />
                        </button>
                        <button
                          onClick={() => toggleExpand(t.id)}
                          className="flex w-9 shrink-0 items-center justify-center rounded-r-lg border-l border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          title={isOpen ? "Hide sub-areas" : "Show sub-areas to drill into"}
                          aria-label="Toggle sub-areas"
                        >
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                          >
                            <polyline points="9 6 15 12 9 18" />
                          </svg>
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-slate-800 p-2">
                          {(!sub || sub.status === "loading") && (
                            <div className="flex items-center gap-2 px-1 py-1.5 text-xs text-slate-400">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
                              Generating sub-areas…
                            </div>
                          )}
                          {sub?.status === "error" && (
                            <div className="px-1 py-1 text-xs text-rose-400">
                              {sub.error}{" "}
                              <button onClick={() => loadSubtopics(t.id)} className="underline hover:text-rose-300">retry</button>
                            </div>
                          )}
                          {sub?.status === "ready" && (
                            <>
                              <ul className="space-y-1">
                                {sub.items.map((st, i) => {
                                  const on = focus?.topicId === t.id && focus?.name === st.name;
                                  return (
                                    <li key={i}>
                                      <button
                                        onClick={() => selectSubtopic(t.id, st)}
                                        disabled={busy}
                                        title={st.description}
                                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition disabled:opacity-50 ${
                                          on ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                                        }`}
                                      >
                                        <span className="font-medium">{st.name}</span>
                                        {st.description && (
                                          <span className={`mt-0.5 block leading-snug ${on ? "text-indigo-100" : "text-slate-500"}`}>
                                            {st.description}
                                          </span>
                                        )}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                              <button
                                onClick={() => loadSubtopics(t.id, true)}
                                className="mt-1.5 px-2 text-[11px] text-slate-500 hover:text-slate-300"
                              >
                                ↻ Regenerate sub-areas
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Open gaps</h2>
          {data.gaps.length === 0 ? (
            <p className="text-xs text-slate-500">No gaps detected yet — keep going!</p>
          ) : (
            <ul className="space-y-1.5">
              {data.gaps.slice(0, 8).map((g) => (
                <li key={g.id} className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
                  <span className="font-medium">{g.topicName}:</span> {g.misconception}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main chat */}
        <main className="flex min-h-0 flex-1 flex-col">
          {topic && (
            <div className="border-b border-slate-800 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{topic.name}</h2>
                  <p className="text-xs text-slate-400">{topic.description}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>Mastery {(topic.mastery * 100).toFixed(0)}%</div>
                  <div>Level: {BLOOM[(topic.bloomLevel ?? 1) - 1]}</div>
                </div>
              </div>
              {focus && focus.topicId === topicId && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-200">
                    <span className="text-indigo-400">Focus:</span>
                    <span className="font-medium">{focus.name}</span>
                    <button
                      onClick={() => setFocus(null)}
                      className="ml-0.5 text-indigo-300 hover:text-white"
                      title="Clear focus — teach the whole topic"
                      aria-label="Clear focus"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn
                  disabled={busy}
                  onClick={() =>
                    streamTutor(
                      "teach",
                      focus && focus.topicId === topicId
                        ? `Please teach me more about "${focus.name}".`
                        : `Please teach me the next step on "${topic.name}".`
                    )
                  }
                >
                  Teach me this
                </ActionBtn>
                <ActionBtn disabled={busy} onClick={() => askQuiz("quiz")}>Quiz me</ActionBtn>
                <ActionBtn disabled={busy} onClick={() => askQuiz("diagnostic")}>Diagnostic</ActionBtn>
                <ActionBtn disabled={busy || topicGaps.length === 0} onClick={() => streamTutor("review")}>
                  Review gaps{topicGaps.length ? ` (${topicGaps.length})` : ""}
                </ActionBtn>
              </div>
            </div>
          )}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="mx-auto mt-10 max-w-md text-center text-slate-400">
                <p className="mb-2 text-lg">Ready when you are.</p>
                <p className="text-sm">
                  Pick a topic and tap <span className="text-slate-200">Teach me this</span>, or ask a question below.
                  When you tap <span className="text-slate-200">Quiz me</span>, type your answer and I&apos;ll grade it.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((m, i) => (
                  <Bubble key={i} msg={m} color={data.student.color} />
                ))}
                {busy && <div className="text-xs text-slate-500">tutor is thinking…</div>}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 p-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={pendingQuestion ? "Type your answer…" : "Ask anything, or answer the tutor…"}
                className="max-h-40 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={onSend}
                disabled={busy || !input.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium disabled:opacity-40 hover:bg-indigo-500"
              >
                {pendingQuestion ? "Submit answer" : "Send"}
              </button>
            </div>
            {pendingQuestion && (
              <p className="mx-auto mt-1.5 max-w-3xl text-xs text-amber-300/80">
                Answering a quiz question — your response will be graded and update your mastery.
              </p>
            )}
          </div>
        </main>
      </div>

      {showAddSubject && (
        <AddSubjectModal onClose={() => setShowAddSubject(false)} onCreated={handleSubjectCreated} />
      )}
      {showAddMaterial && subject && (
        <AddMaterialModal
          subjectId={subject.id}
          subjectName={subject.name}
          topics={subject.topics.map((t) => ({ id: t.id, name: t.name }))}
          onClose={() => setShowAddMaterial(false)}
        />
      )}
    </div>
  );
}

function MasteryBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "bg-emerald-500" : value >= 0.45 ? "bg-indigo-500" : "bg-slate-500";
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ActionBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Bubble({ msg, color }: { msg: ChatMsg; color: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-indigo-600 text-white" : "border border-slate-800 bg-slate-900/70 text-slate-100"
        }`}
        style={isUser ? { backgroundColor: color } : undefined}
      >
        {isUser ? <span className="whitespace-pre-wrap">{msg.content}</span> : <MarkdownLite content={msg.content || "…"} />}
        {msg.badge && (
          <div className="mt-3 border-t border-slate-700/60 pt-2 text-xs text-slate-300">
            <span className="font-semibold">Score: {(msg.badge.score * 100).toFixed(0)}%</span>
            <span className="mx-2 text-slate-500">·</span>
            <span>Mastery now {(msg.badge.mastery * 100).toFixed(0)}%</span>
            {msg.badge.leveledUp && <span className="ml-2 text-emerald-300">⬆ Leveled up!</span>}
            {msg.badge.next?.note && <div className="mt-1 text-slate-400">{msg.badge.next.note}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
