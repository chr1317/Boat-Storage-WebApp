$ErrorActionPreference = "Stop"

function Get-LanIp {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -First 1 -ExpandProperty IPAddress)
  if (-not $ip) { $ip = "127.0.0.1" }
  return $ip
}

$ip = Get-LanIp

Write-Host ""
Write-Host "=== BoatHall Docker Demo ==="
Write-Host "LAN IP   : $ip"
Write-Host "Frontend : http://$ip`:5173"
Write-Host "Backend  : http://$ip`:3000/api/health"
Write-Host "============================"
Write-Host ""

$env:VITE_API_URL = "http://$ip`:3000/api"
$env:VITE_PUBLIC_BASE_URL = "http://$ip`:5173"

docker compose -f docker-compose.demo.yml up --force-recreate --remove-orphans
