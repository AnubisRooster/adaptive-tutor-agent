"use client";

import { useCallback, useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/lib/gamify-catalog";

type Badge = {
  code: string;
  title: string;
  description: string;
  emoji: string;
  earnedAt: number;
};

type GamifyData = {
  xp: number;
  level: number;
  title: string;
  levelFloorXp: number;
  nextLevelXp: number;
  streak: number;
  shareStats: boolean;
  badges: Badge[];
};

type LeaderEntry = {
  rank: number;
  name: string;
  color: string;
  xp: number;
  level: number;
  title: string;
  streak: number;
  isYou: boolean;
};

type Props = {
  initialData: GamifyData;
  onClose: () => void;
};

function xpProgressPct(xp: number, floor: number, next: number): number {
  if (next <= floor) return 100;
  return Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100));
}

export default function AchievementsModal({ initialData, onClose }: Props) {
  const [data, setData] = useState<GamifyData>(initialData);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[] | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);

  const earnedCodes = new Set(data.badges.map((b) => b.code));
  const pct = xpProgressPct(data.xp, data.levelFloorXp, data.nextLevelXp);
  const isMaxLevel = data.nextLevelXp === data.levelFloorXp;

  const loadLeaderboard = useCallback(async () => {
    if (!data.shareStats) return;
    setLoadingBoard(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) setLeaderboard((await res.json()).entries ?? []);
    } finally {
      setLoadingBoard(false);
    }
  }, [data.shareStats]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function toggleShare() {
    setTogglingShare(true);
    try {
      const next = !data.shareStats;
      const res = await fetch("/api/profile/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareStats: next }),
      });
      if (res.ok) {
        setData((d) => ({ ...d, shareStats: next }));
        if (next) {
          // Load leaderboard once opted in
          const lb = await fetch("/api/leaderboard");
          if (lb.ok) setLeaderboard((await lb.json()).entries ?? []);
        } else {
          setLeaderboard(null);
        }
      }
    } finally {
      setTogglingShare(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Progress &amp; Achievements</h2>
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
          {/* Level + XP */}
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">Level {data.level}</span>
                <span className="ml-2 text-sm text-fg-muted">{data.title}</span>
              </div>
              <div className="text-right">
                <span className="block text-lg font-semibold text-indigo-400">{data.xp.toLocaleString()} XP</span>
                {!isMaxLevel && (
                  <span className="text-xs text-fg-subtle">{data.nextLevelXp.toLocaleString()} to next level</span>
                )}
              </div>
            </div>
            {!isMaxLevel && (
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {isMaxLevel && (
              <p className="text-xs text-emerald-400">Maximum level reached!</p>
            )}
          </section>

          {/* Streak */}
          <section className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-base font-semibold">{data.streak}-day streak</p>
              <p className="text-xs text-fg-muted">
                {data.streak === 0
                  ? "Come back every day to start a streak!"
                  : data.streak === 1
                  ? "Great start — come back tomorrow to keep it going."
                  : `${data.streak} days in a row. Keep it up!`}
              </p>
            </div>
          </section>

          {/* Badges */}
          <section>
            <h3 className="mb-3 text-sm font-medium">
              Badges
              <span className="ml-2 text-xs text-fg-subtle">
                {earnedCodes.size}/{ACHIEVEMENTS.length} earned
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACHIEVEMENTS.map((def) => {
                const earned = earnedCodes.has(def.code);
                const earnedBadge = data.badges.find((b) => b.code === def.code);
                return (
                  <div
                    key={def.code}
                    className={`rounded-xl border p-3 transition-all ${
                      earned
                        ? "border-indigo-500/40 bg-indigo-500/5"
                        : "border-border bg-surface-raised opacity-50"
                    }`}
                  >
                    <div className="mb-1 text-2xl">{earned ? def.emoji : "🔒"}</div>
                    <p className={`text-xs font-semibold ${earned ? "text-fg" : "text-fg-subtle"}`}>
                      {def.title}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-subtle">{def.description}</p>
                    {earnedBadge && (
                      <p className="mt-1 text-xs text-indigo-400">
                        {new Date(earnedBadge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leaderboard opt-in */}
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Leaderboard</p>
                <p className="text-xs text-fg-muted">
                  {data.shareStats
                    ? "Your stats are visible to others on this server."
                    : "Opt in to compare progress with other learners on this server."}
                </p>
              </div>
              <button
                onClick={toggleShare}
                disabled={togglingShare}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  data.shareStats ? "border-indigo-500 bg-indigo-500" : "border-border bg-surface"
                } disabled:opacity-50`}
                role="switch"
                aria-checked={data.shareStats}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    data.shareStats ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {data.shareStats && (
              <div className="mt-4">
                {loadingBoard ? (
                  <p className="text-xs text-fg-subtle">Loading…</p>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <ul className="space-y-1.5">
                    {leaderboard.map((e) => (
                      <li
                        key={e.rank}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          e.isYou ? "border border-indigo-500/40 bg-indigo-500/5" : "border border-border"
                        }`}
                      >
                        <span className="w-5 shrink-0 text-center text-xs text-fg-subtle font-bold">
                          {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`}
                        </span>
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: e.color }}
                        >
                          {e.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {e.name}{e.isYou && <span className="ml-1 text-xs text-indigo-400">(you)</span>}
                        </span>
                        <span className="text-xs text-fg-muted">Lv.{e.level}</span>
                        <span className="text-xs font-semibold text-indigo-400">{e.xp.toLocaleString()} XP</span>
                        {e.streak > 0 && (
                          <span className="text-xs text-orange-400">🔥{e.streak}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-fg-subtle">No other opted-in profiles yet.</p>
                )}
              </div>
            )}
          </section>
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
