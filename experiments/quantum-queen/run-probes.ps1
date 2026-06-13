param(
    [datetime]$FromDate = [datetime]'2026-01-01',
    [datetime]$ToDate = [datetime]'2026-04-01'
)

$ErrorActionPreference = 'Stop'

$terminal = 'C:\Program Files\MetaTrader 5\terminal64.exe'
$instance = Join-Path $env:APPDATA 'MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075'
$testerProfiles = Join-Path $instance 'MQL5\Profiles\Tester'
$basePreset = Join-Path $testerProfiles 'Quantum Queen MT5.set'
$testerLog = Join-Path $instance ('Tester\logs\{0}.log' -f (Get-Date -Format 'yyyyMMdd'))
$outputDir = $PSScriptRoot

if (Get-Process terminal64, metatester64 -ErrorAction SilentlyContinue) {
    throw 'Close MetaTrader 5 and MetaTester before running probes.'
}

if (-not (Test-Path -LiteralPath $basePreset)) {
    throw "Quantum Queen preset not found: $basePreset"
}

$baseLines = Get-Content -LiteralPath $basePreset

foreach ($set in 0..3) {
    $presetName = "QQ Probe Set $set.set"
    $presetPath = Join-Path $testerProfiles $presetName
    $configPath = Join-Path $outputDir "qq-set$set.generated.ini"
    $capturePath = Join-Path $outputDir "qq-set$set.tester.log"

    $probeLines = $baseLines | ForEach-Object {
        if ($_ -match '^InpLotsCalc=') {
            'InpLotsCalc=1||0||0||2||N'
        } elseif ($_ -match '^InpLotsFixed=') {
            'InpLotsFixed=0.01||0.01||0.001000||0.100000||N'
        } elseif ($_ -match '^InpSets=') {
            "InpSets=$set||0||0||3||N"
        } elseif ($_ -match '^InpPanel=') {
            'InpPanel=0||0||0||1||N'
        } else {
            $_
        }
    }
    Set-Content -LiteralPath $presetPath -Value $probeLines -Encoding ASCII

    $config = @"
[Experts]
AllowLiveTrading=0
AllowDllImport=0
Enabled=0

[Tester]
Expert=Market\Quantum Queen MT5.ex5
ExpertParameters=$presetName
Symbol=XAUUSD+
Period=M5
Model=4
ExecutionMode=10
Optimization=0
FromDate=$($FromDate.ToString('yyyy.MM.dd'))
ToDate=$($ToDate.ToString('yyyy.MM.dd'))
Deposit=500
Currency=USD
Leverage=1:500
UseLocal=1
UseRemote=0
UseCloud=0
Visual=0
ShutdownTerminal=1
"@
    Set-Content -LiteralPath $configPath -Value $config -Encoding ASCII

    $before = if (Test-Path -LiteralPath $testerLog) {
        (Get-Content -LiteralPath $testerLog).Count
    } else {
        0
    }

    Write-Host "Running Quantum Queen set $set..."
    $process = Start-Process -FilePath $terminal `
        -ArgumentList "/config:`"$configPath`"" `
        -WindowStyle Hidden `
        -PassThru

    if (-not $process.WaitForExit(180000)) {
        Stop-Process -Id $process.Id -Force
        throw "Set $set exceeded 180 seconds."
    }

    $newLines = Get-Content -LiteralPath $testerLog | Select-Object -Skip $before
    Set-Content -LiteralPath $capturePath -Value $newLines -Encoding UTF8

    $summary = $newLines | Where-Object {
        $_ -match 'final balance|Test passed|testing of Experts\\Market\\Quantum Queen'
    }
    $summary | ForEach-Object { Write-Host $_ }
}
