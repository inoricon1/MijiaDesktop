# 米家桌面版

Windows 桌面上的米家看板：直观显示各房间的温湿度 / CO₂ / PM2.5 及其变化趋势，并能控制支持的设备。

- 后端：[mijiaAPI](https://github.com/Do1e/mijia-api)（扫码登录、读写 MIoT 属性）+ miot-spec.org 设备规格
- 界面：pywebview（Edge WebView2）+ 原生 HTML/JS，无前端构建步骤

## 目录

| 路径 | 说明 |
|---|---|
| `app/main.py` | 入口，pywebview 窗口和暴露给前端的 API |
| `app/core.py` | 登录、设备列表、属性读写、云端历史 + 本地历史合并 |
| `app/spec.py` | 设备规格解析、中文翻译、「简洁模式」过滤规则 |
| `app/web/` | 界面（index.html / app.js / style.css） |
| `app/install.ps1` | 安装到 `%LOCALAPPDATA%\Programs\MijiaDesktop` 并在桌面建快捷方式 |
| `tools/realserver.py` | 调试用：在浏览器里用真实数据预览界面，控制命令一律不执行 |

## 常用操作

```powershell
# 安装 / 更新（会覆盖已安装的程序，不影响登录和数据）
powershell -ExecutionPolicy Bypass -File app\install.ps1

# 在浏览器里调界面（只读）：之后打开 http://127.0.0.1:8766/dev
& "$env:LOCALAPPDATA\Programs\MijiaDesktop\.venv\Scripts\python.exe" tools\realserver.py app
```

用户数据在 `%LOCALAPPDATA%\Programs\MijiaDesktop\data`：`auth.json`（登录凭证，约 30 天自动续期）、`settings.json`（含青萍 App Key/Secret）、`specs/`（规格缓存）、`history.db`（本地历史，米家读数保留 14 天，青萍历史长期保留）、`app.log`（运行日志）。

> 不放 `%APPDATA%` 的原因：从打包应用（比如 Claude 桌面版）里启动的进程，写 AppData 会被 Windows 重定向到该应用的私有目录，双击快捷方式打开时就会读到另一份数据。
