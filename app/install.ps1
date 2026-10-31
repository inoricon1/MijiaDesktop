# 安装米家桌面版：复制程序到 %LOCALAPPDATA%\Programs\MijiaDesktop，建虚拟环境，在桌面放快捷方式
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$dst = Join-Path $env:LOCALAPPDATA 'Programs\MijiaDesktop'
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item -Recurse -Force (Join-Path $src 'web'), (Join-Path $src '*.py'), (Join-Path $src 'requirements.txt'), (Join-Path $src 'install.ps1') $dst
Remove-Item -Force (Join-Path $dst 'make_icon.py') -ErrorAction SilentlyContinue

if (-not (Test-Path (Join-Path $dst '.venv'))) { python -m venv (Join-Path $dst '.venv') }
$py = Join-Path $dst '.venv\Scripts\python.exe'
& $py -m pip install -q -r (Join-Path $dst 'requirements.txt') -i https://pypi.tuna.tsinghua.edu.cn/simple
& $py (Join-Path $src 'make_icon.py')
Copy-Item -Force (Join-Path $src 'icon.ico') $dst

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) '米家桌面版.lnk'))
$lnk.TargetPath = Join-Path $dst '.venv\Scripts\pythonw.exe'
$lnk.Arguments = '"' + (Join-Path $dst 'main.py') + '"'
$lnk.WorkingDirectory = $dst
$lnk.IconLocation = Join-Path $dst 'icon.ico'
$lnk.Description = '米家桌面版 - 查看传感器、控制米家设备'
$lnk.Save()
Write-Output "installed to $dst"
