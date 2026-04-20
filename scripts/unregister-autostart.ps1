$ErrorActionPreference = 'Stop'

$taskName = 'VAI BI AutoStart'

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Output "Scheduled task '$taskName' removed."
} else {
  Write-Output "Scheduled task '$taskName' was not present."
}
