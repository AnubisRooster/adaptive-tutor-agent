"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HealthBadge from "@/components/HealthBadge";
import MarkdownLite from "@/components/MarkdownLite";

const BLOOM = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

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
  student: { id: string; name: string; color: string };
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const subject = useMemo(() => data?.subjects.find((s) => s.id === subjectId), [data, subjectId]);
  const topic = useMemo(() => subject?.topics.find((t) => t.id === topicId), [subject, topicId]);
  const topicGaps = useMemo(() => data?.gaps.filter((g) => g.topicId === topicId) ?? [], [data, topicId]);

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
    if (sid === subjectId) return;
    setSubjectId(sid);
    setPendingQuestion(null);
    const s = data?.subjects.find((x) => x.id === sid);
    setTopicId(s?.recommendedTopicId ?? s?.topics[0]?.id ?? "");
    await loadMessages(sid);
  }

  function historyForApi() {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async function streamTutor(mode: "teach" | "quiz" | "review" | "diagnostic", userContent?: string) {
    if (busy || !subjectId || !topicId) return;
    setBusy(true);
    const history = historyForApi();
    if (userContent) {
      history.push({ role: "user", content: userContent });
      setMessages((m) => [...m, { role: "user", content: userContent }]);
    }
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, topicId, mode, history }),
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
      if (mode === "quiz" || mode === "diagnostic") setPendingQuestion(acc);
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
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Adaptive Tutor</h1>
          <HealthBadge />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: data.student.color }}
            >
              {data.student.name.charAt(0).toUpperCase()}
            </span>
            {data.student.name}
          </span>
          <button onClick={switchProfile} className="rounded-lg border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800">
            Switch
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-slate-800 p-4 md:block">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects</h2>
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

          {subject && (
            <>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {subject.name} — Topics
              </h2>
              <div className="space-y-1.5">
                {subject.topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTopicId(t.id); setPendingQuestion(null); }}
                    className={`w-full rounded-lg border p-2.5 text-left transition ${
                      t.id === topicId ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 hover:border-slate-700"
                    }`}
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
                ))}
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
                <div>
                  <h2 className="text-base font-semibold">{topic.name}</h2>
                  <p className="text-xs text-slate-400">{topic.description}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>Mastery {(topic.mastery * 100).toFixed(0)}%</div>
                  <div>Level: {BLOOM[(topic.bloomLevel ?? 1) - 1]}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn disabled={busy} onClick={() => streamTutor("teach", `Please teach me the next step on "${topic.name}".`)}>
                  Teach me this
                </ActionBtn>
                <ActionBtn disabled={busy} onClick={() => streamTutor("quiz")}>Quiz me</ActionBtn>
                <ActionBtn disabled={busy} onClick={() => streamTutor("diagnostic")}>Diagnostic</ActionBtn>
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
