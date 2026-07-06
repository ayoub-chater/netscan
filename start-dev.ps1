# Start dev environment for NetScan
# Run: .\start-dev.ps1
#
# Uses LAN mode so a physical phone running Expo Go (over the same Wi-Fi)
# can connect AND keep the Fast Refresh websocket alive for live edits.
# `--localhost` is USB/emulator-only and silently breaks live reload on a
# real device over Wi-Fi, so it is NOT used here.

# Optional: if the Android SDK is installed and a device is attached over USB,
# set up reverse tunnels so the phone can reach a LOCAL backend on :8000 and
# Metro/Fast Refresh on :8081 via localhost. Skipped automatically otherwise.
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) {
    Write-Host "ADB found - setting up reverse tunnels (8000 API, 8081 Metro)..." -ForegroundColor Cyan
    & $adbPath reverse tcp:8000 tcp:8000 2>$null
    & $adbPath reverse tcp:8081 tcp:8081 2>$null
    Write-Host "Reverse tunnels attempted (only apply to a USB-connected device)." -ForegroundColor Green
} else {
    Write-Host "ADB not found - skipping USB tunnels (not needed for Expo Go over Wi-Fi)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Make sure your phone and this computer are on the SAME Wi-Fi network." -ForegroundColor Cyan
Write-Host "Starting Expo in LAN mode... scan the QR with Expo Go." -ForegroundColor Cyan
npx expo start
