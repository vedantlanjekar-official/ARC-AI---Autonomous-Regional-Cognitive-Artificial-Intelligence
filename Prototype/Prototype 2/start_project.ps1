# ARC AI Project Startup Script
# This script starts all required services for the ARC AI project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ARC AI Project Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check MQTT Broker (Mosquitto)
Write-Host "Checking MQTT Broker (port 1883)..." -ForegroundColor Yellow
$mqttRunning = Test-NetConnection -ComputerName localhost -Port 1883 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $mqttRunning) {
    Write-Host "⚠️  MQTT Broker is not running on port 1883" -ForegroundColor Red
    Write-Host "   Please install and start Mosquitto MQTT broker:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://mosquitto.org/download/" -ForegroundColor Yellow
    Write-Host "   2. Or use: choco install mosquitto (if Chocolatey is installed)" -ForegroundColor Yellow
    Write-Host "   3. Start the service: net start mosquitto" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Alternatively, you can use a Python MQTT broker for testing." -ForegroundColor Yellow
    Write-Host "   Continuing anyway - services will fail to connect if MQTT is not available." -ForegroundColor Yellow
} else {
    Write-Host "✅ MQTT Broker is running" -ForegroundColor Green
}
Write-Host ""

# Check Ollama
Write-Host "Checking Ollama (port 11434)..." -ForegroundColor Yellow
$ollamaRunning = Test-NetConnection -ComputerName localhost -Port 11434 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "⚠️  Ollama is not running on port 11434" -ForegroundColor Red
    Write-Host "   Please install and start Ollama:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://ollama.ai/download" -ForegroundColor Yellow
    Write-Host "   2. Start Ollama service" -ForegroundColor Yellow
    Write-Host "   3. Pull a model: ollama pull mistral:7b" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Continuing anyway - LLM requests will fail if Ollama is not available." -ForegroundColor Yellow
} else {
    Write-Host "✅ Ollama is running" -ForegroundColor Green
}
Write-Host ""

# Get the project root directory
$projectRoot = "C:\Users\vedan\Desktop\Projects\ARC - AI\Prototype\Prototype 2"

# Start Main Hub
Write-Host "Starting Main Hub (port 8000)..." -ForegroundColor Yellow
$mainHubPath = Join-Path $projectRoot "arc-ai\arc-ai\main_hub"
Start-Process python -ArgumentList "main_hub.py" -WorkingDirectory $mainHubPath -WindowStyle Minimized
Start-Sleep -Seconds 3
Write-Host "✅ Main Hub started (check http://localhost:8000/health)" -ForegroundColor Green
Write-Host ""

# Start Mini Hub
Write-Host "Starting Mini Hub Web Server (port 8080)..." -ForegroundColor Yellow
$miniHubPath = Join-Path $projectRoot "arc-ai mini\arc-ai mini"
Start-Process python -ArgumentList "mini_hub_web.py" -WorkingDirectory $miniHubPath -WindowStyle Minimized
Start-Sleep -Seconds 3
Write-Host "✅ Mini Hub started (check http://localhost:8080)" -ForegroundColor Green
Write-Host ""

# Start Next.js App
Write-Host "Starting Next.js App (port 3000)..." -ForegroundColor Yellow
$nextAppPath = Join-Path $projectRoot "arc-ai app\arc-ai app"
Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory $nextAppPath -WindowStyle Minimized
Start-Sleep -Seconds 5
Write-Host "✅ Next.js App started (check http://localhost:3000)" -ForegroundColor Green
Write-Host ""

# Wait a bit for services to fully start
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open Chrome
Write-Host "Opening Chrome browser..." -ForegroundColor Yellow
Start-Process "chrome.exe" -ArgumentList "http://localhost:3000"
Write-Host "✅ Chrome opened with Next.js app" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  - Main Hub API: http://localhost:8000" -ForegroundColor White
Write-Host "  - Mini Hub Web: http://localhost:8080" -ForegroundColor White
Write-Host "  - Next.js App:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure MQTT broker and Ollama are running for full functionality." -ForegroundColor Yellow
Write-Host ""




