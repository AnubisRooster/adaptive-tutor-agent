#!/usr/bin/env node
// One-command installer for the Adaptive Tutor. Safe to re-run.
//
//   node scripts/setup.mjs
//
// Does, in order:
//   1. Check Node version
//   2. Create .env from .env.example (if missing)
//   3. Check Ollama is installed, then pull the configured models
//   4. npm install
//   5. Build the app
//   6. Create + seed the database
//   7. Create a double-clickable desktop launcher (macOS .app / Windows shortcut)

import { spawn, spawnSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const npmCmd = isWin ? "npm.cmd" : "npm";

const log = (m) => console.log(`\n\x1b[1m\x1b[36m▶ ${m}\x1b[0m`);
const ok = (m) => console.log(`\x1b[32m  ✓ ${m}\x1b[0m`);
const warn = (m) => console.log(`\x1b[33m  ! ${m}\x1b[0m`);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}

function which(bin) {
  try {
    const r = spawnSync(isWin ? "where" : "which", [bin], { encoding: "utf8", shell: isWin });
    return r.status === 0;
  } catch {
    return false;
  }
}

function readEnvValue(key, fallback) {
  for (const file of [".env.local", ".env", ".env.example"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      if (line.slice(0, eq).trim() === key) return line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return fallback;
}

async function main() {
  console.log("\n\x1b[1mAdaptive Tutor — setup\x1b[0m");

  // 1. Node version
  log("Checking Node.js");
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 20) {
    warn(`Node ${process.versions.node} detected. This app needs Node 20+. Please upgrade: https://nodejs.org`);
    process.exit(1);
  }
  ok(`Node ${process.versions.node}`);

  // 2. .env
  log("Configuring environment");
  if (!existsSync(path.join(ROOT, ".env"))) {
    copyFileSync(path.join(ROOT, ".env.example"), path.join(ROOT, ".env"));
    ok("Created .env from .env.example");
  } else {
    ok(".env already exists");
  }

  // 3. Ollama + models
  log("Checking Ollama");
  const tutorModel = readEnvValue("TUTOR_MODEL", "gemma4:e4b-it-qat");
  const embedModel = readEnvValue("EMBED_MODEL", "nomic-embed-text");
  if (which("ollama")) {
    ok("Ollama is installed");
    for (const model of [tutorModel, embedModel]) {
      log(`Pulling model: ${model} (this can take a while the first time)`);
      try {
        await run("ollama", ["pull", model]);
        ok(`Pulled ${model}`);
      } catch {
        warn(`Could not pull ${model}. Make sure Ollama is running, then: ollama pull ${model}`);
      }
    }
  } else {
    warn("Ollama is not installed.");
    if (isMac) console.log("    Install it with:  brew install ollama   (or download from https://ollama.com/download)");
    else if (isWin) console.log("    Download it from: https://ollama.com/download/windows");
    else console.log("    Install it with:  curl -fsSL https://ollama.com/install.sh | sh");
    console.log(`    Then run:  ollama pull ${tutorModel} && ollama pull ${embedModel}`);
  }

  // 4. npm install
  log("Installing dependencies");
  await run(npmCmd, [existsSync(path.join(ROOT, "package-lock.json")) ? "ci" : "install"]);
  ok("Dependencies installed");

  // 5. build
  log("Building the app");
  await run(npmCmd, ["run", "build"]);
  ok("Build complete");

  // 6. db
  log("Creating + seeding the database");
  await run(npmCmd, ["run", "setup"]);
  ok("Database ready");

  // 7. launcher icon
  log("Creating a desktop launcher");
  try {
    if (isMac) await run("node", ["scripts/install-macos-app.mjs"]);
    else if (isWin) await run("powershell", ["-ExecutionPolicy", "Bypass", "-File", "scripts/install-windows-shortcut.ps1"]);
    else warn("No desktop launcher for this OS — start with: npm run launch");
  } catch {
    warn("Couldn't create the desktop launcher automatically. You can still start with: npm run launch");
  }

  console.log("\n\x1b[1m\x1b[32m✓ Setup complete!\x1b[0m");
  console.log("  • Double-click the new desktop icon, or run:  \x1b[1mnpm run launch\x1b[0m");
  console.log("  • The tutor opens in your browser automatically.\n");
}

main().catch((err) => {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : err}\x1b[0m`);
  process.exit(1);
});
