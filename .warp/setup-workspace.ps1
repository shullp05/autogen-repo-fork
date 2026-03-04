<#
.SYNOPSIS
    Installs AutoGen Warp skills (globally) and workflows (locally) so they are
    available anywhere under C:\Users\shull\warp-projects and all subfolders.

.DESCRIPTION
    - Skills  -> $HOME\.warp\skills\       (global, available in every project)
    - Workflows -> $env:APPDATA\warp\Warp\data\workflows\  (local/personal workflows)
    - Repo copy in .warp/ is kept for team sharing via git.

.NOTES
    Run from the repo root:  powershell -ExecutionPolicy Bypass -File .warp\setup-workspace.ps1
#>

$ErrorActionPreference = "Stop"

$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# If invoked from a different location, fall back to script dir
if (-not (Test-Path "$RepoRoot\.warp\skills")) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
}

$SkillsSource    = Join-Path $RepoRoot ".warp\skills"
$WorkflowsSource = Join-Path $RepoRoot ".warp\workflows"

# --- Global skills destination (home directory) ---
$GlobalSkillsDest = Join-Path $HOME ".warp\skills"

# --- Local workflows destination (Warp data dir) ---
$WorkflowsDest = Join-Path $env:APPDATA "warp\Warp\data\workflows"

Write-Host "`n=== AutoGen Warp Workspace Setup ===" -ForegroundColor Cyan

# ---- Install Skills Globally ----
Write-Host "`n[1/2] Installing skills to $GlobalSkillsDest ..." -ForegroundColor Yellow

$skillDirs = Get-ChildItem -Path $SkillsSource -Directory | Where-Object { $_.Name -ne "dist" }
foreach ($skill in $skillDirs) {
    $dest = Join-Path $GlobalSkillsDest $skill.Name
    if (Test-Path $dest) {
        Remove-Item -Recurse -Force $dest
    }
    Copy-Item -Recurse -Force $skill.FullName $dest
    Write-Host "  + $($skill.Name)" -ForegroundColor Green
}

# ---- Install Workflows Locally ----
Write-Host "`n[2/2] Installing workflows to $WorkflowsDest ..." -ForegroundColor Yellow

if (-not (Test-Path $WorkflowsDest)) {
    New-Item -ItemType Directory -Path $WorkflowsDest -Force | Out-Null
}

$workflowFiles = Get-ChildItem -Path $WorkflowsSource -Filter "*.yaml"
foreach ($wf in $workflowFiles) {
    $dest = Join-Path $WorkflowsDest $wf.Name
    Copy-Item -Force $wf.FullName $dest
    Write-Host "  + $($wf.Name)" -ForegroundColor Green
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host @"

Skills installed globally (available in all projects):
  $GlobalSkillsDest
    - autogen-dev           (slash: /autogen-dev)
    - autogen-agent-builder (slash: /autogen-agent-builder)
    - autogen-contributing  (slash: /autogen-contributing)

Workflows installed locally (searchable via Ctrl+Shift+R):
  $WorkflowsDest
    - Setup AutoGen Dev Environment
    - Run All CI Checks
    - Run Tests
    - Format and Lint
    - Type Check
    - Build and Serve Docs

"@ -ForegroundColor White
