"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "profiles" | "curriculum" | "knowledge";

type ProfileSummary = {
  id: string;
  name: string;
  color: string;
  isAdmin: boolean;
  hasPin: boolean;
  lastActiveAt: number;
  subjectsTouched: number;
  topicsAttempted: number;
  topicsMastered: number;
  avgMastery: number;
  totalAttempts: number;
  totalCorrect: number;
  openGaps: number;
};

type ProfileDetail = {
  profile: { id: string; name: string; color: string; isAdmin: boolean; hasPin: boolean; createdAt: number; lastActiveAt: number };
  subjects: { id: string; name: string; topics: { id: string; name: string; mastery: number; bloomLevel: number; attempts: number; correct: number; lastSeen: number }[] }[];
  gaps: { id: string; topicId: string; topicName: string; subjectName: string; misconception: string; detectedAt: number }[];
  sessionCount: number;
  messageCount: number;
};

type CurriculumTopic = { id: string; name: string; description: string; orderIndex: number; prerequisites: string[]; chunkCount: number };
type CurriculumSubject = { id: string; name: string; description: string; framing: string; orderIndex: number; chunkCount: number; sourceCount: number; topics: CurriculumTopic[] };

type Source = { id: string; name: string; status: string; chunkCount: number; embeddedCount: number; topicId: string | null; error?: string | null };
type Chunk = { id: string; topicId: string | null; source: string; sourceId: string | null; embedded: boolean; length: number; preview: string };

const fmtDate = (ms: number) => (ms ? new Date(ms).toLocaleString() : "—");
const pct = (m: number) => `${Math.round(m * 100)}%`;

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("profiles");

  useEffect(() => {
    fetch("/api/admin/profiles").then((r) => setAuthorized(r.ok));
  }, []);

  if (authorized === null) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold">Admin only</h1>
        <p className="text-sm text-slate-400">
          You must be signed in as an admin profile to view this page. Sign in as your admin profile (with its PIN), then return here.
        </p>
        <button onClick={() => router.push("/")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
          Go to profiles
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin portal</h1>
          <p className="text-sm text-slate-400">View profiles, curate curriculum, and manage the knowledge base.</p>
        </div>
        <button onClick={() => router.push("/learn")} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          ← Back to learning
        </button>
      </header>

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {(["profiles", "curriculum", "knowledge"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "border-b-2 border-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "profiles" && <ProfilesTab />}
      {tab === "curriculum" && <CurriculumTab />}
      {tab === "knowledge" && <KnowledgeTab />}
    </div>
  );
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProfileDetail | null>(null);

  useEffect(() => {
    fetch("/api/admin/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles ?? []));
  }, []);

  async function openProfile(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    const d = await fetch(`/api/admin/profiles/${id}`).then((r) => r.json());
    setDetail(d);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2">Profile</th>
            <th className="px-4 py-2">Subjects</th>
            <th className="px-4 py-2">Mastered</th>
            <th className="px-4 py-2">Avg mastery</th>
            <th className="px-4 py-2">Attempts</th>
            <th className="px-4 py-2">Gaps</th>
            <th className="px-4 py-2">Last active</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <Fragment key={p.id}>
              <tr
                onClick={() => openProfile(p.id)}
                className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/40"
              >
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: p.color }}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    {p.name}
                    {p.isAdmin && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">admin</span>}
                    {p.hasPin && <span title="PIN protected">🔒</span>}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-300">{p.subjectsTouched}</td>
                <td className="px-4 py-2.5 text-slate-300">{p.topicsMastered}/{p.topicsAttempted}</td>
                <td className="px-4 py-2.5 text-slate-300">{pct(p.avgMastery)}</td>
                <td className="px-4 py-2.5 text-slate-300">{p.totalCorrect}/{p.totalAttempts}</td>
                <td className="px-4 py-2.5 text-slate-300">{p.openGaps}</td>
                <td className="px-4 py-2.5 text-slate-400">{fmtDate(p.lastActiveAt)}</td>
              </tr>
              {openId === p.id && (
                <tr className="border-t border-slate-800 bg-slate-950/60">
                  <td colSpan={7} className="px-4 py-4">
                    {!detail ? (
                      <p className="text-slate-400">Loading detail…</p>
                    ) : (
                      <ProfileDetailView detail={detail} />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No profiles yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProfileDetailView({ detail }: { detail: ProfileDetail }) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-400">
        Created {fmtDate(detail.profile.createdAt)} · {detail.sessionCount} sessions · {detail.messageCount} messages
      </div>
      {detail.subjects.length === 0 ? (
        <p className="text-sm text-slate-500">No learning activity yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {detail.subjects.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-800 p-3">
              <h4 className="mb-2 text-sm font-semibold">{s.name}</h4>
              <ul className="space-y-1.5">
                {s.topics.map((t) => (
                  <li key={t.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">{t.name}</span>
                      <span className="text-slate-400">L{t.bloomLevel} · {pct(t.mastery)} · {t.correct}/{t.attempts}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full ${t.mastery >= 0.8 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: pct(t.mastery) }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {detail.gaps.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Open gaps ({detail.gaps.length})</h4>
          <ul className="space-y-1.5">
            {detail.gaps.map((g) => (
              <li key={g.id} className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
                <span className="font-medium">{g.subjectName} · {g.topicName}:</span> {g.misconception}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CurriculumTab() {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const d = await fetch("/api/admin/curriculum").then((r) => r.json());
    setSubjects(d.subjects ?? []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function saveSubject(s: CurriculumSubject) {
    setBusy(true);
    setMsg(null);
    await fetch(`/api/admin/subjects/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: s.name, description: s.description, framing: s.framing, orderIndex: s.orderIndex }),
    });
    setBusy(false);
    setMsg(`Saved "${s.name}".`);
    refresh();
  }

  async function deleteSubject(s: CurriculumSubject) {
    if (!confirm(`Delete subject "${s.name}" and ALL its topics, chunks, and learner progress? This cannot be undone.`)) return;
    await fetch(`/api/admin/subjects/${s.id}`, { method: "DELETE" });
    refresh();
  }

  async function saveTopic(t: CurriculumTopic) {
    await fetch(`/api/admin/topics/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, description: t.description, orderIndex: t.orderIndex, prerequisites: t.prerequisites }),
    });
    setMsg(`Saved topic "${t.name}".`);
    refresh();
  }

  async function deleteTopic(t: CurriculumTopic) {
    if (!confirm(`Delete topic "${t.name}"? Its chunks and learner progress for it will be removed.`)) return;
    await fetch(`/api/admin/topics/${t.id}`, { method: "DELETE" });
    refresh();
  }

  function patchSubject(id: string, patch: Partial<CurriculumSubject>) {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function patchTopic(subjectId: string, topicId: string, patch: Partial<CurriculumTopic>) {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, topics: s.topics.map((t) => (t.id === topicId ? { ...t, ...patch } : t)) } : s
      )
    );
  }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {subjects.map((s) => (
        <div key={s.id} className="rounded-xl border border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={s.name}
              onChange={(e) => patchSubject(s.id, { name: e.target.value })}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-500"
            />
            <label className="text-xs text-slate-500">order</label>
            <input
              type="number"
              value={s.orderIndex}
              onChange={(e) => patchSubject(s.id, { orderIndex: Number(e.target.value) })}
              className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">{s.chunkCount} chunks · {s.sourceCount} sources · {s.topics.length} topics</span>
            <button onClick={() => saveSubject(s)} disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium hover:bg-indigo-500 disabled:opacity-50">Save</button>
            <button onClick={() => deleteSubject(s)} className="rounded-lg border border-rose-700/60 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">Delete</button>
          </div>
          <textarea
            value={s.description}
            onChange={(e) => patchSubject(s.id, { description: e.target.value })}
            rows={1}
            placeholder="Description"
            className="mt-2 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          />
          <textarea
            value={s.framing}
            onChange={(e) => patchSubject(s.id, { framing: e.target.value })}
            rows={2}
            placeholder="Teaching framing (guides the tutor)"
            className="mt-2 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
          />

          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            {s.topics.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-800 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={t.name}
                    onChange={(e) => patchTopic(s.id, t.id, { name: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    value={t.orderIndex}
                    onChange={(e) => patchTopic(s.id, t.id, { orderIndex: Number(e.target.value) })}
                    className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">{t.chunkCount} chunks</span>
                  <button onClick={() => saveTopic(t)} className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs hover:bg-slate-600">Save</button>
                  <button onClick={() => deleteTopic(t)} className="rounded-lg border border-rose-700/60 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10">Delete</button>
                </div>
                <textarea
                  value={t.description}
                  onChange={(e) => patchTopic(s.id, t.id, { description: e.target.value })}
                  rows={1}
                  placeholder="Topic description"
                  className="mt-2 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
                <div className="mt-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500">Prerequisites</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.topics.filter((o) => o.id !== t.id).map((o) => {
                      const on = t.prerequisites.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() =>
                            patchTopic(s.id, t.id, {
                              prerequisites: on ? t.prerequisites.filter((p) => p !== o.id) : [...t.prerequisites, o.id],
                            })
                          }
                          className={`rounded-full px-2 py-0.5 text-[11px] transition ${
                            on ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KnowledgeTab() {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>(""); // "" = all
  const [sources, setSources] = useState<Source[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [busy, setBusy] = useState(false);

  // "Add knowledge" form state.
  const [addMode, setAddMode] = useState<"text" | "url">("text");
  const [addTopicId, setAddTopicId] = useState("");
  const [addText, setAddText] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/curriculum").then((r) => r.json()).then((d) => {
      setSubjects(d.subjects ?? []);
      if (d.subjects?.[0]) setSubjectId(d.subjects[0].id);
    });
  }, []);

  const subject = subjects.find((s) => s.id === subjectId);

  const refresh = useCallback(async () => {
    if (!subjectId) return;
    const tParam = topicFilter ? `&topicId=${encodeURIComponent(topicFilter)}` : "";
    const [src, chk] = await Promise.all([
      fetch(`/api/admin/sources?subjectId=${encodeURIComponent(subjectId)}`).then((r) => r.json()),
      fetch(`/api/admin/chunks?subjectId=${encodeURIComponent(subjectId)}${tParam}`).then((r) => r.json()),
    ]);
    setSources(src.sources ?? []);
    setChunks(chk.chunks ?? []);
  }, [subjectId, topicFilter]);
  useEffect(() => { refresh(); }, [refresh]);

  // Poll while any source is still processing.
  useEffect(() => {
    if (!sources.some((s) => ["pending", "extracting", "embedding"].includes(s.status))) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [sources, refresh]);

  async function reembed(id: string) {
    setBusy(true);
    await fetch(`/api/admin/sources?id=${encodeURIComponent(id)}`, { method: "POST" });
    setBusy(false);
    refresh();
  }
  async function delSource(s: Source) {
    if (!confirm(`Delete source "${s.name}" and its ${s.chunkCount} chunks?`)) return;
    await fetch(`/api/admin/sources?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    refresh();
  }
  async function delChunk(id: string) {
    if (!confirm("Delete this chunk?")) return;
    await fetch(`/api/admin/chunks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    refresh();
  }

  async function addKnowledge() {
    if (addMode === "text" && addText.trim().length < 20) {
      setAddError("Paste at least a paragraph of text.");
      return;
    }
    if (addMode === "url" && !addUrl.trim()) {
      setAddError("Enter a URL.");
      return;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId: addTopicId || null,
          ...(addMode === "url" ? { url: addUrl.trim() } : { text: addText }),
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 202) {
        setAddError(data.error ?? "Ingestion failed.");
        return;
      }
      setAddText("");
      setAddUrl("");
      refresh();
    } catch {
      setAddError("Ingestion failed.");
    } finally {
      setAddBusy(false);
    }
  }

  const topicName = (id: string | null) => (id ? subject?.topics.find((t) => t.id === id)?.name ?? id : "subject-level");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicFilter(""); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500">
          <option value="">All topics</option>
          <option value="__none">Subject-level (no topic)</option>
          {subject?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Add knowledge to {subject?.name ?? "subject"}
          </h3>
          <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1 text-xs">
            {(["text", "url"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setAddMode(m); setAddError(null); }}
                className={`rounded-md px-3 py-1 transition ${
                  addMode === m ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "url" ? "Web URL" : "Paste text"}
              </button>
            ))}
          </div>
        </div>
        <select
          value={addTopicId}
          onChange={(e) => setAddTopicId(e.target.value)}
          className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Whole subject (no topic)</option>
          {subject?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {addMode === "text" ? (
          <textarea
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            rows={5}
            placeholder="Paste notes, definitions, an article, or any reference text…"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        ) : (
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/…"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        )}
        {addError && <p className="mt-2 text-sm text-rose-400">{addError}</p>}
        <div className="mt-3 flex justify-end">
          <button
            onClick={addKnowledge}
            disabled={addBusy || !subjectId}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {addBusy ? (addMode === "url" ? "Fetching…" : "Adding…") : "Add & ingest"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sources ({sources.length})</h3>
        {sources.length === 0 ? (
          <p className="text-sm text-slate-500">No ingested sources for this subject.</p>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-2.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-medium text-slate-200" title={s.name}>{s.name}</span>
                <span className="text-slate-400">{topicName(s.topicId)}</span>
                <span className="text-slate-400">{s.status} · {s.embeddedCount}/{s.chunkCount} embedded</span>
                <span className="flex gap-1.5">
                  <button onClick={() => reembed(s.id)} disabled={busy} className="rounded-lg bg-slate-700 px-2.5 py-1 hover:bg-slate-600 disabled:opacity-50">Re-embed</button>
                  <button onClick={() => delSource(s)} className="rounded-lg border border-rose-700/60 px-2.5 py-1 text-rose-300 hover:bg-rose-500/10">Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Knowledge chunks ({chunks.length})</h3>
        {chunks.length === 0 ? (
          <p className="text-sm text-slate-500">No chunks for this selection.</p>
        ) : (
          <ul className="space-y-2">
            {chunks.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-800 p-2.5 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-slate-400">
                    {topicName(c.topicId)} · {c.source || "seed"} · {c.length} chars
                    <span className={`ml-2 ${c.embedded ? "text-emerald-400" : "text-amber-400"}`}>{c.embedded ? "embedded" : "no embedding"}</span>
                  </span>
                  <button onClick={() => delChunk(c.id)} className="rounded-lg border border-rose-700/60 px-2.5 py-1 text-rose-300 hover:bg-rose-500/10">Delete</button>
                </div>
                <p className="whitespace-pre-wrap text-slate-300">{c.preview}{c.length > c.preview.length ? "…" : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
