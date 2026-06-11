"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HealthBadge from "@/components/HealthBadge";
import ThemeToggle from "@/components/ThemeToggle";

type Profile = { id: string; name: string; color: string; hasPin: boolean };

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444", "#14b8a6"];

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pinFor, setPinFor] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles ?? []))
      .catch(() => setError("Could not load profiles."))
      .finally(() => setLoading(false));
  }, []);

  async function select(p: Profile, withPin?: string) {
    setError(null);
    const res = await fetch("/api/profiles/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: p.id, pin: withPin }),
    });
    if (res.ok) {
      router.push("/learn");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.needsPin) {
      setPinFor(p);
      setError(withPin ? "Incorrect PIN." : null);
    } else {
      setError(data.error ?? "Could not sign in.");
    }
  }

  async function create() {
    setError(null);
    if (name.trim().length < 1) {
      setError("Please enter a name.");
      return;
    }
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, pin: newPin || undefined }),
    });
    if (res.ok) {
      router.push("/learn");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not create profile.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adaptive Tutor</h1>
          <p className="text-sm text-fg-muted">
            Your personal mentor for Philosophy, Psychology, AI, Physics &amp; Coding.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <HealthBadge />
        </div>
      </header>

      <h2 className="mb-4 text-lg font-semibold text-fg">Who&apos;s learning?</h2>

      {loading ? (
        <p className="text-fg-muted">Loading profiles…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => (p.hasPin ? setPinFor(p) : select(p))}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-muted/60 p-5 transition hover:border-fg-subtle hover:bg-surface-muted"
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-fg">
                {p.name}
                {p.hasPin && <span title="PIN protected">🔒</span>}
              </span>
            </button>
          ))}

          <button
            onClick={() => setCreating(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-5 text-fg-muted transition hover:border-fg-subtle hover:text-fg"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-3xl">
              +
            </span>
            <span className="text-sm font-medium">New profile</span>
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

      {/* PIN modal */}
      {pinFor && (
        <Modal onClose={() => { setPinFor(null); setPin(""); }}>
          <h3 className="mb-1 text-lg font-semibold">Enter PIN for {pinFor.name}</h3>
          <p className="mb-4 text-sm text-fg-muted">This profile is PIN protected.</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && select(pinFor, pin)}
            placeholder="••••"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-accent"
          />
          <button
            onClick={() => select(pinFor, pin)}
            className="mt-4 w-full rounded-lg bg-accent py-2 font-medium text-white hover:bg-accent-hover"
          >
            Continue
          </button>
        </Modal>
      )}

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h3 className="mb-4 text-lg font-semibold">Create a profile</h3>
          <label className="mb-1 block text-sm text-fg-muted">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maya"
            className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          <label className="mb-2 block text-sm text-fg-muted">Color</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ring-2 ${color === c ? "ring-fg" : "ring-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <label className="mb-1 block text-sm text-fg-muted">PIN (optional, 4–8 digits)</label>
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="optional"
            className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          <button
            onClick={create}
            className="w-full rounded-lg bg-accent py-2 font-medium text-white hover:bg-accent-hover"
          >
            Start learning
          </button>
        </Modal>
      )}
    </main>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface-muted p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
