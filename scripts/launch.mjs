#!/usr/bin/env node
// Cross-platform one-click launcher for the Adaptive Tutor.
// Pre-flight checks (in order):
//   1. Node.js version meets the minimum required by package.json
//   2. node_modules installed (runs npm install if missing or package.json changed)
//   3. Native addon compatible with current Node.js (auto npm rebuild on mismatch)
//   4. Ollama reachable / started; required model pulled if absent
//   5. Port not already in use by another process
//   6. Production build exists (builds if not)
//   7. Database exists and schema is current (creates/seeds + migrates if needed)

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// --- tiny .env reader ---
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
      const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(k in env)) env[k] = v;
    }
  }
  return env;
}

const fileEnv = readEnv();
const PORT = process.env.PORT || fileEnv.PORT || "3000";
const HOST = process.env.HOST || fileEnv.HOST || "0.0.0.0";
const OLLAMA = process.env.OLLAMA_HOST || fileEnv.OLLAMA_HOST || "http://127.0.0.1:11434";
const TUTOR_MODEL = process.env.TUTOR_MODEL || fileEnv.TUTOR_MODEL || "gemma4:e4b-it-qat";

const log  = (m) => console.log(`\x1b[36m▶\x1b[0m ${m}`);
const ok   = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
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

// 1. Node.js version check
function checkNodeVersion() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const range = pkg.engines?.node;
  if (!range) return;
  const match = range.match(/(\d+)/);
  if (!match) return;
  const required = parseInt(match[1], 10);
  const actual = parseInt(process.versions.node.split(".")[0], 10);
  if (actual < required) {
    throw new Error(
      `Node.js ${process.versions.node} is too old. This app requires Node.js >= ${required}. ` +
      `Please update Node.js from https://nodejs.org and try again.`
    );
  }
  ok(`Node.js ${process.versions.node}`);
}

// 2. npm install — runs if node_modules is missing OR package.json is newer than the last install stamp
async function ensureDependencies() {
  const nmDir = path.join(ROOT, "node_modules");
  const pkgFile = path.join(ROOT, "package.json");
  // Use package-lock.json mtime as the install stamp (npm updates it on every install)
  const lockFile = path.join(ROOT, "package-lock.json");

  const nmMissing = !existsSync(nmDir);
  let outdated = nmMissing;
  if (!nmMissing && existsSync(lockFile)) {
    const pkgMtime  = statSync(pkgFile).mtimeMs;
    const lockMtime = statSync(lockFile).mtimeMs;
    // If package.json was modified after the lock file, dependencies may have changed.
    outdated = pkgMtime > lockMtime;
  }

  if (nmMissing) {
    log("node_modules not found — running npm install…");
    await run(npmCmd, ["install"]);
    ok("Dependencies installed.");
  } else if (outdated) {
    log("package.json changed since last install — running npm install…");
    await run(npmCmd, ["install"]);
    ok("Dependencies up to date.");
  } else {
    ok("Dependencies OK.");
  }
}

// 3. Native addon ABI check (better-sqlite3)
async function ensureNativeModules() {
  const addonPath = path.join(ROOT, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
  if (!existsSync(addonPath)) return; // will be built by npm install above
  try {
    const { createRequire } = await import("node:module");
    createRequire(import.meta.url)(addonPath);
  } catch (err) {
    if (err?.code === "ERR_DLOPEN_FAILED" || String(err).includes("NODE_MODULE_VERSION")) {
      warn("Native module mismatch (Node.js was updated). Rebuilding…");
      await run(npmCmd, ["rebuild"]);
      ok("Native modules rebuilt.");
      // Invalidate the old build so Next.js recompiles against the fresh addon.
      const buildId = path.join(ROOT, ".next", "BUILD_ID");
      if (existsSync(buildId)) {
        try { (await import("node:fs")).unlinkSync(buildId); } catch { /* already gone */ }
      }
    } else {
      throw err;
    }
  }
}

// 4a. Ensure Ollama is reachable
async function ensureOllama() {
  if (await fetchOk(`${OLLAMA}/api/tags`)) {
    ok("Ollama is running.");
    return true;
  }
  log("Ollama not reachable — trying to start it…");
  try {
    const child = spawn("ollama", ["serve"], { detached: true, stdio: "ignore", shell: isWin });
    child.unref();
  } catch { /* ollama not on PATH */ }
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await fetchOk(`${OLLAMA}/api/tags`)) {
      ok("Ollama started.");
      return true;
    }
  }
  warn("Could not reach Ollama. The app will open, but the tutor won't respond until Ollama is running.");
  return false;
}

// 4b. Ensure the required model is pulled
async function ensureModel(ollamaRunning) {
  if (!ollamaRunning) return; // already warned above
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const { models = [] } = await res.json();
    const modelName = TUTOR_MODEL.split(":")[0];
    const tag = TUTOR_MODEL.includes(":") ? TUTOR_MODEL : `${TUTOR_MODEL}:latest`;
    const present = models.some(
      (m) => m.name === tag || m.name === TUTOR_MODEL || m.name.startsWith(modelName + ":")
    );
    if (present) {
      ok(`Model ${TUTOR_MODEL} is available.`);
    } else {
      warn(`Model "${TUTOR_MODEL}" not found locally — pulling now (this may take a while)…`);
      await run("ollama", ["pull", TUTOR_MODEL]);
      ok(`Model ${TUTOR_MODEL} ready.`);
    }
  } catch {
    warn(`Could not verify model "${TUTOR_MODEL}". Proceeding anyway.`);
  }
}

// 5. Port availability
async function ensurePortFree() {
  const inUse = await fetchOk(`http://localhost:${PORT}/api/health`, 1000);
  if (inUse) {
    // Our own app is already running — just open the browser and exit.
    ok(`Adaptive Tutor is already running at http://localhost:${PORT}`);
    const lan = lanUrl();
    if (lan) ok(`On this network: ${lan}`);
    openBrowser(`http://localhost:${PORT}`);
    process.exit(0);
  }
  // Check if something else is on the port (non-health response).
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 1000);
    await fetch(`http://localhost:${PORT}`, { signal: ac.signal });
    clearTimeout(t);
    // Got a response but not from our health endpoint — another app owns the port.
    throw new Error(
      `Port ${PORT} is already in use by another application. ` +
      `Stop that app first, or set PORT=<other> in .env.`
    );
  } catch (err) {
    if (err.message.includes("Port ")) throw err; // re-throw our own error
    // fetch threw (connection refused / aborted) — port is free
  }
}

// 6. Production build
async function ensureBuild() {
  if (existsSync(path.join(ROOT, ".next", "BUILD_ID"))) return;
  log("No production build found — building now (~60s)…");
  await run(npmCmd, ["run", "build"]);
  ok("Build complete.");
}

// 7. Database: create+seed if missing, always migrate (idempotent, adds new columns safely)
async function ensureDb() {
  const dbPath = (process.env.DATABASE_PATH || fileEnv.DATABASE_PATH || "./data/tutor.db").replace(/^\.\//, "");
  if (!existsSync(path.join(ROOT, dbPath))) {
    log("No database found — creating and seeding it…");
    await run(npmCmd, ["run", "setup"]);
    ok("Database created and seeded.");
  } else {
    // Always run the migration so new columns from code updates are applied.
    await run(npmCmd, ["run", "db:migrate"]);
    ok("Database schema up to date.");
  }
}

function openBrowser(url) {
  try {
    if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    else if (isWin) spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    else spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  } catch { /* user can open manually */ }
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
  warn(`Server didn't report healthy. Try opening http://localhost:${PORT} manually.`);
}

async function main() {
  console.log("\n\x1b[1mAdaptive Tutor — launcher\x1b[0m\n");

  checkNodeVersion();                    // 1. Node.js version
  await ensureDependencies();            // 2. npm install if needed
  await ensureNativeModules();           // 3. rebuild native addon if Node.js changed
  const ollamaUp = await ensureOllama(); // 4a. Ollama running
  await ensureModel(ollamaUp);           // 4b. model pulled
  await ensurePortFree();                // 5. port available (or already running → open & exit)
  await ensureBuild();                   // 6. production build
  await ensureDb();                      // 7. DB exists + schema current

  log(`Starting the tutor on port ${PORT}…`);
  const server = spawn(npmCmd, ["run", "start"], {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT, HOST },
  });

  waitForHealthThenOpen();

  const shutdown = () => {
    try { server.kill(); } catch { /* noop */ }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  server.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : err}\x1b[0m\n`);
  process.exit(1);
});
