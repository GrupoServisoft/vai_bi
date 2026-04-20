$ErrorActionPreference = 'Stop'

$repoRoot = 'D:\Matias_DATA\Desktop\CODEX Proyectos\vai-bi'
$apiDir = Join-Path $repoRoot 'apps\api'
$logsDir = Join-Path $repoRoot 'logs'
$nodePath = 'C:\Program Files\nodejs\node.exe'
$npmPath = 'C:\Program Files\nodejs\npm.cmd'

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Test-PortListening {
  param([int]$Port)

  try {
    $null = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Test-ApiEndpoint {
  param([string]$Path)

  try {
    $response = Invoke-RestMethod -Uri ("http://127.0.0.1:4100{0}" -f $Path) -Method Get -TimeoutSec 10
    return $null -ne $response
  } catch {
    return $false
  }
}

function Test-WebEndpoint {
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4185/' -UseBasicParsing -TimeoutSec 10
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Stop-ListeningProcess {
  param([int]$Port)

  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
  } catch {
    return
  }
}

function Start-ApiIfNeeded {
  if (Test-PortListening 4100) {
    if (Test-ApiEndpoint '/api/health') {
      Write-Output 'API already listening on 4100.'
      return
    }

    Write-Output 'API listening on 4100 but health endpoint is not responding. Restarting API...'
    Stop-ListeningProcess 4100
  }

  $apiOut = Join-Path $logsDir 'api-out.log'
  $apiErr = Join-Path $logsDir 'api-err.log'

  Start-Process -FilePath $nodePath `
    -ArgumentList 'src/index.js' `
    -WorkingDirectory $apiDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $apiOut `
    -RedirectStandardError $apiErr | Out-Null

  for ($attempt = 0; $attempt -lt 8; $attempt += 1) {
    Start-Sleep -Seconds 1
    if ((Test-PortListening 4100) -and (Test-ApiEndpoint '/api/health')) {
      Write-Output 'API started on 4100.'
      return
    }
  }

  throw 'La API no quedo respondiendo en el puerto 4100.'
}

function Start-WebIfNeeded {
  if (Test-PortListening 4185) {
    if (Test-WebEndpoint) {
      Write-Output 'Web already listening on 4185.'
      return
    }

    Write-Output 'Web listening on 4185 but homepage is not responding. Restarting web...'
    Stop-ListeningProcess 4185
  }

  Write-Output 'Building web app...'
  & $npmPath 'run' 'build' '--workspace' '@vai-bi/web'
  if ($LASTEXITCODE -ne 0) {
    throw 'El build del frontend fallo.'
  }

  $webOut = Join-Path $logsDir 'web-out.log'
  $webErr = Join-Path $logsDir 'web-err.log'

  Start-Process -FilePath $nodePath `
    -ArgumentList 'scripts/serve-web.mjs' `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $webOut `
    -RedirectStandardError $webErr | Out-Null

  for ($attempt = 0; $attempt -lt 10; $attempt += 1) {
    Start-Sleep -Seconds 1
    if ((Test-PortListening 4185) -and (Test-WebEndpoint)) {
      Write-Output 'Web started on 4185.'
      return
    }
  }

  throw 'La web no quedo respondiendo en el puerto 4185.'
}

Start-ApiIfNeeded
Start-WebIfNeeded

Write-Output 'VAI BI is up.'
