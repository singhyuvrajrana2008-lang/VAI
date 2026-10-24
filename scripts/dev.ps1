# RidgeWatch local development starter (Windows PowerShell).
# Starts FastAPI and Vite in separate windows, after dependency checks.
# It never writes or overwrites an env file.
param(
  [string]$Mode = $(if ($env:RIDGEWATCH_MODE) { $env:RIDGEWATCH_MODE } else { "demo" }),
  [int]$ApiPort = 8000,
  [int]$WebPort = 3000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

$venv = Join-Path $Backend ".venv"
if (-not (Test-Path $venv)) {
  Write-Host "Creating backend virtual environment..."
  python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
& $python -m pip install -q -r (Join-Path $Backend "requirements.txt")

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $Frontend
  npm install --no-audit --no-fund
  Pop-Location
}

python (Join-Path $Root "scripts\check_env.py")

$apiCommand = @"
`$env:RIDGEWATCH_MODE='$Mode'
`$env:RIDGEWATCH_ENVIRONMENT='local'
Set-Location '$Backend'
& '$python' -m uvicorn app.main:app --host 127.0.0.1 --port $ApiPort
"@

$webCommand = @"
Set-Location '$Frontend'
npm run dev -- --port $WebPort
"@

Write-Host "Starting API on http://127.0.0.1:$ApiPort (mode=$Mode)"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCommand | Out-Null

$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/api/v1/health" -TimeoutSec 2 | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Milliseconds 500
  }
}
if (-not $ready) {
  Write-Warning "API did not answer within 20 seconds. Check the API window for the error."
}

Write-Host "Starting web app on http://localhost:$WebPort"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $webCommand | Out-Null

Write-Host ""
Write-Host "RidgeWatch: web http://localhost:$WebPort | API http://127.0.0.1:$ApiPort/docs"
Write-Host "Demo mode serves labelled synthetic fixtures. No live provider is configured."
