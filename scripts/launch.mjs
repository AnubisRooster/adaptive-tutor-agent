#!/usr/bin/env node
// Cross-platform one-click launcher for the Adaptive Tutor.
// - Makes sure Ollama is reachable (tries to start it if not)
// - Makes sure a production build and the database exist (builds/seeds if not)
// - Starts the Next.js server and opens your browser to it
//
// Run directly:  node scripts/launch.mjs
// Or via npm:     npm run launch
// Or from the desktop icon created by the install scripts.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// --- tiny .env reader (Next loads .env itself; we just need a few values) ---
function readEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(k in env)) env[k] = v;
    }
  }
  return env;
}

const fileEnv = readEnv();
const PORT = process.env.PORT || fileEnv.PORT || "3000";
const HOST = process.env.HOST || fileEnv.HOST || "0.0.0.0";
const OLLAMA = process.env.OLLAMA_HOST || fileEnv.OLLAMA_HOST || "http://127.0.0.1:11434";

const log = (m) => console.log(`\x1b[36m▶\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

function lanUrl() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) return `http://${ni.address}:${PORT}`;
    }
  }
  return null;
}

async function fetchOk(url, timeoutMs = 2500) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function ensureOllama() {
  if (await fetchOk(`${OLLAMA}/api/tags`)) {
    ok("Ollama is running.");
    return;
  }
  log("Ollama not reachable — trying to start it…");
  try {
    const child = spawn("ollama", ["serve"], { detached: true, stdio: "ignore", shell: isWin });
    child.unref();
  } catch {
    /* ollama not on PATH */
  }
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await fetchOk(`${OLLAMA}/api/tags`)) {
      ok("Ollama started.");
      return;
    }
  }
  warn("Could not reach Ollama. The app will still open, but the tutor won't respond until Ollama is running.");
}

async function ensureBuild() {
  if (existsSync(path.join(ROOT, ".next", "BUILD_ID"))) return;
  log("No production build found — building now (one-time, ~30s)…");
  await run(npmCmd, ["run", "build"]);
  ok("Build complete.");
}

async function ensureDb() {
  const dbPath = (process.env.DATABASE_PATH || fileEnv.DATABASE_PATH || "./data/tutor.db").replace(/^\.\//, "");
  if (existsSync(path.join(ROOT, dbPath))) return;
  log("No database found — creating and seeding it…");
  await run(npmCmd, ["run", "setup"]);
  ok("Database ready.");
}

function openBrowser(url) {
  try {
    if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    else if (isWin) spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    else spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* user can open manually */
  }
}

async function waitForHealthThenOpen() {
  const local = `http://localhost:${PORT}`;
  for (let i = 0; i < 60; i++) {
    if (await fetchOk(`${local}/api/health`, 1500)) {
      ok(`Tutor is ready at ${local}`);
      const lan = lanUrl();
      if (lan) ok(`On this network, others can reach it at ${lan}`);
      openBrowser(local);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  warn(`Server didn't report healthy yet. Try opening ${local} manually.`);
}

async function main() {
  console.log("\n\x1b[1mAdaptive Tutor — launcher\x1b[0m\n");
  await ensureOllama();
  await ensureBuild();
  await ensureDb();

  log(`Starting the tutor on port ${PORT}…`);
  const server = spawn(npmCmd, ["run", "start"], {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT, HOST },
  });

  // Open the browser once the server is healthy (in parallel with the server running).
  waitForHealthThenOpen();

  const shutdown = () => {
    try {
      server.kill();
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  server.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(`\x1b[31m✗ ${err instanceof Error ? err.message : err}\x1b[0m`);
  process.exit(1);
});
