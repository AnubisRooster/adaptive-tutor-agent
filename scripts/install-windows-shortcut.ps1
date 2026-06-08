# Creates a double-clickable "Adaptive Tutor" shortcut on the Desktop (and in
# the project root) that launches the tutor and opens your browser.
#
#   powershell -ExecutionPolicy Bypass -File scripts\install-windows-shortcut.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appName = "Adaptive Tutor"

# Resolve node.exe (prefer the one on PATH).
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "node.exe" }

# A small .cmd wrapper keeps the window open so you can see progress/logs.
$cmdPath = Join-Path $root "scripts\launch.cmd"
$cmdBody = @"
@echo off
title Adaptive Tutor
cd /d "$root"
"$node" "$root\scripts\launch.mjs"
echo.
echo (The tutor server is running in this window. Close it to stop.)
pause >nul
"@
Set-Content -Path $cmdPath -Value $cmdBody -Encoding ASCII

$icon = Join-Path $root "scripts\AppIcon.ico"

function New-TutorShortcut($dir) {
  $lnk = Join-Path $dir "$appName.lnk"
  if (Test-Path $lnk) { Remove-Item $lnk -Force }
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($lnk)
  $sc.TargetPath = $cmdPath
  $sc.WorkingDirectory = $root
  $sc.Description = "Launch the Adaptive Tutor"
  if (Test-Path $icon) { $sc.IconLocation = $icon } else { $sc.IconLocation = "$node,0" }
  $sc.Save()
  Write-Host "OK Created $lnk"
}

$desktop = [Environment]::GetFolderPath("Desktop")
New-TutorShortcut $root
if (Test-Path $desktop) { New-TutorShortcut $desktop }

Write-Host ""
Write-Host "Double-click `"$appName`" on your Desktop to launch."
