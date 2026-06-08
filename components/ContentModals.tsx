"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Shared modal shell ----------

function Modal({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- Add Subject ----------

type DraftTopic = { name: string; description: string; prerequisiteIndexes: number[] };
type Draft = {
  subject: { name: string; description: string; framing: string };
  topics: DraftTopic[];
};

export function AddSubjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (subjectId: string) => void;
}) {
  const [step, setStep] = useState<"input" | "edit">("input");
  const [name, setName] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ chars: number; topics: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function makeDraft() {
    if (name.trim().length < 2) {
      setError("Enter a subject name.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress({ chars: 0, topics: 0 });
    setElapsed(0);
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 250);
    try {
      const res = await fetch("/api/curriculum/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectName: name.trim(), sampleText: sampleText.trim() || undefined }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not draft a curriculum.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalDraft: Draft | null = null;
      let errMsg: string | null = null;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let msg: { type: string; chars?: number; topics?: number; draft?: Draft; error?: string };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "progress") setProgress({ chars: msg.chars ?? 0, topics: msg.topics ?? 0 });
          else if (msg.type === "draft" && msg.draft) finalDraft = msg.draft;
          else if (msg.type === "error") errMsg = msg.error ?? "Failed to draft curriculum.";
        }
      }
      if (errMsg) {
        setError(errMsg);
        return;
      }
      if (finalDraft) {
        setDraft(finalDraft);
        setStep("edit");
      } else {
        setError("No draft was produced. Try again.");
      }
    } catch {
      setError("Could not reach the model. Is Ollama running?");
    } finally {
      clearInterval(timer);
      setProgress(null);
      setBusy(false);
    }
  }

  function startManual() {
    setDraft({
      subject: { name: name.trim() || "New subject", description: "", framing: "" },
      topics: [{ name: "", description: "", prerequisiteIndexes: [] }],
    });
    setStep("edit");
  }

  async function save() {
    if (!draft) return;
    const topics = draft.topics.filter((t) => t.name.trim().length > 0);
    if (!draft.subject.name.trim() || topics.length === 0) {
      setError("Give the subject a name and at least one topic.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.subject.name,
          description: draft.subject.description,
          framing: draft.subject.framing,
          topics: topics.map((t) => ({
            name: t.name,
            description: t.description,
            prerequisiteIndexes: t.prerequisiteIndexes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the subject.");
        return;
      }
      onCreated(data.subject.id as string);
    } catch {
      setError("Could not save the subject.");
    } finally {
      setBusy(false);
    }
  }

  function updateTopic(i: number, patch: Partial<DraftTopic>) {
    setDraft((d) => {
      if (!d) return d;
      const topics = d.topics.map((t, j) => (j === i ? { ...t, ...patch } : t));
      return { ...d, topics };
    });
  }
  function addTopic() {
    setDraft((d) => (d ? { ...d, topics: [...d.topics, { name: "", description: "", prerequisiteIndexes: [] }] } : d));
  }
  function removeTopic(i: number) {
    setDraft((d) => {
      if (!d) return d;
      const topics = d.topics
        .filter((_, j) => j !== i)
        // Drop/renumber prerequisite references to the removed topic.
        .map((t) => ({
          ...t,
          prerequisiteIndexes: t.prerequisiteIndexes
            .filter((p) => p !== i)
            .map((p) => (p > i ? p - 1 : p)),
        }));
      return { ...d, topics };
    });
  }

  return (
    <Modal onClose={onClose} wide={step === "edit"}>
      {step === "input" ? (
        <>
          <h3 className="mb-1 text-lg font-semibold">Add a subject</h3>
          <p className="mb-4 text-sm text-slate-400">
            Name a subject and the tutor will draft a topic path you can edit. (e.g. &quot;Chemistry&quot;,
            &quot;Spanish&quot;, &quot;Microeconomics&quot;.)
          </p>
          <label className="mb-1 block text-sm text-slate-400">Subject name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chemistry"
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
          />
          <label className="mb-1 block text-sm text-slate-400">
            Optional: paste a chapter list or description to ground the topics
          </label>
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={4}
            placeholder="Paste a table of contents or syllabus (optional)"
            className="mb-4 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

          {busy && progress && (
            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
                  Drafting curriculum… {elapsed}s
                </span>
                <span className="text-slate-400">
                  {progress.topics > 0 ? `${progress.topics} topics` : "thinking…"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(92, Math.max(6, (progress.topics / 8) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                The first run can take ~30–60s while the model loads into memory.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={startManual}
              disabled={busy}
              className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              Add topics manually
            </button>
            <button
              onClick={makeDraft}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? "Drafting…" : "Draft topics"}
            </button>
          </div>
        </>
      ) : (
        draft && (
          <>
            <h3 className="mb-3 text-lg font-semibold">Review &amp; edit curriculum</h3>
            <div className="mb-4 space-y-2">
              <input
                value={draft.subject.name}
                onChange={(e) => setDraft({ ...draft, subject: { ...draft.subject, name: e.target.value } })}
                placeholder="Subject name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-medium outline-none focus:border-indigo-500"
              />
              <input
                value={draft.subject.description}
                onChange={(e) => setDraft({ ...draft, subject: { ...draft.subject, description: e.target.value } })}
                placeholder="One-line description"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <textarea
                value={draft.subject.framing}
                onChange={(e) => setDraft({ ...draft, subject: { ...draft.subject, framing: e.target.value } })}
                rows={2}
                placeholder="How should the tutor teach this subject?"
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Topics ({draft.topics.length})
              </h4>
              <button onClick={addTopic} className="text-xs text-indigo-400 hover:text-indigo-300">
                + Add topic
              </button>
            </div>
            <ol className="space-y-3">
              {draft.topics.map((t, i) => (
                <li key={i} className="rounded-lg border border-slate-800 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs text-slate-500">{i + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <input
                        value={t.name}
                        onChange={(e) => updateTopic(i, { name: e.target.value })}
                        placeholder="Topic name"
                        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                      />
                      <input
                        value={t.description}
                        onChange={(e) => updateTopic(i, { description: e.target.value })}
                        placeholder="Short description"
                        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                      />
                      {i > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Prereqs:</span>
                          {draft.topics.slice(0, i).map((pt, j) => {
                            const on = t.prerequisiteIndexes.includes(j);
                            return (
                              <button
                                key={j}
                                onClick={() =>
                                  updateTopic(i, {
                                    prerequisiteIndexes: on
                                      ? t.prerequisiteIndexes.filter((p) => p !== j)
                                      : [...t.prerequisiteIndexes, j],
                                  })
                                }
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  on ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                {pt.name || `#${j + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeTopic(i)}
                      className="mt-1 text-slate-500 hover:text-rose-400"
                      title="Remove topic"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={() => setStep("input")} className="text-sm text-slate-400 hover:text-slate-200">
                ← Back
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Create subject"}
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}

// ---------- Add Material (PDF ingest) ----------

type Source = {
  id: string;
  name: string;
  status: "pending" | "extracting" | "crawling" | "embedding" | "done" | "error";
  chunkCount: number;
  embeddedCount: number;
  error?: string | null;
  topicId?: string | null;
};

const ACTIVE_STATUSES = ["pending", "extracting", "crawling", "embedding"];
type TopicLite = { id: string; name: string };

export function AddMaterialModal({
  subjectId,
  subjectName,
  topics,
  onClose,
}: {
  subjectId: string;
  subjectName: string;
  topics: TopicLite[];
  onClose: () => void;
}) {
  const [topicId, setTopicId] = useState<string>("");
  const [mode, setMode] = useState<"pdf" | "text" | "url">("pdf");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [crawl, setCrawl] = useState(false);
  const [maxPages, setMaxPages] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sources?subjectId=${encodeURIComponent(subjectId)}`);
      if (res.ok) {
        const d = await res.json();
        setSources(d.sources ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [subjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while anything is still processing.
  useEffect(() => {
    const active = sources.some((s) => ACTIVE_STATUSES.includes(s.status));
    if (!active) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [sources, refresh]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("subjectId", subjectId);
      if (topicId) fd.append("topicId", topicId);
      fd.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok && res.status !== 202) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTextOrUrl() {
    if (mode === "text" && text.trim().length < 20) {
      setError("Paste at least a paragraph of text.");
      return;
    }
    if (mode === "url" && !url.trim()) {
      setError("Enter a URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topicId: topicId || null,
          ...(mode === "url"
            ? { url: url.trim(), ...(crawl ? { crawl: true, maxPages } : {}) }
            : { text }),
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 202) {
        setError(data.error ?? "Ingestion failed.");
        return;
      }
      setText("");
      setUrl("");
      await refresh();
    } catch {
      setError("Ingestion failed.");
    } finally {
      setBusy(false);
    }
  }

  const topicName = (id?: string | null) => topics.find((t) => t.id === id)?.name;

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 text-lg font-semibold">Add material to {subjectName}</h3>
      <p className="mb-4 text-sm text-slate-400">
        Add a PDF, paste text, or pull from a web page (optionally crawling the rest of the site). It is
        chunked and embedded locally so the tutor can ground its answers in it.
      </p>

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1 text-sm">
        {(["pdf", "text", "url"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 capitalize transition-colors ${
              mode === m ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "pdf" ? "PDF" : m === "url" ? "Web URL" : "Paste text"}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm text-slate-400">Attach to topic (optional)</label>
      <select
        value={topicId}
        onChange={(e) => setTopicId(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      >
        <option value="">Whole subject</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {mode === "pdf" && (
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="mb-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200 hover:file:bg-slate-700"
        />
      )}
      {mode === "text" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste notes, an article, definitions, or any reference text…"
          className="mb-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      )}
      {mode === "url" && (
        <>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/…"
            className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={crawl} onChange={(e) => setCrawl(e.target.checked)} className="accent-indigo-500" />
            Crawl linked pages on the same site
          </label>
          {crawl && (
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
              <span>Max pages</span>
              <input
                type="number"
                min={1}
                max={150}
                value={maxPages}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(150, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500">same domain only · respects robots.txt · max 150</span>
            </div>
          )}
        </>
      )}
      {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
      <button
        onClick={mode === "pdf" ? upload : submitTextOrUrl}
        disabled={busy}
        className="mb-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy
          ? mode === "url"
            ? crawl
              ? "Starting crawl…"
              : "Fetching…"
            : "Adding…"
          : mode === "pdf"
            ? "Upload & ingest"
            : mode === "url"
              ? crawl
                ? "Crawl & ingest"
                : "Fetch & ingest"
              : "Add & ingest"}
      </button>

      {sources.length > 0 && (
        <>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ingested material</h4>
          <ul className="space-y-2">
            {sources.map((s) => {
              const inProgress = ACTIVE_STATUSES.includes(s.status);
              const pct =
                s.status === "done"
                  ? 100
                  : (s.status === "embedding" || s.status === "crawling") && s.chunkCount > 0
                    ? Math.round((s.embeddedCount / s.chunkCount) * 100)
                    : null;
              return (
                <li key={s.id} className="rounded-lg border border-slate-800 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-200" title={s.name}>
                      {s.name}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 text-slate-500">
                    {topicName(s.topicId) ? `${topicName(s.topicId)} · ` : ""}
                    {s.status === "pending"
                      ? "queued…"
                      : s.status === "extracting"
                        ? "extracting text from PDF…"
                        : s.status === "crawling"
                          ? `crawling site… ${s.embeddedCount}/${s.chunkCount} chunks embedded`
                          : s.status === "embedding"
                            ? `embedding ${s.embeddedCount}/${s.chunkCount} chunks…`
                            : s.status === "done"
                              ? `${s.chunkCount} chunks (${s.embeddedCount} embedded)`
                              : s.error || "failed"}
                  </div>
                  {(inProgress || s.status === "done") && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full ${
                          s.status === "done" ? "bg-emerald-500" : "bg-indigo-500"
                        } ${pct === null ? "w-1/3 animate-pulse" : "transition-all duration-300"}`}
                        style={pct === null ? undefined : { width: `${pct}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

function StatusBadge({ status }: { status: Source["status"] }) {
  const map: Record<Source["status"], string> = {
    pending: "bg-slate-700 text-slate-300",
    extracting: "bg-sky-500/15 text-sky-300",
    crawling: "bg-violet-500/15 text-violet-300",
    embedding: "bg-amber-500/15 text-amber-300",
    done: "bg-emerald-500/15 text-emerald-300",
    error: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>{status}</span>;
}
