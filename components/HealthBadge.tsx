"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  tutorModel: string;
  embedModel: string;
  tutorModelAvailable: boolean;
  embedModelAvailable: boolean;
  error?: string;
};

export default function HealthBadge() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (active) setHealth(data);
      } catch {
        if (active) setHealth({ ok: false } as Health);
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  if (!health) {
    return <span className="text-xs text-fg-subtle">checking model…</span>;
  }

  const good = health.ok && health.tutorModelAvailable;
  const title = !health.ok
    ? `Ollama unreachable${health.error ? `: ${health.error}` : ""}`
    : !health.tutorModelAvailable
      ? `Model "${health.tutorModel}" not pulled. Run: ollama pull ${health.tutorModel}`
      : `Ollama ready (${health.tutorModel})`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        good ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${good ? "bg-emerald-400" : "bg-amber-400"}`} />
      {good ? "Model ready" : "Model offline"}
    </span>
  );
}
