# ARC AI Project - Complete Startup Script
# This script installs dependencies and starts all services

$ErrorActionPreference = "Continue"
$projectRoot = "C:\Users\vedan\Desktop\Projects\ARC - AI\Prototype\Prototype 2"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ARC AI Project - Complete Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $result = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $result
}

# Function to wait for service
function Wait-ForService {
    param([int]$Port, [int]$Timeout = 10)
    $elapsed = 0
    while ($elapsed -lt $Timeout) {
        if (Test-Port -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return $false
}

# Check and install MQTT Broker
Write-Host "Checking MQTT Broker (port 1883)..." -ForegroundColor Yellow
if (-not (Test-Port -Port 1883)) {
    Write-Host "⚠️  MQTT Broker not running" -ForegroundColor Red
    Write-Host "Attempting to start Python MQTT broker..." -ForegroundColor Yellow
    
    # Try to start Python MQTT broker
    $mqttBrokerPath = Join-Path $projectRoot "simple_mqtt_broker.py"
    if (Test-Path $mqttBrokerPath) {
        Start-Process python -ArgumentList $mqttBrokerPath -WindowStyle Minimized
        Start-Sleep -Seconds 3
        if (Wait-ForService -Port 1883 -Timeout 5) {
            Write-Host "✅ Python MQTT broker started" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to start Python MQTT broker" -ForegroundColor Red
            Write-Host "   Please install Mosquitto:" -ForegroundColor Yellow
            Write-Host "   1. Download from: https://mosquitto.org/download/" -ForegroundColor Yellow
            Write-Host "   2. Or use: choco install mosquitto" -ForegroundColor Yellow
            Write-Host "   3. Start: net start mosquitto" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✅ MQTT Broker is running" -ForegroundColor Green
}
Write-Host ""

# Check Ollama (optional but recommended)
Write-Host "Checking Ollama (port 11434)..." -ForegroundColor Yellow
if (-not (Test-Port -Port 11434)) {
    Write-Host "⚠️  Ollama not running (LLM requests will fail)" -ForegroundColor Yellow
    Write-Host "   Install from: https://ollama.ai/download" -ForegroundColor Yellow
} else {
    Write-Host "✅ Ollama is running" -ForegroundColor Green
}
Write-Host ""

# Start Main Hub
Write-Host "Starting Main Hub (port 8000)..." -ForegroundColor Yellow
if (Test-Port -Port 8000) {
    Write-Host "⚠️  Port 8000 already in use" -ForegroundColor Yellow
} else {
    $mainHubPath = Join-Path $projectRoot "arc-ai\arc-ai\main_hub"
    if (Test-Path (Join-Path $mainHubPath "main_hub.py")) {
        Start-Process python -ArgumentList "main_hub.py" -WorkingDirectory $mainHubPath -WindowStyle Normal
        Start-Sleep -Seconds 3
        if (Wait-ForService -Port 8000 -Timeout 10) {
            Write-Host "✅ Main Hub started" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Main Hub may still be starting..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Main Hub script not found" -ForegroundColor Red
    }
}
Write-Host ""

# Start Mini Hub
Write-Host "Starting Mini Hub (port 8080)..." -ForegroundColor Yellow
if (Test-Port -Port 8080) {
    Write-Host "⚠️  Port 8080 already in use" -ForegroundColor Yellow
} else {
    $miniHubPath = Join-Path $projectRoot "arc-ai mini\arc-ai mini"
    if (Test-Path (Join-Path $miniHubPath "mini_hub_web.py")) {
        Start-Process python -ArgumentList "mini_hub_web.py" -WorkingDirectory $miniHubPath -WindowStyle Normal
        Start-Sleep -Seconds 3
        if (Wait-ForService -Port 8080 -Timeout 10) {
            Write-Host "✅ Mini Hub started" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Mini Hub may still be starting..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Mini Hub script not found" -ForegroundColor Red
    }
}
Write-Host ""

# Start Next.js App
Write-Host "Starting Next.js App (port 3000)..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "✅ Next.js App already running" -ForegroundColor Green
} else {
    $nextAppPath = Join-Path $projectRoot "arc-ai app\arc-ai app"
    if (Test-Path (Join-Path $nextAppPath "package.json")) {
        Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory $nextAppPath -WindowStyle Normal
        Start-Sleep -Seconds 5
        if (Wait-ForService -Port 3000 -Timeout 15) {
            Write-Host "✅ Next.js App started" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Next.js App may still be starting..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Next.js app not found" -ForegroundColor Red
    }
}
Write-Host ""

# Wait for all services
Write-Host "Waiting for all services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Final status check
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$services = @(
    @{Name="MQTT Broker"; Port=1883},
    @{Name="Main Hub"; Port=8000},
    @{Name="Mini Hub"; Port=8080},
    @{Name="Next.js App"; Port=3000},
    @{Name="Ollama"; Port=11434}
)

foreach ($service in $services) {
    $status = if (Test-Port -Port $service.Port) { "✅ Running" } else { "❌ Not Running" }
    $color = if (Test-Port -Port $service.Port) { "Green" } else { "Red" }
    Write-Host "$($service.Name) (port $($service.Port)): $status" -ForegroundColor $color
}
Write-Host ""

# Open Chrome
Write-Host "Opening Chrome browser..." -ForegroundColor Yellow
try {
    Start-Process "chrome.exe" -ArgumentList "http://localhost:3000"
    Write-Host "✅ Chrome opened" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not open Chrome automatically" -ForegroundColor Yellow
    Write-Host "   Please open: http://localhost:3000" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Main Hub API:    http://localhost:8000" -ForegroundColor White
Write-Host "Mini Hub Web:    http://localhost:8080" -ForegroundColor White
Write-Host "Next.js App:     http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Note: Configure Mini Hub URL in Next.js app settings:" -ForegroundColor Yellow
Write-Host "      http://localhost:8080" -ForegroundColor White
Write-Host ""




