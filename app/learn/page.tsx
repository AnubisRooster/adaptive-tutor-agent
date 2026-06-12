"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HealthBadge from "@/components/HealthBadge";
import MarkdownLite from "@/components/MarkdownLite";
import ThemeToggle from "@/components/ThemeToggle";
import { AddSubjectModal, AddMaterialModal } from "@/components/ContentModals";

const BLOOM = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

type Subtopic = { name: string; description: string };
type SubtopicState = { status: "loading" | "ready" | "error"; items: Subtopic[]; error?: string };
type Focus = { topicId: string; name: string; description: string };
type SubtopicProgressEntry = { taught: boolean; quizzed: boolean; lastScore: number | null };

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
  phase?: "learn" | "quiz" | "mastery" | "complete";
  progress?: Record<string, SubtopicProgressEntry>;
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
  student: { id: string; name: string; color: string; isAdmin?: boolean; themePref?: string };
  subjects: Subject[];
  gaps: Gap[];
  activeModel?: string;
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

  // Apply the profile's saved theme pref once state loads.
  useEffect(() => {
    if (!data?.student.themePref) return;
    const pref = data.student.themePref;
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    if (pref === "light") { html.classList.add("light"); localStorage.setItem("theme", "light"); }
    else if (pref === "dark") { html.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else {
      localStorage.removeItem("theme");
      html.classList.add(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    }
  }, [data?.student.themePref]);

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
    const recentHistory = historyForApi().slice(-8);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId,
          kind,
          history: recentHistory,
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
    const activeFocus = focus && focus.topicId === topicId ? focus : null;
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId,
          question: pendingQuestion ?? "",
          answer,
          ...(activeFocus ? { focus: { name: activeFocus.name } } : {}),
        }),
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

  function persistTheme(pref: string) {
    fetch("/api/profiles/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: pref }),
    }).catch(() => {});
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-fg-muted">Loading…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-surface text-fg">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-border p-1.5 text-fg-muted hover:bg-surface-raised md:hidden"
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
          <ThemeToggle onPersist={persistTheme} />
          {data.activeModel && (
            data.student.isAdmin ? (
              <button
                title="Change model — Admin Settings"
                onClick={() => router.push("/admin?tab=settings")}
                className="hidden max-w-[12rem] truncate rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-mono text-indigo-400 hover:bg-indigo-500/20 sm:block"
              >
                {data.activeModel}
              </button>
            ) : (
              <span
                title="Active model"
                className="hidden max-w-[12rem] truncate rounded-full border border-slate-600/40 bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-mono text-slate-400 sm:block"
              >
                {data.activeModel}
              </span>
            )
          )}
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
              className="rounded-lg border border-amber-600/60 bg-amber-500/10 px-3 py-1 text-xs text-amber-600 dark:text-amber-200 hover:bg-amber-500/20"
            >
              Admin
            </button>
          )}
          <button onClick={switchProfile} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-surface-raised">
            Switch
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Mobile drawer backdrop */}
        {navOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setNavOpen(false)} aria-hidden />
        )}
        {/* Sidebar */}
        <aside
          className={`${
            navOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-40 w-80 max-w-[85%] transform overflow-y-auto border-r border-border bg-surface p-4 transition-transform duration-200 md:static md:z-auto md:max-w-none md:translate-x-0 md:shrink-0 md:transition-none`}
        >
          <div className="mb-3 flex items-center justify-between md:hidden">
            <span className="text-sm font-semibold text-fg">Menu</span>
            <button
              onClick={() => setNavOpen(false)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-fg-muted hover:bg-surface-raised"
            >
              Close
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Subjects</h2>
            <button
              onClick={() => { setShowAddSubject(true); setNavOpen(false); }}
              className="text-xs text-accent hover:text-accent-hover"
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
                  s.id === subjectId ? "bg-accent text-white" : "bg-surface-raised text-fg-muted hover:bg-surface-raised"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {subject && subjectProgress && (
            <div className="mb-4 rounded-lg border border-border bg-surface-muted/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">Progress</span>
                <span className="text-fg-muted">
                  {subjectProgress.mastered}/{subjectProgress.total} mastered
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${subjectProgress.total ? (subjectProgress.mastered / subjectProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-fg-subtle">
                {subjectProgress.avg}% avg mastery · {subjectProgress.started}/{subjectProgress.total} started
                {subjectProgress.mastered === subjectProgress.total && subjectProgress.total > 0 ? (
                  <span className="ml-1 text-emerald-500">· subject complete 🎉</span>
                ) : (
                  <> · master a topic by passing its quizzes (≥80%)</>
                )}
              </div>
            </div>
          )}

          {subject && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {subject.name} — Topics
                </h2>
                <button
                  onClick={() => { setShowAddMaterial(true); setNavOpen(false); }}
                  className="text-xs text-accent hover:text-accent-hover"
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
                        t.id === topicId ? "border-accent bg-accent/10" : "border-border"
                      }`}
                    >
                      <div className="flex items-stretch">
                        <button
                          onClick={() => { setTopicId(t.id); setPendingQuestion(null); setFocus(null); setNavOpen(false); }}
                          className="flex-1 rounded-l-lg p-2.5 text-left hover:bg-surface-raised/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-fg">
                              {t.name}
                              {!t.unlocked && <span className="ml-1 text-fg-subtle" title="Prerequisites not yet met">🔒</span>}
                            </span>
                            <span className="text-[10px] text-fg-subtle">{BLOOM[(t.bloomLevel ?? 1) - 1]}</span>
                          </div>
                          <MasteryBar value={t.mastery} />
                        </button>
                        <button
                          onClick={() => toggleExpand(t.id)}
                          className="flex w-9 shrink-0 items-center justify-center rounded-r-lg border-l border-border text-fg-muted hover:bg-surface-raised hover:text-fg"
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
                        <div className="border-t border-border p-2">
                          {(!sub || sub.status === "loading") && (
                            <div className="flex items-center gap-2 px-1 py-1.5 text-xs text-fg-muted">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-surface-raised border-t-accent" />
                              Generating sub-areas…
                            </div>
                          )}
                          {sub?.status === "error" && (
                            <div className="px-1 py-1 text-xs text-red-500">
                              {sub.error}{" "}
                              <button onClick={() => loadSubtopics(t.id)} className="underline hover:opacity-80">retry</button>
                            </div>
                          )}
                          {sub?.status === "ready" && (
                            <>
                              <ul className="space-y-1">
                                {sub.items.map((st, i) => {
                                  const on = focus?.topicId === t.id && focus?.name === st.name;
                                  const prog = t.progress?.[st.name];
                                  const statusIcon = prog?.quizzed ? "✔" : prog?.taught ? "📖" : "○";
                                  return (
                                    <li key={i}>
                                      <button
                                        onClick={() => selectSubtopic(t.id, st)}
                                        disabled={busy}
                                        title={st.description}
                                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition disabled:opacity-50 ${
                                          on ? "bg-accent text-white" : "text-fg-muted hover:bg-surface-raised"
                                        }`}
                                      >
                                        <span className="flex items-center gap-1.5">
                                          <span className="shrink-0 text-[10px]" title={prog?.quizzed ? "Quizzed" : prog?.taught ? "Taught" : "Not started"}>
                                            {statusIcon}
                                          </span>
                                          <span className="font-medium">{st.name}</span>
                                          {prog?.lastScore !== null && prog?.lastScore !== undefined && (
                                            <span className={`ml-auto shrink-0 text-[10px] ${on ? "text-white/70" : "text-fg-subtle"}`}>
                                              {Math.round(prog.lastScore * 100)}%
                                            </span>
                                          )}
                                        </span>
                                        {st.description && (
                                          <span className={`mt-0.5 block pl-4 leading-snug ${on ? "text-white/80" : "text-fg-subtle"}`}>
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
                                className="mt-1.5 px-2 text-[11px] text-fg-subtle hover:text-fg"
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

          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Open gaps</h2>
          {data.gaps.length === 0 ? (
            <p className="text-xs text-fg-subtle">No gaps detected yet — keep going!</p>
          ) : (
            <ul className="space-y-1.5">
              {data.gaps.slice(0, 8).map((g) => (
                <li key={g.id} className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-200">
                  <span className="font-medium">{g.topicName}:</span> {g.misconception}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main chat */}
        <main className="flex min-h-0 flex-1 flex-col">
          {topic && (
            <div className="border-b border-border px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">{topic.name}</h2>
                    <PhaseBadge phase={topic.phase ?? "learn"} />
                  </div>
                  <p className="text-xs text-fg-muted">{topic.description}</p>
                </div>
                <div className="text-right text-xs text-fg-muted">
                  <div>Mastery {(topic.mastery * 100).toFixed(0)}%</div>
                  <div>Level: {BLOOM[(topic.bloomLevel ?? 1) - 1]}</div>
                </div>
              </div>
              {focus && focus.topicId === topicId && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
                    <span className="text-accent/80">Focus:</span>
                    <span className="font-medium">{focus.name}</span>
                    <button
                      onClick={() => setFocus(null)}
                      className="ml-0.5 text-accent/70 hover:text-fg"
                      title="Clear focus — teach the whole topic"
                      aria-label="Clear focus"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Phase-adaptive primary action */}
                {topic.phase === "complete" ? (
                  <ActionBtn disabled={busy} onClick={() => askQuiz("quiz")}>
                    Review mastery
                  </ActionBtn>
                ) : topic.phase === "mastery" ? (
                  <ActionBtn disabled={busy} onClick={() => askQuiz("quiz")}>
                    Check mastery
                  </ActionBtn>
                ) : topic.phase === "quiz" ? (
                  <ActionBtn disabled={busy} onClick={() => askQuiz("quiz")}>
                    Start quiz phase
                  </ActionBtn>
                ) : (
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
                    {focus && focus.topicId === topicId ? `Teach: ${focus.name}` : "Teach me this"}
                  </ActionBtn>
                )}
                <ActionBtn disabled={busy} onClick={() => askQuiz("quiz")}>Quiz me</ActionBtn>
                <ActionBtn disabled={busy} onClick={() => askQuiz("diagnostic")}>Diagnostic</ActionBtn>
                <ActionBtn disabled={busy || topicGaps.length === 0} onClick={() => streamTutor("review")}>
                  Review gaps{topicGaps.length ? ` (${topicGaps.length})` : ""}
                </ActionBtn>
              </div>
            </div>
          )}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4">
            {messages.length === 0 ? (
              <div className="mx-auto mt-10 max-w-md text-center text-fg-muted">
                <p className="mb-2 text-lg">Ready when you are.</p>
                <p className="text-sm">
                  Pick a topic and tap <span className="text-fg">Teach me this</span>, or ask a question below.
                  When you tap <span className="text-fg">Quiz me</span>, type your answer and I&apos;ll grade it.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((m, i) => (
                  <Bubble key={i} msg={m} color={data.student.color} />
                ))}
                {busy && <div className="text-xs text-fg-subtle">tutor is thinking…</div>}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
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
                className="max-h-40 flex-1 resize-none rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={onSend}
                disabled={busy || !input.trim()}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-accent-hover"
              >
                {pendingQuestion ? "Submit answer" : "Send"}
              </button>
            </div>
            {/[\\][([]|[\\]ce\{|[\\]pu\{|\$/.test(input) && (
              <div className="mx-auto mt-2 max-w-3xl rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-subtle">Preview</div>
                <MarkdownLite content={input} />
              </div>
            )}
            {pendingQuestion ? (
              <p className="mx-auto mt-1.5 max-w-3xl text-xs text-amber-600 dark:text-amber-300/80">
                Answering a quiz question — your response will be graded and update your mastery.
              </p>
            ) : (
              <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-fg-subtle">
                Tip: write chemistry as <code className="rounded bg-surface-raised px-1 text-amber-600 dark:text-amber-200">{"\\ce{2H2 + O2 -> 2H2O}"}</code> and math as{" "}
                <code className="rounded bg-surface-raised px-1 text-amber-600 dark:text-amber-200">{"\\( x^2 \\)"}</code> or <code className="rounded bg-surface-raised px-1 text-amber-600 dark:text-amber-200">{"\\[ E=mc^2 \\]"}</code>.
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

const PHASE_LABELS: Record<string, { label: string; classes: string }> = {
  learn: { label: "Learn", classes: "bg-sky-500/15 text-sky-500 dark:text-sky-300" },
  quiz: { label: "Quiz", classes: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  mastery: { label: "Mastery", classes: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  complete: { label: "Complete ✓", classes: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
};

function PhaseBadge({ phase }: { phase: string }) {
  const cfg = PHASE_LABELS[phase] ?? PHASE_LABELS.learn;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function MasteryBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "bg-emerald-500" : value >= 0.45 ? "bg-accent" : "bg-surface-raised";
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ActionBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
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
        className={`min-w-0 max-w-[85%] overflow-hidden break-words rounded-2xl px-4 py-3 text-sm ${
          isUser ? "text-white" : "border border-border bg-surface-muted text-fg"
        }`}
        style={isUser ? { backgroundColor: color } : undefined}
      >
        <MarkdownLite content={msg.content || "…"} />
        {msg.badge && (
          <div className="mt-3 border-t border-border/60 pt-2 text-xs text-fg-muted">
            <span className="font-semibold">Score: {(msg.badge.score * 100).toFixed(0)}%</span>
            <span className="mx-2 text-fg-subtle">·</span>
            <span>Mastery now {(msg.badge.mastery * 100).toFixed(0)}%</span>
            {msg.badge.leveledUp && <span className="ml-2 text-emerald-500">⬆ Leveled up!</span>}
            {msg.badge.next?.note && <div className="mt-1 text-fg-subtle">{msg.badge.next.note}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
