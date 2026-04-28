# Start dev environment for NetScan
# Run: .\start-dev.ps1

Write-Host "Setting up ADB reverse tunnel for port 8000..." -ForegroundColor Cyan
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) {
    & $adbPath reverse tcp:8000 tcp:8000
    Write-Host "ADB reverse tunnel active: phone:8000 -> laptop:8000" -ForegroundColor Green
} else {
    Write-Host "ADB not found - skipping USB tunnel setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Expo (--localhost mode)..." -ForegroundColor Cyan
npx expo start --localhost
