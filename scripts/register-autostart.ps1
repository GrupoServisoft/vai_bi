$ErrorActionPreference = 'Stop'

$taskName = 'VAI BI AutoStart'
$repoRoot = 'D:\Matias_DATA\Desktop\CODEX Proyectos\vai-bi'
$launcherPath = Join-Path $repoRoot 'start-vai-bi.ps1'
$powershellPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path $launcherPath)) {
  throw "No se encontro el launcher en $launcherPath"
}

$action = New-ScheduledTaskAction `
  -Execute $powershellPath `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcherPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Levanta la API y la web de VAI BI al iniciar sesion.' `
  -Force | Out-Null

Write-Output "Scheduled task '$taskName' registered for $currentUser."
