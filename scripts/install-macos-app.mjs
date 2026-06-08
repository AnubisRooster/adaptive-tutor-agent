#!/usr/bin/env node
// Builds a double-clickable "Adaptive Tutor.app" on macOS that launches the
// tutor and opens your browser. The app is created on your Desktop (and the
// project root). Drag it to /Applications or your Dock if you like.
//
//   node scripts/install-macos-app.mjs

import { mkdirSync, writeFileSync, chmodSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("This script only runs on macOS.");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NODE = process.execPath; // absolute path to the node that ran this
const APP_NAME = "Adaptive Tutor";

function buildAppBundle(destDir) {
  const appPath = path.join(destDir, `${APP_NAME}.app`);
  if (existsSync(appPath)) rmSync(appPath, { recursive: true, force: true });

  const macosDir = path.join(appPath, "Contents", "MacOS");
  const resDir = path.join(appPath, "Contents", "Resources");
  mkdirSync(macosDir, { recursive: true });
  mkdirSync(resDir, { recursive: true });

  // Launcher script: open Terminal so logs are visible, then run the launcher.
  // We embed absolute paths because GUI-launched apps get a minimal PATH.
  const runner = `#!/bin/bash
cd "${ROOT}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
exec "${NODE}" "${ROOT}/scripts/launch.mjs"
`;
  // Wrap in Terminal so the user sees progress (model load can take time).
  const exe = path.join(macosDir, APP_NAME);
  const wrapper = `#!/bin/bash
SCRIPT="${ROOT}/scripts/.macos-run.command"
cat > "$SCRIPT" <<'EOF'
${runner}EOF
chmod +x "$SCRIPT"
open -a Terminal "$SCRIPT"
`;
  writeFileSync(exe, wrapper);
  chmodSync(exe, 0o755);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key><string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key><string>com.local.adaptive-tutor</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>${APP_NAME}</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict>
</plist>
`;
  writeFileSync(path.join(appPath, "Contents", "Info.plist"), plist);

  // Icon resolution order:
  //   1. a prebuilt scripts/AppIcon.icns
  //   2. build one from assets/AppIcon.png using macOS sips + iconutil
  const icnsSrc = path.join(ROOT, "scripts", "AppIcon.icns");
  const pngSrc = path.join(ROOT, "assets", "AppIcon.png");
  if (existsSync(icnsSrc)) {
    copyFileSync(icnsSrc, path.join(resDir, "AppIcon.icns"));
  } else if (existsSync(pngSrc)) {
    const built = buildIcnsFromPng(pngSrc);
    if (built) copyFileSync(built, path.join(resDir, "AppIcon.icns"));
  }

  // Refresh Finder's icon cache for the bundle.
  spawnSync("touch", [appPath]);
  return appPath;
}

// Build an .icns from a square PNG using macOS' built-in tools.
function buildIcnsFromPng(pngPath) {
  try {
    const tmp = path.join(ROOT, "scripts", "AppIcon.iconset");
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const variants = [
      [16, "icon_16x16.png"],
      [32, "icon_16x16@2x.png"],
      [32, "icon_32x32.png"],
      [64, "icon_32x32@2x.png"],
      [128, "icon_128x128.png"],
      [256, "icon_128x128@2x.png"],
      [256, "icon_256x256.png"],
      [512, "icon_256x256@2x.png"],
      [512, "icon_512x512.png"],
      [1024, "icon_512x512@2x.png"],
    ];
    for (const [size, name] of variants) {
      const r = spawnSync("sips", ["-z", String(size), String(size), pngPath, "--out", path.join(tmp, name)], {
        stdio: "ignore",
      });
      if (r.status !== 0) return null;
    }
    const out = path.join(ROOT, "scripts", "AppIcon.icns");
    const r = spawnSync("iconutil", ["-c", "icns", tmp, "-o", out], { stdio: "ignore" });
    rmSync(tmp, { recursive: true, force: true });
    return r.status === 0 && existsSync(out) ? out : null;
  } catch {
    return null;
  }
}

const desktop = path.join(os.homedir(), "Desktop");
const targets = [ROOT];
if (existsSync(desktop)) targets.push(desktop);

let made;
for (const dir of targets) {
  made = buildAppBundle(dir);
  console.log(`✓ Created ${made}`);
}
console.log(`\nDouble-click "${APP_NAME}" on your Desktop to launch.`);
console.log("Tip: drag it into /Applications or keep it in your Dock.");
