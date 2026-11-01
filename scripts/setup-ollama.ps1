param(
    [string]$Root = 'G:\AI',
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9._:-]*$')]
    [string]$Model = 'llama3.2:3b'
)

$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Run this script on the Windows game server.' }
if ($Model -match 'cloud') { throw 'Choose a local model, not a cloud model.' }
if (-not [System.IO.Path]::IsPathRooted($Root)) { throw 'Root must be an absolute directory.' }
if (Get-Process -Name 'ollama*' -ErrorAction SilentlyContinue) {
    throw 'Quit Ollama from the system tray and stop any ollama serve process, then rerun setup so the model directory takes effect.'
}

$installDirectory = Join-Path $Root 'Ollama'
$modelDirectory = Join-Path $Root 'models'
$downloadDirectory = Join-Path $Root 'downloads'
$logDirectory = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $installDirectory, $modelDirectory, $downloadDirectory, $logDirectory | Out-Null

# Set storage before starting the installer or server, and retain it for later sessions.
[Environment]::SetEnvironmentVariable('OLLAMA_MODELS', $modelDirectory, 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_NO_CLOUD', '1', 'User')
$env:OLLAMA_MODELS = $modelDirectory
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_HOST = '127.0.0.1:11434'
$ollamaExecutable = Join-Path $installDirectory 'ollama.exe'
if (-not (Test-Path -LiteralPath $ollamaExecutable)) {
    $installer = Join-Path $downloadDirectory 'OllamaSetup.exe'
    Write-Host "Downloading Ollama to $installer"
    Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile $installer
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid') { throw 'The Ollama installer signature could not be validated.' }
    $installation = Start-Process -FilePath $installer -ArgumentList ('/DIR="{0}"' -f $installDirectory) -Wait -PassThru
    if ($installation.ExitCode -ne 0) { throw "Ollama installer exited with code $($installation.ExitCode)." }
    if (-not (Test-Path -LiteralPath $ollamaExecutable)) { throw "Ollama executable not found at $ollamaExecutable." }
}

# Limit each local health request to two seconds so an unresponsive daemon cannot hang setup.
$healthRequestTimeoutSeconds = 2
# Allow thirty one-second startup polls for the newly launched local daemon.
$startupPollAttempts = 30
$startupPollSeconds = 1

# The installer may already have started Ollama with the environment above.
try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec $healthRequestTimeoutSeconds }
catch {
    $null = Start-Process -FilePath $ollamaExecutable -ArgumentList 'serve' -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory 'ollama.stdout.log') `
        -RedirectStandardError (Join-Path $logDirectory 'ollama.stderr.log')
}
$ready = $false
for ($attempt = 0; $attempt -lt $startupPollAttempts; $attempt++) {
    try {
        $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec $healthRequestTimeoutSeconds
        $ready = $true
        break
    } catch { Start-Sleep -Seconds $startupPollSeconds }
}
if (-not $ready) { throw "Ollama did not start. Check $logDirectory and the Ollama tray application." }

Write-Host "Downloading $Model into $modelDirectory"
& $ollamaExecutable pull $Model
if ($LASTEXITCODE -ne 0) { throw "Model download failed with exit code $LASTEXITCODE." }
Write-Host "Ollama is ready at http://127.0.0.1:11434. Set OLLAMA_MODEL=$Model in Emberfall's root .env if using a nondefault model."
Write-Host 'Run the NPC dialogue check, then restart Emberfall. Ollama must remain running.'
