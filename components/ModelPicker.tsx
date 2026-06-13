"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OpenRouterModel = {
  id: string;
  name: string;
  contextLength: number;
  promptPricePer1M: number;
  completionPricePer1M: number;
  isFree: boolean;
};

type ProfileLlm = {
  provider: "local" | "openrouter";
  model: string | null;
  hasKey: boolean;
  keyHint: string | null;
};

type Props = {
  onClose: () => void;
};

function fmt(n: number): string {
  if (n === 0) return "Free";
  if (n < 0.01) return `$${n.toFixed(4)}/M`;
  if (n < 1) return `$${n.toFixed(3)}/M`;
  return `$${n.toFixed(2)}/M`;
}

function fmtCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type Filter = "all" | "free" | "paid";

export default function ModelPicker({ onClose }: Props) {
  const [profile, setProfile] = useState<ProfileLlm | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);

  const [selectingModel, setSelectingModel] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
      const [profileRes, catalogRes] = await Promise.all([
        fetch("/api/profile/llm"),
        fetch("/api/openrouter/models"),
      ]);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (catalogRes.ok) {
        const d = await catalogRes.json();
        setModels(d.models ?? []);
        setFetchedAt(d.fetchedAt ?? null);
      } else {
        setCatalogError("Could not load OpenRouter model catalog.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Focus search after load
  useEffect(() => {
    if (!loading) searchRef.current?.focus();
  }, [loading]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function refreshCatalog() {
    setRefreshing(true);
    setCatalogError(null);
    try {
      const res = await fetch("/api/openrouter/models/refresh", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setModels(d.models ?? []);
        setFetchedAt(d.fetchedAt ?? null);
      } else {
        setCatalogError("Refresh failed.");
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function switchToLocal() {
    await fetch("/api/profile/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "local" }),
    });
    setProfile((p) => p ? { ...p, provider: "local" } : p);
  }

  async function saveApiKey() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setKeyError(null);
    setKeySuccess(false);
    try {
      const res = await fetch("/api/profile/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setKeyError(d.error ?? "Failed to save key.");
      } else {
        setKeySuccess(true);
        setApiKey("");
        setProfile(d);
      }
    } finally {
      setSavingKey(false);
    }
  }

  async function clearKey() {
    await fetch("/api/profile/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearKey: true }),
    });
    setProfile((p) => p ? { ...p, provider: "local", hasKey: false, keyHint: null, model: null } : p);
  }

  async function selectModel(id: string) {
    setSelectingModel(id);
    try {
      const res = await fetch("/api/profile/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", model: id }),
      });
      const d = await res.json();
      if (res.ok) setProfile(d);
    } finally {
      setSelectingModel(null);
    }
  }

  const filtered = models.filter((m) => {
    if (filter === "free" && !m.isFree) return false;
    if (filter === "paid" && m.isFree) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }
    return true;
  });

  const catalogAge = fetchedAt
    ? Math.round((Date.now() - fetchedAt) / 60_000)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Model Settings</h2>
            <p className="text-xs text-fg-muted">Choose between your local Ollama model or a cloud model via OpenRouter.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-raised hover:text-fg"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <p className="text-sm text-fg-subtle">Loading…</p>
          ) : (
            <>
              {/* Current provider toggle */}
              <section>
                <h3 className="mb-3 text-sm font-medium">Active provider</h3>
                <div className="flex gap-2">
                  <button
                    onClick={switchToLocal}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      profile?.provider === "local"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-border bg-surface-raised text-fg-muted hover:border-fg-subtle"
                    }`}
                  >
                    <span className="block text-left">Local Ollama</span>
                    <span className="block text-left text-xs font-normal text-fg-subtle mt-0.5">Runs on this machine — no key needed</span>
                  </button>
                  <button
                    onClick={() => profile?.hasKey && setProfile((p) => p ? { ...p, provider: "openrouter" } : p)}
                    disabled={!profile?.hasKey}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      profile?.provider === "openrouter"
                        ? "border-violet-500 bg-violet-500/10 text-violet-300"
                        : profile?.hasKey
                        ? "border-border bg-surface-raised text-fg-muted hover:border-fg-subtle"
                        : "border-border bg-surface-raised text-fg-subtle opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className="block text-left">OpenRouter</span>
                    <span className="block text-left text-xs font-normal text-fg-subtle mt-0.5">
                      {profile?.hasKey ? `Key saved (${profile.keyHint})` : "Add API key below"}
                    </span>
                  </button>
                </div>
              </section>

              {/* API Key management */}
              <section className="rounded-xl border border-border bg-surface-raised p-4">
                <h3 className="mb-1 text-sm font-medium">OpenRouter API Key</h3>
                <p className="mb-3 text-xs text-fg-muted">
                  Keys are stored locally and only used server-side.{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    Get a free key at openrouter.ai
                  </a>
                </p>
                {profile?.hasKey && (
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                    <span className="text-xs text-emerald-400">Key saved: {profile.keyHint}</span>
                    <button
                      onClick={clearKey}
                      className="text-xs text-fg-subtle hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-or-..."
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setKeyError(null); setKeySuccess(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") saveApiKey(); }}
                    disabled={savingKey}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={saveApiKey}
                    disabled={savingKey || !apiKey.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {savingKey ? "Saving…" : "Save"}
                  </button>
                </div>
                {keyError && <p className="mt-2 text-xs text-red-400">{keyError}</p>}
                {keySuccess && <p className="mt-2 text-xs text-emerald-400">Key saved successfully.</p>}
              </section>

              {/* Model catalog */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">OpenRouter models</h3>
                  <div className="flex items-center gap-2">
                    {catalogAge !== null && (
                      <span className="text-xs text-fg-subtle">Updated {catalogAge < 1 ? "just now" : `${catalogAge}m ago`}</span>
                    )}
                    <button
                      onClick={refreshCatalog}
                      disabled={refreshing}
                      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-raised disabled:opacity-50"
                    >
                      {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                </div>

                {catalogError && (
                  <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                    {catalogError}
                  </p>
                )}

                {/* Filter + search */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    {(["all", "free", "paid"] as Filter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 capitalize ${
                          filter === f
                            ? "bg-indigo-600 text-white"
                            : "bg-surface-raised text-fg-muted hover:bg-surface"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search models…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-[140px] rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Table header */}
                <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 text-xs text-fg-subtle">
                  <span>Model</span>
                  <span className="text-right">Context</span>
                  <span className="text-right">Completion</span>
                  <span />
                </div>

                {/* Model list */}
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {filtered.length === 0 && (
                    <li className="py-6 text-center text-sm text-fg-subtle">No models match.</li>
                  )}
                  {filtered.map((m) => {
                    const isActive = profile?.provider === "openrouter" && profile.model === m.id;
                    return (
                      <li
                        key={m.id}
                        className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          isActive
                            ? "border-violet-500/50 bg-violet-500/5"
                            : "border-border hover:bg-surface-raised"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-sm">{m.name}</span>
                          <span className="block truncate text-xs text-fg-subtle font-mono">{m.id}</span>
                        </span>
                        <span className="text-right text-xs text-fg-muted whitespace-nowrap">{fmtCtx(m.contextLength)}</span>
                        <span className={`text-right text-xs whitespace-nowrap font-medium ${m.isFree ? "text-emerald-400" : "text-fg-muted"}`}>
                          {fmt(m.completionPricePer1M)}
                        </span>
                        {isActive ? (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300 whitespace-nowrap">Active</span>
                        ) : (
                          <button
                            onClick={() => profile?.hasKey ? selectModel(m.id) : undefined}
                            disabled={!profile?.hasKey || selectingModel === m.id}
                            title={profile?.hasKey ? `Use ${m.name}` : "Add an API key first"}
                            className="rounded-lg border border-indigo-600/50 bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {selectingModel === m.id ? "…" : "Use"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {!profile?.hasKey && models.length > 0 && (
                  <p className="mt-2 text-xs text-fg-subtle">Add an OpenRouter API key above to activate a cloud model.</p>
                )}
              </section>
            </>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-raised"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
